// =============================================================
//  Serveur du site "Steam Reco"
//  Rôle : aller chercher les données sur les API Steam / SteamSpy
//  (le navigateur ne peut pas les appeler directement à cause du CORS),
//  les garder en cache, puis les renvoyer au site.
// =============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_FILE = path.join(__dirname, "data", "cache.json");

// Durées de validité du cache
const UNE_HEURE = 60 * 60 * 1000;
const UN_JOUR = 24 * UNE_HEURE;
const UNE_SEMAINE = 7 * UN_JOUR;

// ---------- Cache (mémoire + fichier data/cache.json) ----------
let cache = { listes: {}, details: {}, steamspy: {} };
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  cache.listes = cache.listes || {};
  cache.details = cache.details || {};
  cache.steamspy = cache.steamspy || {};
} catch (e) {
  // pas encore de cache, ce n'est pas grave
}

let sauvegardePrevue = false;
function sauvegarderCache() {
  // on regroupe les écritures pour ne pas écrire le fichier 100 fois par seconde
  if (sauvegardePrevue) return;
  sauvegardePrevue = true;
  setTimeout(() => {
    sauvegardePrevue = false;
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }, 2000);
}

async function telechargerJSON(url) {
  const rep = await fetch(url, { headers: { "User-Agent": "SteamReco-projet-etudiant" } });
  if (!rep.ok) throw new Error(`HTTP ${rep.status} pour ${url}`);
  return rep.json();
}

// Renvoie la liste en cache si elle est encore valable, sinon la retélécharge
async function listeAvecCache(nom, duree, chargeur) {
  const c = cache.listes[nom];
  if (c && Date.now() - c.date < duree) return c.donnees;
  try {
    const donnees = await chargeur();
    cache.listes[nom] = { date: Date.now(), donnees };
    sauvegarderCache();
    return donnees;
  } catch (err) {
    console.error(`Erreur en chargeant "${nom}" :`, err.message);
    if (c) return c.donnees; // on garde l'ancienne version plutôt que rien
    throw err;
  }
}

// ---------- Les sources de données ----------

// SteamSpy : les 100 jeux les plus joués des 2 dernières semaines
function chargerTop100() {
  return listeAvecCache("top100in2weeks", UN_JOUR, () =>
    telechargerJSON("https://steamspy.com/api.php?request=top100in2weeks")
  );
}

// SteamSpy : les 1000 jeux qui ont le plus de propriétaires (page 0)
function chargerTousPage0() {
  return listeAvecCache("all_page0", UN_JOUR, () =>
    telechargerJSON("https://steamspy.com/api.php?request=all&page=0")
  );
}

// Steam : classement officiel des jeux les plus joués (mis à jour chaque jour)
function chargerTopDuJour() {
  return listeAvecCache("most_played", UNE_HEURE, async () => {
    const r = await telechargerJSON(
      "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
    );
    return r.response.ranks;
  });
}

// Steam Store : les meilleures ventes et les nouveautés du moment.
// C'est là qu'on trouve les petits jeux qui explosent (ils ne sont pas
// encore dans les listes SteamSpy, qui sont plus lentes à se mettre à jour).
function chargerVitrine() {
  return listeAvecCache("vitrine", UNE_HEURE, async () => {
    const r = await telechargerJSON("https://store.steampowered.com/api/featuredcategories?cc=fr&l=english");
    const ids = (bloc) => ((bloc && bloc.items) || []).map((i) => i.id).filter(Boolean);
    return { meilleuresVentes: ids(r.top_sellers), nouveautes: ids(r.new_releases) };
  });
}

