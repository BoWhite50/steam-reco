# Conversation avec l'IA (Claude) — projet Steam Reco

Ce fichier retrace ma conversation avec Claude pendant le projet, le 26 novembre 2026.
Mes messages sont recopiés **tels que je les ai écrits** (avec mes fautes). Les réponses de l'IA sont **résumées**.

Le projet Claude d'origine : https://claude.ai/code/project/chan_01DEiN6Poko8iwBbSS2A7Csg
⚠️ Ce lien ne s'ouvre qu'en étant connecté à mon compte Claude. C'est pour ça que ce fichier existe.

---

## Partie 1 — Créer le site

### 1. Le départ
> **Moi :** « voici le dossier et les consigne intiale » *(+ photo de la consigne du prof)*

**IA :** propose un plan **avant de coder** :
- **Stack** : HTML + CSS + JavaScript, avec un petit serveur **Node.js + Express**. Le serveur est obligatoire parce que les API Steam bloquent les appels faits depuis le navigateur (blocage CORS). Graphiques avec **Chart.js**.
- **API gratuites, sans clé** : SteamSpy (temps de jeu, propriétaires, avis, prix), Steam Store (date de sortie, genres, image), Steam Web API (joueurs connectés en direct).
- **5 règles d'analyse** (la consigne en demande 3) : avis, rentabilité en €/heure, rétention des jeux de plus de 2 ans, indé ou gros budget, et un score de recommandation réglable avec des curseurs.
- **Livrables** : dépôt GitHub + `DOC_IA.md`.

### 2. Un critère en plus
> **Moi :** « criterre de plus: nombre de joueur »

**IA :** ajoute le **nombre de joueurs** comme 6e règle et commence à coder.

### 3. L'apparence du site
> **Moi :** « avec ce nouveau plan j'aimerais avoir initialement un site a l'aparence sobre au quelle la premier chose qu'on y voit est le top du jour en liste horizontale defilante comme un peux un fill d'actualité en desous on aurait une interface plus complette avec les parametre de trie etc.. »

**IA :** crée la première version :
- en haut, un bandeau « Top du jour » qui défile ;
- en dessous, les curseurs, les filtres (indé / gros budget, prix max, temps de jeu, recherche, tri), un graphique prix / durée de vie et la liste des jeux avec un score sur 100 ;
- une fiche détaillée par jeu (les 6 règles, un graphique radar, les joueurs connectés en direct) ;
- les règles commentées en français dans `public/js/regles.js`, plus un `README.md` et un début de `DOC_IA.md`.

### 4. Lancer le site
> **Moi :** « fait le npm instale et le npm start »
> **Moi :** « le path a changer D:\ynov\outils-ia\steam-reco »
> **Moi :** « que dois je faire pour demaré le site ducou^p »

**IA :** explique pas à pas : installer Node.js (version LTS), ouvrir un terminal dans le dossier, taper `npm install` puis `npm start`, et ouvrir http://localhost:3000.

### 5. Changer le top du jour
> **Moi :** « dans le top du jour faisont plutot un top static bougeable avec des fleche. autant agrandire cette afichage au meme moment »

**IA :** remplace le bandeau défilant par un **carrousel de 3 grandes cartes** (image, rang, joueurs, progression ▲▼), qu'on fait défiler avec des flèches ‹ › ou les touches du clavier.

---

## Partie 2 — Améliorer le site

### 6. Vérifier que tout marche
> **Moi :** « tien demande l'acces au dossier »

**IA :** copie les derniers fichiers dans mon dossier et vérifie que **toutes les API répondent** (classement du jour, joueurs connectés, Store, SteamSpy). Le site tournait déjà : il suffisait de recharger la page.

### 7. Mettre le projet sur GitHub
> **Moi :** « comment coller le dosier dans le git https://github.com/BoWhite50/steam-reco »

**IA :** donne les commandes (`git init`, `git add .`, `git commit`, `git remote add origin…`, `git push`) et rappelle de vérifier que `node_modules/` est bien dans le `.gitignore`.

