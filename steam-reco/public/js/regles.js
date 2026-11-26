// =============================================================
//  LES RÈGLES D'ANALYSE
//  Chaque règle prend un jeu et renvoie :
//   - une valeur lisible (ex : "0,45 €/h")
//   - une étiquette (ex : "Très rentable")
//   - un score entre 0 et 100 (utilisé pour la recommandation)
// =============================================================

// Petite fonction utile : garde un nombre entre min et max
function borner(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// "1,000,000 .. 2,000,000" -> 1 500 000 (le milieu de la fourchette)
function proprietairesMoyen(texte) {
  if (!texte) return 0;
  const nombres = texte.split("..").map((t) => Number(t.replace(/[^0-9]/g, "")));
  if (nombres.length === 2) return (nombres[0] + nombres[1]) / 2;
  return nombres[0] || 0;
}

// "26 Feb, 2016" -> 2016
function anneeDeSortie(jeu) {
  if (!jeu.sortie) return null;
  const m = jeu.sortie.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

// "26 Feb, 2016" ou "Feb 26, 2016" -> nombre de mois depuis la sortie (null si inconnu)
const MOIS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function moisDepuisSortie(jeu) {
  if (!jeu.sortie) return null;
  const annee = jeu.sortie.match(/\d{4}/);
  const mois = jeu.sortie.toLowerCase().match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  if (!annee || !mois) return null;
  const jour = jeu.sortie.match(/\b(\d{1,2})\b/);
  const date = new Date(Number(annee[0]), MOIS[mois[0]], jour ? Number(jour[1]) : 1);
  const mois30 = (Date.now() - date.getTime()) / (30.44 * 24 * 3600 * 1000);
  return Math.max(0, mois30);
}

function prixDuJeu(jeu) {
  if (typeof jeu.prixEuros === "number") return jeu.prixEuros;
  return jeu.prixCentimes / 100; // prix SteamSpy (en dollars, approximatif)
}

// -------------------------------------------------------------
// RÈGLE 1 : les avis Steam
// On calcule le % d'avis positifs, puis on donne la même étiquette que Steam.
// S'il y a peu d'avis, le résultat est moins fiable : on enlève 10 points.
// -------------------------------------------------------------
function regleAvis(jeu) {
  const total = jeu.avisPositifs + jeu.avisNegatifs;
  if (total === 0) return { valeur: "Aucun avis", etiquette: "Pas d'avis", score: 0, niveau: "neutre" };
  const pct = (jeu.avisPositifs / total) * 100;

  let etiquette, niveau;
  if (pct >= 95 && total >= 500) { etiquette = "Extrêmement positif"; niveau = "top"; }
  else if (pct >= 80) { etiquette = "Très positif"; niveau = "bon"; }
  else if (pct >= 70) { etiquette = "Plutôt positif"; niveau = "bon"; }
  else if (pct >= 40) { etiquette = "Mitigé"; niveau = "moyen"; }
  else { etiquette = "Négatif"; niveau = "mauvais"; }

  const score = borner(pct - (total < 500 ? 10 : 0), 0, 100);
  return { valeur: `${Math.round(pct)} % (${total.toLocaleString("fr-FR")} avis)`, etiquette, score, niveau };
}

// -------------------------------------------------------------
// RÈGLE 2 : la rentabilité (prix ÷ heures de jeu moyennes = € par heure)
// 0 €/h (gratuit) = 100 points, 2 €/h ou plus = 0 point.
// -------------------------------------------------------------
function regleRentabilite(jeu) {
  const prix = prixDuJeu(jeu);
  const heures = jeu.tempsMoyenMin / 60;
  if (prix === 0) return { valeur: "Gratuit", etiquette: "Gratuit", score: 100, niveau: "top" };
  if (heures < 0.5) return { valeur: `${prix.toFixed(2)} €`, etiquette: "Pas assez de données", score: 30, niveau: "neutre" };

  const euroParHeure = prix / heures;
  let etiquette, niveau;
  if (euroParHeure <= 0.25) { etiquette = "Très rentable"; niveau = "top"; }
  else if (euroParHeure <= 0.75) { etiquette = "Rentable"; niveau = "bon"; }
  else if (euroParHeure <= 1.5) { etiquette = "Correct"; niveau = "moyen"; }
  else { etiquette = "Cher pour sa durée"; niveau = "mauvais"; }

  const score = borner(100 - euroParHeure * 50, 0, 100);
  return { valeur: `${euroParHeure.toFixed(2).replace(".", ",")} €/h`, etiquette, score, niveau };
}

// -------------------------------------------------------------
// RÈGLE 3 : la durée de vie (temps de jeu moyen des joueurs)
// Échelle logarithmique : 1 h ≈ 15 pts, 10 h ≈ 52 pts, 100 h = 100 pts.
// -------------------------------------------------------------
function regleDuree(jeu) {
  const heures = jeu.tempsMoyenMin / 60;
  let etiquette, niveau;
  if (heures >= 100) { etiquette = "Très longue"; niveau = "top"; }
  else if (heures >= 30) { etiquette = "Longue"; niveau = "bon"; }
  else if (heures >= 8) { etiquette = "Moyenne"; niveau = "moyen"; }
  else { etiquette = "Courte"; niveau = "neutre"; }
  const score = borner((Math.log10(heures + 1) / 2) * 100, 0, 100);
  return { valeur: `${Math.round(heures)} h en moyenne`, etiquette, score, niveau };
}

// -------------------------------------------------------------
// RÈGLE 4 : la rétention (pour les jeux de plus de 2 ans)
// Question : parmi les gens qui ont acheté le jeu, combien y jouent encore ?
// On divise le pic de joueurs d'hier par le nombre de propriétaires.
// 0,001 % -> 0 pt ; 1 % ou plus -> 100 pts (échelle logarithmique).
// -------------------------------------------------------------
function regleRetention(jeu) {
  const annee = anneeDeSortie(jeu);
  const age = annee ? new Date().getFullYear() - annee : null;
  const proprio = proprietairesMoyen(jeu.proprietaires);

  if (age !== null && age < 2) {
    return { valeur: `Sorti en ${annee}`, etiquette: "Trop récent pour juger", score: 50, niveau: "neutre" };
  }
  if (!proprio || !jeu.joueursPicHier) {
    return { valeur: "—", etiquette: "Pas assez de données", score: 20, niveau: "neutre" };
  }

  const ratio = jeu.joueursPicHier / proprio;
  const score = borner(((Math.log10(ratio) + 5) / 3) * 100, 0, 100);
  let etiquette, niveau;
  if (score >= 70) { etiquette = "Toujours très joué"; niveau = "top"; }
  else if (score >= 45) { etiquette = "Communauté fidèle"; niveau = "bon"; }
  else if (score >= 25) { etiquette = "En déclin"; niveau = "moyen"; }
  else { etiquette = "Presque abandonné"; niveau = "mauvais"; }

  const pctTexte = (ratio * 100).toLocaleString("fr-FR", { maximumSignificantDigits: 2 });
  const debut = annee ? `Sorti en ${annee}, ` : "";
  return { valeur: `${debut}${pctTexte} % des joueurs actifs`, etiquette, score, niveau };
}

// -------------------------------------------------------------
// RÈGLE 5 : indé ou gros budget
// - genre "Indie" sur le Store -> Indé
// - sinon, éditeur connu OU (plus de 5 M de propriétaires et prix >= 40 €) -> Gros budget
// - sinon -> Intermédiaire
// -------------------------------------------------------------
const GROS_EDITEURS = [
  "Electronic Arts", "Ubisoft", "Activision", "Bethesda", "Rockstar", "Take-Two", "2K",
  "Sony", "PlayStation", "Xbox", "Microsoft", "Square Enix", "CAPCOM", "Capcom",
  "BANDAI NAMCO", "Bandai Namco", "SEGA", "Warner Bros", "Valve", "Blizzard",
  "CD PROJEKT", "KONAMI", "Deep Silver", "PLAION", "Embracer", "THQ Nordic", "Paradox", "Epic Games", "FromSoftware", "Krafton", "NetEase", "Tencent",
];

function regleBudget(jeu) {
  const editeur = jeu.editeur || "";
  const genres = jeu.genres || [];
  const prix = prixDuJeu(jeu);
  const proprio = proprietairesMoyen(jeu.proprietaires);

  let type;
  if (genres.includes("Indie")) type = "inde";
  else if (GROS_EDITEURS.some((e) => editeur.includes(e))) type = "aaa";
  else if (proprio > 5000000 && prix >= 40) type = "aaa";
  else if (!jeu.genres && jeu.developpeur && jeu.developpeur === editeur && prix < 30) type = "inde"; // estimation si pas encore les genres
  else type = "moyen";

  const noms = { inde: "Indé", aaa: "Gros budget", moyen: "Intermédiaire" };
  const estimation = !jeu.genres ? " (estimé)" : "";
  return { valeur: editeur || "Éditeur inconnu", etiquette: noms[type] + estimation, type, score: null, niveau: "neutre" };
}

// -------------------------------------------------------------
// RÈGLE 6 : le nombre de joueurs (pic de joueurs connectés hier)
// Échelle logarithmique : 100 joueurs = 40 pts, 10 000 = 80 pts, 100 000+ = 100 pts.
// -------------------------------------------------------------
function regleJoueurs(jeu) {
  const n = jeu.joueursPicHier || 0;
  let etiquette, niveau;
  if (n >= 100000) { etiquette = "Massif"; niveau = "top"; }
  else if (n >= 10000) { etiquette = "Très populaire"; niveau = "bon"; }
  else if (n >= 1000) { etiquette = "Actif"; niveau = "moyen"; }
  else { etiquette = "Niche"; niveau = "neutre"; }
  const score = borner((Math.log10(n + 1) / 5) * 100, 0, 100);
  return { valeur: `${n.toLocaleString("fr-FR")} joueurs (pic d'hier)`, etiquette, score, niveau };
}

// -------------------------------------------------------------
// RÈGLE 7 : la pépite montante
// On cherche les jeux comme Peak ou How to Fish : récents, pas chers,
// très bien notés, et qui attirent beaucoup de joueurs d'un coup.
// Le score mélange 4 notes (sur 100) :
//   - qualité     (30 %) : 70 % d'avis positifs = 0 pt, 95 % ou plus = 100 pts
//   - petit prix  (20 %) : gratuit = 100 pts, 25 € ou plus = 0 pt
//   - popularité  (30 %) : 100 joueurs = 0 pt, 100 000 joueurs = 100 pts (log)
//   - fraîcheur   (20 %) : sorti aujourd'hui = 100 pts, il y a 2 ans = 0 pt
// Pour être une vraie pépite : pas un gros budget, 20 € max, 85 % d'avis positifs
// (avec au moins 200 avis) et au moins 2 000 joueurs en même temps.
// + bonus "montée" : le jeu gagne des places dans le classement Steam du jour
//   (jusqu'à +15), ou il vient d'y entrer (+15), ou il est dans les meilleures ventes (+5).
// Un jeu de plus de 2 ans n'est jamais une "pépite montante" (score 0).
// -------------------------------------------------------------
function reglePepite(jeu) {
  if (regleCategorie(jeu).categorie !== "jeu") {
    return { valeur: "Ce n'est pas un jeu vidéo", etiquette: "Pas un jeu", score: 0, niveau: "neutre", estPepite: false };
  }
  const mois = moisDepuisSortie(jeu);
  if (mois === null) return { valeur: "Date de sortie inconnue", etiquette: "Date inconnue", score: 0, niveau: "neutre", estPepite: false };
  if (mois > 24) return { valeur: `Sorti il y a ${Math.round(mois / 12)} ans`, etiquette: "Pas récent", score: 0, niveau: "neutre", estPepite: false };

  const totalAvis = jeu.avisPositifs + jeu.avisNegatifs;
  const pct = totalAvis ? (jeu.avisPositifs / totalAvis) * 100 : 0;
  let qualite = borner(((pct - 70) / 25) * 100, 0, 100);
  if (totalAvis < 200) qualite /= 2; // trop peu d'avis pour être sûr

  const prix = prixDuJeu(jeu);
  const petitPrix = borner(100 - prix * 4, 0, 100);

  const joueurs = Math.max(jeu.joueursPicHier || 0, jeu.picAujourdhui || 0);
  const popularite = borner(((Math.log10(joueurs + 1) - 2) / 3) * 100, 0, 100);

  const fraicheur = borner(100 - (mois / 24) * 100, 0, 100);

  let bonus = 0;
  let montee = "";
  if (jeu.rangDuJour && jeu.rangSemaineDerniere === 0) { bonus = 15; montee = "nouveau dans le top 100"; }
  else if (jeu.rangDuJour && jeu.rangSemaineDerniere > jeu.rangDuJour) {
    const gain = jeu.rangSemaineDerniere - jeu.rangDuJour;
    bonus = Math.min(15, gain);
    montee = `+${gain} places en 1 semaine`;
  }
  if (jeu.meilleureVente) { bonus += 5; montee = montee ? montee + ", meilleure vente" : "meilleure vente"; }

  const score = borner(0.3 * qualite + 0.2 * petitPrix + 0.3 * popularite + 0.2 * fraicheur + bonus, 0, 100);

  // Une "vraie" pépite doit cocher toutes les cases (et ne pas venir d'un gros éditeur)
  const grosBudget = regleBudget(jeu).type === "aaa";
  const estPepite = !grosBudget && prix <= 20 && pct >= 85 && totalAvis >= 200 && joueurs >= 2000;

  let etiquette, niveau;
  if (estPepite && score >= 65) { etiquette = "Pépite montante"; niveau = "top"; }
  else if (score >= 50) { etiquette = "Prometteur"; niveau = "bon"; }
  else { etiquette = "Récent"; niveau = "moyen"; }

  const age = mois < 1 ? "Sorti ce mois-ci" : `Sorti il y a ${Math.round(mois)} mois`;
  return { valeur: age + (montee ? ` · ${montee}` : ""), etiquette, score, niveau, estPepite, mois, joueurs, pct };
}

// -------------------------------------------------------------
// RÈGLE 8 : jeu vidéo ou logiciel ?
// Sur Steam, Wallpaper Engine ou Blender ont le type "game" comme les vrais jeux.
// La différence se voit dans les genres du Store : les logiciels ont des genres
// comme "Utilities" ou "Design & Illustration".
//  - type différent de "game" (matériel, DLC, musique...) -> Autre
//  - au moins un genre "logiciel"                           -> Logiciel
//  - sinon                                                  -> Jeu vidéo
// -------------------------------------------------------------
const GENRES_LOGICIELS = [
  "Utilities", "Animation & Modeling", "Audio Production", "Design & Illustration",
  "Photo Editing", "Video Production", "Software Training", "Web Publishing",
  "Game Development", "Accounting", "Education",
];

function regleCategorie(jeu) {
  if (jeu.typeStore && jeu.typeStore !== "game") {
    return { categorie: "autre", valeur: `Type Steam : ${jeu.typeStore}`, etiquette: "Pas un jeu", score: null, niveau: "neutre" };
  }
  if (!jeu.genres) {
    return { categorie: "jeu", valeur: "Genres pas encore chargés", etiquette: "Jeu vidéo (estimé)", score: null, niveau: "neutre" };
  }
  const genresLogiciel = jeu.genres.filter((g) => GENRES_LOGICIELS.includes(g));
  if (genresLogiciel.length > 0) {
    return { categorie: "logiciel", valeur: genresLogiciel.join(", "), etiquette: "Logiciel / utilitaire", score: null, niveau: "moyen" };
  }
  return { categorie: "jeu", valeur: jeu.genres.join(", "), etiquette: "Jeu vidéo", score: null, niveau: "neutre" };
}

// -------------------------------------------------------------
// SCORE DE RECOMMANDATION
// Moyenne pondérée des scores des règles. Les poids viennent des curseurs (0 à 10).
// Bonus/malus selon le type préféré (indé / gros budget).
// -------------------------------------------------------------
function analyserJeu(jeu, poids, typePrefere) {
  const r = {
    avis: regleAvis(jeu),
    rentabilite: regleRentabilite(jeu),
    duree: regleDuree(jeu),
    retention: regleRetention(jeu),
    budget: regleBudget(jeu),
    joueurs: regleJoueurs(jeu),
    pepite: reglePepite(jeu),
    categorie: regleCategorie(jeu),
  };

  let somme = 0;
  let totalPoids = 0;
  for (const cle of ["avis", "rentabilite", "duree", "retention", "joueurs", "pepite"]) {
    const p = poids[cle] || 0;
    somme += r[cle].score * p;
    totalPoids += p;
  }
  let score = totalPoids > 0 ? somme / totalPoids : 0;

  if (typePrefere !== "tous") {
    score += r.budget.type === typePrefere ? 10 : -10;
  }
  r.score = Math.round(borner(score, 0, 100));
  return r;
}