// SteamSpy : les infos d'UN jeu (avis, temps de jeu, propriétaires...).
// Utile pour les jeux récents qui ne sont pas dans les grandes listes.
async function chargerSteamSpyJeu(appid) {
  const c = cache.steamspy[appid];
  if (c && Date.now() - c.date < UN_JOUR) return c;
  const j = await telechargerJSON(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
  // on ne garde que ce qui nous sert (le cache reste petit)
  const garde = { date: Date.now(), ok: !!j.name };
  for (const cle of ["appid", "name", "developer", "publisher", "positive", "negative", "owners",
    "average_forever", "average_2weeks", "median_forever", "price", "ccu"]) garde[cle] = j[cle];
  cache.steamspy[appid] = garde;
  sauvegarderCache();
  return garde;
}

// Steam Store : date de sortie + genres (contient "Indépendant"/"Indie")
async function chargerDetailsStore(appid) {
  const c = cache.details[appid];
  if (c && Date.now() - c.date < UNE_SEMAINE) return c;
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english&cc=fr`;
  const r = await telechargerJSON(url);
  const bloc = r[appid];
  let detail = { date: Date.now(), ok: false };
  if (bloc && bloc.success) {
    const d = bloc.data;
    detail = {
      date: Date.now(),
      ok: true,
      type: d.type,
      sortie: d.release_date ? d.release_date.date : null,
      genres: (d.genres || []).map((g) => g.description),
      gratuit: !!d.is_free,
      prixEuros: d.price_overview ? d.price_overview.final / 100 : null,
      description: d.short_description || "",
    };
  }
  cache.details[appid] = detail;
  sauvegarderCache();
  return detail;
}

// ---------- Fusion des données ----------
// Transforme un jeu au format SteamSpy en jeu "à nous" (noms en français)
function versJeu(j, top100) {
  return {
        appid: Number(j.appid),
        nom: j.name,
        developpeur: j.developer,
        editeur: j.publisher,
        avisPositifs: j.positive,
        avisNegatifs: j.negative,
        proprietaires: j.owners, // texte du genre "1,000,000 .. 2,000,000"
        tempsMoyenMin: j.average_forever, // minutes
        tempsMoyen2SemMin: j.average_2weeks,
        tempsMedianMin: j.median_forever,
        prixCentimes: Number(j.price) || 0, // SteamSpy donne le prix en centimes (USD)
        joueursPicHier: j.ccu, // pic de joueurs connectés en même temps hier
        tendance: !!top100[j.appid], // fait partie du top 100 des 2 dernières semaines
  };
}

function fusionnerJeux(top100, tous) {
  const jeux = {};
  for (const source of [tous, top100]) {
    for (const id in source) jeux[id] = versJeu(source[id], top100);
  }
  return jeux;
}

// Ajoute les infos du Store (date, genres, prix en euros) quand on les a déjà
function ajouterDetails(jeu) {
  const d = cache.details[jeu.appid];
  if (d && d.ok) {
    jeu.sortie = d.sortie;
    jeu.genres = d.genres;
    jeu.typeStore = d.type; // "game", "dlc", "hardware"... (Wallpaper Engine est aussi "game" !)
    if (d.prixEuros !== null) jeu.prixEuros = d.prixEuros;
    if (d.gratuit) jeu.prixEuros = 0;
  }
  return jeu;
}

// ---------- Enrichissement en arrière-plan ----------
// Les API n'acceptent pas trop de requêtes d'un coup, donc on fait une
// "file d'attente" : on demande un jeu à la fois, avec une pause entre deux.
//  - Store : environ 200 requêtes toutes les 5 minutes -> 1 toutes les 1,6 s
//  - SteamSpy (fiche d'un jeu) : 1 requête par seconde maximum -> 1 toutes les 1,2 s
function creerFile(nom, charger, estAJour, pauseMs) {
  const file = [];
  let enCours = false;

  async function traiter() {
    if (enCours) return;
    enCours = true;
    while (file.length > 0) {
      const id = file.shift();
      try {
        await charger(id);
      } catch (err) {
        console.error(`${nom} : jeu ${id} impossible :`, err.message);
        if (String(err.message).includes("429")) {
          // trop de requêtes : on attend 1 minute avant de reprendre
          file.unshift(id);
          await new Promise((r) => setTimeout(r, 60 * 1000));
        }
      }
      await new Promise((r) => setTimeout(r, pauseMs));
    }
    enCours = false;
  }

  return {
    ajouter(ids) {
      for (const id of ids) {
        if (!estAJour(id) && !file.includes(id)) file.push(id);
      }
      traiter();
    },
    get taille() { return file.length; },
  };
}

const fileStore = creerFile("Store", chargerDetailsStore,
  (id) => cache.details[id] && Date.now() - cache.details[id].date < UNE_SEMAINE, 1600);
const fileSteamSpy = creerFile("SteamSpy", chargerSteamSpyJeu,
  (id) => cache.steamspy[id] && Date.now() - cache.steamspy[id].date < UN_JOUR, 1200);

// ---------- Les routes de notre API à nous ----------

// Le bandeau "top du jour"
app.get("/api/top-du-jour", async (req, res) => {
  try {
    let classement;
    try {
      classement = await chargerTopDuJour();
    } catch (e) {
      classement = null;
    }
    const top100 = await chargerTop100().catch(() => ({}));

    let liste;
    if (classement && classement.length) {
      liste = classement.slice(0, 30).map((r) => ({
        rang: r.rank,
        appid: r.appid,
        nom: top100[r.appid] ? top100[r.appid].name : (cache.details[r.appid] || {}).nom || null,
        joueurs: r.peak_in_game,
        rangSemaineDerniere: r.last_week_rank,
        // pour savoir si c'est un jeu ou un logiciel (règle 8, côté page)
        genres: (cache.details[r.appid] || {}).genres || null,
        typeStore: (cache.details[r.appid] || {}).type || null,
      }));
      // les noms manquants : on demande au Store
      for (const j of liste) {
        if (!j.nom) {
          try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${j.appid}&filters=basic`;
            const r = await telechargerJSON(url);
            j.nom = r[j.appid] && r[j.appid].success ? r[j.appid].data.name : `Jeu ${j.appid}`;
            cache.details[j.appid] = { ...(cache.details[j.appid] || {}), nom: j.nom };
          } catch (e) {
            j.nom = `Jeu ${j.appid}`;
          }
        }
      }
      sauvegarderCache();
    } else {
      // plan B si l'API Steam ne répond pas : on trie le top 100 SteamSpy par joueurs
      liste = Object.values(top100)
        .sort((a, b) => b.ccu - a.ccu)
        .slice(0, 30)
        .map((j, i) => ({ rang: i + 1, appid: j.appid, nom: j.name, joueurs: j.ccu }));
    }
    res.json(liste);
  } catch (err) {
    res.status(502).json({ erreur: "Impossible de charger le top du jour : " + err.message });
  }
});