### 8. Les pépites montantes
> **Moi :** « passont maintenant a la recomandation de nouveaux jeux a l'image des jeux comme peak, gambling with your friend, How to Fish. Sont des jeux qui connaisent une monter fulgurante vue leur faible prix et la qualité du jeux »

**IA :**
- En regardant les données, elle découvre que **Peak n'est pas dans les listes SteamSpy** : elles favorisent les vieux jeux qui ont beaucoup de propriétaires.
- Elle ajoute donc deux sources : le **classement du jour de Steam** et les **meilleures ventes / nouveautés du Store**. Pour ces jeux, le serveur va chercher leur fiche SteamSpy un par un.
- Elle crée la **règle 7 « Pépite montante »**, pour les jeux de moins de 2 ans. Le score combine la qualité des avis (30 %), le petit prix (20 %), la popularité (30 %) et la fraîcheur (20 %), avec un bonus si le jeu gagne des places dans le classement. Une vraie pépite doit coûter 20 € maximum, avoir au moins 85 % d'avis positifs et 2 000 joueurs, et ne pas venir d'un gros éditeur.
- Elle ajoute un **carrousel « Pépites montantes »** sous le top du jour.

### 9. Jeux ou logiciels
> **Moi :** « en parralele differencie les type de jeux sur steam si ce sont des utilitaire comme wallpaper engine ou des jeux video »

**IA :** vérifie dans l'API et constate que **Steam classe Wallpaper Engine comme un « game »**. Elle crée donc la **règle 8 « Jeu ou logiciel »**, qui regarde les genres du Store (« Utilities », « Design & Illustration »…). Elle ajoute un filtre « Jeux vidéo seulement » (activé par défaut) et une étiquette « Logiciel » dans le top du jour.

### 10. Un lanceur
> **Moi :** « crée un .exe ou un .bat pour lancé le serveur »

**IA :** crée `lancer-site.bat`. Il vérifie que Node.js est installé, fait `npm install` la première fois, lance le serveur et ouvre le site. Elle explique pourquoi elle a choisi un .bat plutôt qu'un .exe : c'est un simple fichier texte, lisible par le prof, et il n'est pas bloqué par l'antivirus.

### 11. Le défilement de la liste
> **Moi :** « j'aimerais que tu disocie la partie Recommandations pour que la mollete selon ou elle est placer face deffiler la page ou Recommandations »

**IA :** donne à la zone Recommandations **sa propre barre de défilement**. La molette au-dessus de la liste fait défiler la liste, et ailleurs elle fait défiler la page. Le titre reste visible en haut de la liste.

### 12. Le style
> **Moi :** « change les bar blanche met la dans le style du site De plus la partie : Ce qui compte pour moi. est coller a la page elle a pas besoin de barre de scroll »

**IA :** colore les barres de défilement aux couleurs du site et retire la barre de défilement du panneau « Ce qui compte pour moi ».

### 13. Une fonctionnalité perdue
> **Moi :** « une branche a tout caser rajoute la fonctionalité precedente »

**IA :** compare les fichiers et trouve qu'une modification du graphique (points colorés selon le score, image du jeu au survol) avait été faite à partir d'une **ancienne copie**. Elle avait donc effacé le défilement séparé et les barres de couleur. L'IA **fusionne les deux versions** et conseille d'utiliser Git pour pouvoir revenir en arrière.

### 14. Simplifier les réglages
> **Moi :** « pour l'affichage de Ce qui compte pour moi prend reduit la quantité d'obtion pour quelle soit plus abordable tout en changeant les barre de reglage » *(+ capture d'écran des curseurs blancs)*

**IA :** remplace les 6 curseurs de 0 à 10 par **4 boutons par critère** (Non, Un peu, Oui, Beaucoup). On passe de 11 choix à 4 pour chaque critère. Elle donne aussi aux deux curseurs restants (prix, temps de jeu) le style du site.
