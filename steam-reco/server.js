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
let cache = { listes: {}, details: {} };
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  cache.listes = cache.listes || {};
  cache.details = cache.details || {};
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
function fusionnerJeux(top100, tous) {
  const jeux = {};
  for (const source of [tous, top100]) {
    for (const id in source) {
      const j = source[id];
      jeux[id] = {
        appid: j.appid,
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
        tendance: !!top100[id], // fait partie du top 100 des 2 dernières semaines
      };
    }
  }
  return jeux;
}

// Ajoute les infos du Store (date, genres, prix en euros) quand on les a déjà
function ajouterDetails(jeu) {
  const d = cache.details[jeu.appid];
  if (d && d.ok) {
    jeu.sortie = d.sortie;
    jeu.genres = d.genres;
    if (d.prixEuros !== null) jeu.prixEuros = d.prixEuros;
    if (d.gratuit) jeu.prixEuros = 0;
  }
  return jeu;
}

// ---------- Enrichissement en arrière-plan ----------
// Le Store n'accepte pas trop de requêtes (environ 200 toutes les 5 minutes),
// donc on demande les détails un jeu à la fois, toutes les 1,6 secondes.
const fileAttente = [];
let enCours = false;

function ajouterAFile(ids) {
  for (const id of ids) {
    const c = cache.details[id];
    const aJour = c && Date.now() - c.date < UNE_SEMAINE;
    if (!aJour && !fileAttente.includes(id)) fileAttente.push(id);
  }
  traiterFile();
}

async function traiterFile() {
  if (enCours) return;
  enCours = true;
  while (fileAttente.length > 0) {
    const id = fileAttente.shift();
    try {
      await chargerDetailsStore(id);
    } catch (err) {
      console.error(`Détails du jeu ${id} impossibles :`, err.message);
      if (String(err.message).includes("429")) {
        // trop de requêtes : on attend 1 minute avant de reprendre
        fileAttente.unshift(id);
        await new Promise((r) => setTimeout(r, 60 * 1000));
      }
    }
    await new Promise((r) => setTimeout(r, 1600));
  }
  enCours = false;
}

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
    const [top100, tous] = await Promise.all([
      chargerTop100(),
      chargerTousPage0().catch(() => ({})),
    ]);
    const jeux = Object.values(fusionnerJeux(top100, tous)).map(ajouterDetails);

    // on demande les détails du Store d'abord pour les jeux en tendance
    jeux.sort((a, b) => (b.tendance - a.tendance) || (b.joueursPicHier - a.joueursPicHier));
    ajouterAFile(jeux.map((j) => j.appid));

    const total = jeux.length;
    const enrichis = jeux.filter((j) => j.genres).length;
    res.json({ jeux, enrichissement: { total, enrichis } });
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