// La liste complète des jeux pour l'interface de tri
app.get("/api/jeux", async (req, res) => {
  try {
    const [top100, tous, classement, vitrine] = await Promise.all([
      chargerTop100(),
      chargerTousPage0().catch(() => ({})),
      chargerTopDuJour().catch(() => []),
      chargerVitrine().catch(() => ({ meilleuresVentes: [], nouveautes: [] })),
    ]);
    const parId = fusionnerJeux(top100, tous);

    // Les jeux "qui montent" : classement du jour + meilleures ventes + nouveautés.
    // S'ils ne sont pas dans les listes SteamSpy, on va chercher leur fiche une par une.
    const rangs = {};
    for (const r of classement) rangs[r.appid] = r;
    const candidats = [...new Set([
      ...classement.map((r) => r.appid),
      ...vitrine.meilleuresVentes,
      ...vitrine.nouveautes,
    ])];
    const aChercher = [];
    for (const id of candidats) {
      if (parId[id]) continue;
      const fiche = cache.steamspy[id];
      if (fiche && fiche.ok) parId[id] = versJeu(fiche, top100);
      else aChercher.push(id); // la file ignore les jeux déjà demandés aujourd'hui
    }
    fileSteamSpy.ajouter(aChercher);

    // On note la position de chaque jeu dans les classements du jour
    for (const id in parId) {
      const r = rangs[id];
      if (r) {
        parId[id].rangDuJour = r.rank;
        parId[id].rangSemaineDerniere = r.last_week_rank || 0; // 0 = nouveau dans le top 100
        parId[id].picAujourdhui = r.peak_in_game;
      }
      if (vitrine.meilleuresVentes.includes(Number(id))) parId[id].meilleureVente = true;
    }

    const jeux = Object.values(parId).map(ajouterDetails);

    // on demande les détails du Store d'abord pour les jeux du jour et en tendance
    jeux.sort((a, b) => (!!b.rangDuJour - !!a.rangDuJour) || (b.tendance - a.tendance) || (b.joueursPicHier - a.joueursPicHier));
    fileStore.ajouter(jeux.map((j) => j.appid));

    const enAttente = fileSteamSpy.taille;
    const total = jeux.length + enAttente;
    const enrichis = jeux.filter((j) => j.genres).length;
    res.json({ jeux, enrichissement: { total, enrichis, enAttente } });
  } catch (err) {
    res.status(502).json({ erreur: "Impossible de charger les jeux : " + err.message });
  }
});

// Détail d'un jeu : joueurs connectés en ce moment + infos Store
app.get("/api/jeu/:appid", async (req, res) => {
  const appid = Number(req.params.appid);
  if (!Number.isInteger(appid)) return res.status(400).json({ erreur: "appid invalide" });
  try {
    const [joueurs, store] = await Promise.all([
      telechargerJSON(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`
      )
        .then((r) => r.response.player_count)
        .catch(() => null),
      chargerDetailsStore(appid).catch(() => null),
    ]);
    res.json({ appid, joueursMaintenant: joueurs, store });
  } catch (err) {
    res.status(502).json({ erreur: err.message });
  }
});

// Les fichiers du site (HTML, CSS, JS) + la librairie Chart.js installée avec npm
app.use(express.static(path.join(__dirname, "public")));
app.use("/lib", express.static(path.join(__dirname, "node_modules", "chart.js", "dist")));

app.listen(PORT, () => {
  console.log(`Site lancé : http://localhost:${PORT}`);
});
