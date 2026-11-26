// =============================================================
//  Le code de la page : charge les données, applique les règles
//  (fichier regles.js), affiche le carrousel, la liste et les graphiques.
// =============================================================

let tousLesJeux = [];        // les jeux reçus du serveur
let nombreAffiches = 20;     // combien de jeux on montre (bouton "Voir plus")
let graphiqueNuage = null;
let graphiqueRadar = null;

const $ = (id) => document.getElementById(id);

function imageDuJeu(appid, taille = "capsule_184x69") {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/${taille}.jpg`;
}

function echapper(texte) {
  const div = document.createElement("div");
  div.textContent = texte ?? "";
  return div.innerHTML;
}

// ---------- 1. Le carrousel "top du jour" ----------
async function chargerTopDuJour() {
  const carrousel = $("carrousel");
  try {
    const rep = await fetch("/api/top-du-jour");
    const top = await rep.json();
    if (!rep.ok) throw new Error(top.erreur);

    carrousel.innerHTML = top.map((j) => {
      let evolution = "";
      if (j.rangSemaineDerniere && j.rangSemaineDerniere > j.rang) evolution = ` · <span class="fleche-haut">▲ ${j.rangSemaineDerniere - j.rang}</span>`;
      if (j.rangSemaineDerniere && j.rangSemaineDerniere < j.rang) evolution = ` · <span class="fleche-bas">▼ ${j.rang - j.rangSemaineDerniere}</span>`;
      return `
        <button class="carte-top" data-appid="${j.appid}">
          <div class="carte-top-image">
            <img src="${imageDuJeu(j.appid, "header")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            <span class="carte-top-rang">${j.rang}</span>
          </div>
          <div class="carte-top-texte">
            <div class="carte-top-nom">${echapper(j.nom)}</div>
            <div class="carte-top-joueurs">${Number(j.joueurs).toLocaleString("fr-FR")} joueurs max aujourd'hui${evolution}</div>
          </div>
        </button>`;
    }).join("");

    carrousel.querySelectorAll(".carte-top").forEach((b) =>
      b.addEventListener("click", () => ouvrirDetail(Number(b.dataset.appid)))
    );
  } catch (err) {
    carrousel.innerHTML = `<span class="erreur">Top du jour indisponible (${echapper(err.message)})</span>`;
  }
  majFleches();
}

// Les flèches font avancer le carrousel d'une "page" (la largeur visible)
function deplacerCarrousel(sens) {
  const c = $("carrousel");
  c.scrollBy({ left: sens * c.clientWidth, behavior: "smooth" });
}

// On grise la flèche quand on est au début ou à la fin
function majFleches() {
  const c = $("carrousel");
  $("top-precedent").disabled = c.scrollLeft <= 2;
  $("top-suivant").disabled = c.scrollLeft + c.clientWidth >= c.scrollWidth - 2;
}

// ---------- 2. Lire les paramètres choisis par l'utilisateur ----------
const CLES_POIDS = ["avis", "rentabilite", "duree", "retention", "joueurs"];

function lireParametres() {
  const poids = {};
  for (const cle of CLES_POIDS) {
    poids[cle] = Number($("poids-" + cle).value);
    $("val-" + cle).textContent = poids[cle];
  }
  const prixMax = Number($("prix-max").value);
  $("val-prix").textContent = prixMax >= 80 ? "sans limite" : prixMax === 0 ? "gratuit" : prixMax + " €";
  const dureeMin = Number($("duree-min").value);
  $("val-duree-min").textContent = dureeMin + " h";

  return {
    poids,
    typePrefere: $("type-jeu").value,
    prixMax: prixMax >= 80 ? Infinity : prixMax,
    dureeMin,
    recherche: $("recherche").value.trim().toLowerCase(),
    tri: $("tri").value,
    tendanceSeulement: $("tendance-seulement").checked,
  };
}

// ---------- 3. Appliquer les règles, filtrer et trier ----------
function calculerResultats() {
  const p = lireParametres();

  let resultats = tousLesJeux.map((jeu) => ({ jeu, analyse: analyserJeu(jeu, p.poids, p.typePrefere) }));

  resultats = resultats.filter(({ jeu }) => {
    if (prixDuJeu(jeu) > p.prixMax) return false;
    if (jeu.tempsMoyenMin / 60 < p.dureeMin) return false;
    if (p.recherche && !jeu.nom.toLowerCase().includes(p.recherche)) return false;
    if (p.tendanceSeulement && !jeu.tendance) return false;
    return true;
  });

  if (p.tri === "score") resultats.sort((a, b) => b.analyse.score - a.analyse.score);
  else if (p.tri === "prix") resultats.sort((a, b) => prixDuJeu(a.jeu) - prixDuJeu(b.jeu));
  else resultats.sort((a, b) => b.analyse[p.tri].score - a.analyse[p.tri].score);

  return resultats;
}

// ---------- 4. Afficher la liste ----------
function afficher() {
  const resultats = calculerResultats();
  const liste = $("liste-jeux");
  $("titre-resultats").textContent = `Recommandations (${resultats.length} jeux)`;

  if (resultats.length === 0) {
    liste.innerHTML = '<p class="aide">Aucun jeu ne correspond. Essaie d\'élargir les filtres.</p>';
  } else {
    liste.innerHTML = resultats.slice(0, nombreAffiches).map(({ jeu, analyse }, i) => {
      const a = analyse;
      const prix = prixDuJeu(jeu);
      const badge = (r) => `<span class="badge ${r.niveau}" title="${echapper(r.valeur)}">${echapper(r.etiquette)}</span>`;
      return `
        <article class="jeu" data-appid="${jeu.appid}">
          <div class="jeu-position">${i + 1}</div>
          <img src="${imageDuJeu(jeu.appid)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
          <div>
            <div class="jeu-nom">${echapper(jeu.nom)}<small>${prix === 0 ? "Gratuit" : prix.toFixed(2).replace(".", ",") + " €"}</small></div>
            <div class="badges">
              ${badge({ ...a.avis, etiquette: "Avis : " + a.avis.etiquette })}
              ${badge({ ...a.rentabilite, etiquette: a.rentabilite.valeur })}
              ${badge({ ...a.duree, etiquette: a.duree.valeur })}
              ${badge({ ...a.retention, etiquette: a.retention.etiquette })}
              ${badge({ ...a.budget, etiquette: a.budget.etiquette })}
              ${badge({ ...a.joueurs, etiquette: a.joueurs.etiquette })}
            </div>
          </div>
          <div class="jeu-score"><strong>${a.score}</strong><span>/ 100</span></div>
        </article>`;
    }).join("");

    liste.querySelectorAll(".jeu").forEach((el) =>
      el.addEventListener("click", () => ouvrirDetail(Number(el.dataset.appid)))
    );
  }

  $("voir-plus").hidden = resultats.length <= nombreAffiches;
  dessinerNuage(resultats.slice(0, 50));
}

// ---------- 5. Graphique "prix / durée de vie" ----------
function dessinerNuage(resultats) {
  if (typeof Chart === "undefined") return; // Chart.js pas chargé (pas d'internet)
  const points = resultats.map(({ jeu, analyse }) => ({
    x: prixDuJeu(jeu),
    y: Math.round(jeu.tempsMoyenMin / 60),
    nom: jeu.nom,
    score: analyse.score,
  }));
  const couleurAccent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const couleurTexte = getComputedStyle(document.documentElement).getPropertyValue("--texte-doux").trim();

  if (graphiqueNuage) graphiqueNuage.destroy();
  graphiqueNuage = new Chart($("graphique-nuage"), {
    type: "scatter",
    data: {
      datasets: [{
        data: points,
        backgroundColor: couleurAccent + "99",
        borderColor: couleurAccent,
        pointRadius: (ctx) => 3 + (ctx.raw ? ctx.raw.score / 20 : 0), // plus le score est haut, plus le point est gros
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.nom} : ${ctx.raw.x} €, ${ctx.raw.y} h, score ${ctx.raw.score}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Prix (€)", color: couleurTexte }, ticks: { color: couleurTexte } },
        y: { type: "logarithmic", title: { display: true, text: "Temps de jeu moyen (h)", color: couleurTexte }, ticks: { color: couleurTexte } },
      },
    },
  });
}

// ---------- 6. Fenêtre de détail d'un jeu ----------
async function ouvrirDetail(appid) {
  const jeu = tousLesJeux.find((j) => j.appid === appid);
  const p = lireParametres();
  const contenu = $("detail-contenu");
  $("detail").showModal();

  if (!jeu) {
    contenu.innerHTML = `<img src="${imageDuJeu(appid, "header")}" alt="">
      <p class="aide">Ce jeu n'est pas encore dans la liste analysée.</p>
      <a class="lien-steam" href="https://store.steampowered.com/app/${appid}" target="_blank" rel="noopener">Voir sur Steam</a>`;
    if (graphiqueRadar) graphiqueRadar.destroy();
    return;
  }

  const a = analyserJeu(jeu, p.poids, p.typePrefere);
  const ligne = (nom, r) => `<tr><td>${nom}</td><td><strong>${echapper(r.etiquette)}</strong><br>${echapper(r.valeur)}</td></tr>`;

  contenu.innerHTML = `
    <img src="${imageDuJeu(appid, "header")}" alt="">
    <h2>${echapper(jeu.nom)}</h2>
    <p class="aide">${echapper(jeu.developpeur)} · ${jeu.sortie ? "Sorti le " + echapper(jeu.sortie) : "date inconnue"}
      · <span id="joueurs-maintenant">joueurs connectés : chargement…</span></p>
    <p><strong>Score de recommandation : ${a.score} / 100</strong></p>
    <table class="tableau-regles">
      ${ligne("1. Avis", a.avis)}
      ${ligne("2. Rentabilité", a.rentabilite)}
      ${ligne("3. Durée de vie", a.duree)}
      ${ligne("4. Rétention", a.retention)}
      ${ligne("5. Budget", a.budget)}
      ${ligne("6. Joueurs", a.joueurs)}
    </table>
    <a class="lien-steam" href="https://store.steampowered.com/app/${appid}" target="_blank" rel="noopener">Voir la page Steam</a>`;

  dessinerRadar(a);

  // nombre de joueurs connectés en ce moment (API Steam en direct)
  try {
    const rep = await fetch("/api/jeu/" + appid);
    const d = await rep.json();
    const el = $("joueurs-maintenant");
    if (el) el.textContent = d.joueursMaintenant != null
      ? `${d.joueursMaintenant.toLocaleString("fr-FR")} joueurs connectés en ce moment`
      : "joueurs connectés : inconnu";
  } catch (e) { /* pas grave */ }
}

function dessinerRadar(a) {
  if (typeof Chart === "undefined") return;
  const couleurAccent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const couleurTexte = getComputedStyle(document.documentElement).getPropertyValue("--texte-doux").trim();
  if (graphiqueRadar) graphiqueRadar.destroy();
  graphiqueRadar = new Chart($("graphique-radar"), {
    type: "radar",
    data: {
      labels: ["Avis", "Rentabilité", "Durée de vie", "Rétention", "Joueurs"],
      datasets: [{
        data: [a.avis.score, a.rentabilite.score, a.duree.score, a.retention.score, a.joueurs.score].map(Math.round),
        backgroundColor: couleurAccent + "33",
        borderColor: couleurAccent,
        pointBackgroundColor: couleurAccent,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { r: { min: 0, max: 100, ticks: { display: false }, pointLabels: { color: couleurTexte } } },
    },
  });
}

// ---------- 7. Chargement des jeux (et mise à jour pendant l'enrichissement) ----------
async function chargerJeux() {
  try {
    const rep = await fetch("/api/jeux");
    const d = await rep.json();
    if (!rep.ok) throw new Error(d.erreur);
    tousLesJeux = d.jeux;
    afficher();

    const { total, enrichis } = d.enrichissement;
    if (enrichis < total) {
      $("etat-enrichissement").textContent =
        `Infos détaillées (date de sortie, genre) : ${enrichis} / ${total} jeux. Mise à jour automatique…`;
      setTimeout(chargerJeux, 30000); // on redemande dans 30 secondes
    } else {
      $("etat-enrichissement").textContent = "";
    }
  } catch (err) {
    $("liste-jeux").innerHTML = `<p class="erreur">Impossible de charger les jeux : ${echapper(err.message)}</p>`;
  }
}

// ---------- 8. Les événements ----------
const VALEURS_DEFAUT = {
  "poids-avis": 5, "poids-rentabilite": 5, "poids-duree": 5, "poids-retention": 5, "poids-joueurs": 5,
  "prix-max": 80, "duree-min": 0,
};

document.querySelectorAll(".panneau input, .panneau select").forEach((el) =>
  el.addEventListener("input", () => { nombreAffiches = 20; afficher(); })
);
$("voir-plus").addEventListener("click", () => { nombreAffiches += 20; afficher(); });
$("reinitialiser").addEventListener("click", () => {
  for (const id in VALEURS_DEFAUT) $(id).value = VALEURS_DEFAUT[id];
  $("type-jeu").value = "tous";
  $("tri").value = "score";
  $("recherche").value = "";
  $("tendance-seulement").checked = false;
  afficher();
});
$("fermer-detail").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", (e) => { if (e.target === $("detail")) $("detail").close(); });

$("top-precedent").addEventListener("click", () => deplacerCarrousel(-1));
$("top-suivant").addEventListener("click", () => deplacerCarrousel(1));
$("carrousel").addEventListener("scroll", majFleches);
window.addEventListener("resize", majFleches);
document.addEventListener("keydown", (e) => {
  if ($("detail").open || e.target.matches("input, select")) return;
  if (e.key === "ArrowLeft") deplacerCarrousel(-1);
  if (e.key === "ArrowRight") deplacerCarrousel(1);
});

chargerTopDuJour();
chargerJeux();
