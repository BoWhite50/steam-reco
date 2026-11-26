# Steam Reco

Site web qui récupère les données des jeux Steam (via les API Steam et SteamSpy) et recommande des jeux selon des critères que l'utilisateur règle lui-même.

Projet étudiant Ynov, cours "Outils IA".

## Ce que fait le site

1. **Carrousel "Top du jour"** en haut : les jeux les plus joués aujourd'hui sur Steam, en grandes cartes. On passe d'une page à l'autre avec les flèches (boutons ou touches ← →).
2. **Interface de recommandation** en dessous :
   - des curseurs pour dire ce qui compte pour toi (avis, rentabilité, durée de vie, rétention, nombre de joueurs) ;
   - des filtres (type de jeu indé / gros budget, prix max, temps de jeu minimum, recherche par nom, tri) ;
   - un graphique "prix / durée de vie" ;
   - une fiche détaillée pour chaque jeu, avec un graphique radar et le nombre de joueurs connectés en direct.

## Les 6 règles d'analyse

Elles sont toutes dans `public/js/regles.js`.

| # | Règle | Calcul | Étiquettes |
|---|-------|--------|-----------|
| 1 | Avis | % d'avis positifs (−10 pts s'il y a moins de 500 avis) | Extrêmement positif, Très positif, Plutôt positif, Mitigé, Négatif |
| 2 | Rentabilité | prix ÷ heures de jeu moyennes = € par heure | Gratuit, Très rentable (≤ 0,25 €/h), Rentable, Correct, Cher pour sa durée |
| 3 | Durée de vie | temps de jeu moyen (échelle logarithmique) | Courte, Moyenne, Longue, Très longue |
| 4 | Rétention | pour les jeux de plus de 2 ans : pic de joueurs d'hier ÷ nombre de propriétaires | Toujours très joué, Communauté fidèle, En déclin, Presque abandonné |
| 5 | Budget | genre "Indie" sur le Store, éditeur connu, ou nombre de propriétaires + prix | Indé, Intermédiaire, Gros budget |
| 6 | Nombre de joueurs | pic de joueurs connectés hier | Niche, Actif, Très populaire, Massif |

**Score de recommandation (sur 100)** : moyenne des scores des règles 1, 2, 3, 4 et 6, pondérée par les curseurs. Le choix du type de jeu (règle 5) donne +10 ou −10 points.

## Les API utilisées

| API | Ce qu'on en tire |
|-----|------------------|
| SteamSpy `request=top100in2weeks` | les 100 jeux les plus joués des 2 dernières semaines |
| SteamSpy `request=all&page=0` | les 1000 jeux avec le plus de propriétaires |
| Steam `ISteamChartsService/GetMostPlayedGames` | le classement du jour (bandeau) |
| Steam Store `appdetails` | date de sortie, genres, prix en euros |
| Steam `ISteamUserStats/GetNumberOfCurrentPlayers` | joueurs connectés en ce moment (fiche détaillée) |

Aucune clé API n'est nécessaire.

**Pourquoi un serveur Node.js ?** Les API Steam refusent les appels faits directement depuis le navigateur (blocage CORS). Le serveur (`server.js`) fait les appels à la place du navigateur, garde les réponses en cache dans `data/cache.json`, et les renvoie au site.

Le Store Steam limite le nombre de requêtes (environ 200 toutes les 5 minutes). Le serveur récupère donc les détails des jeux petit à petit, en arrière-plan. Au premier lancement, la date de sortie et le genre arrivent progressivement (la page se met à jour toute seule). Ensuite, tout est en cache pendant 7 jours.

## Lancer le site

1. Installer [Node.js](https://nodejs.org) (version LTS).
2. Ouvrir un terminal dans ce dossier, puis :

```bash
npm install
npm start
```

3. Ouvrir http://localhost:3000 dans le navigateur.

## Organisation des fichiers

```
server.js            le serveur (appels aux API + cache)
public/index.html    la page
public/css/style.css le style
public/js/regles.js  les 6 règles d'analyse + le score
public/js/app.js     l'affichage (bandeau, liste, graphiques, fiche)
data/cache.json      le cache (créé automatiquement, pas envoyé sur Git)
DOC_IA.md            comment l'IA a été utilisée dans le projet
```

## Mettre le projet sur GitHub

1. Créer un dépôt vide sur github.com (sans README).
2. Dans le dossier du projet :

```bash
git init
git add .
git commit -m "Première version du site Steam Reco"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/steam-reco.git
git push -u origin main
```
