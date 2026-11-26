# Comment l'IA a été utilisée dans ce projet

Projet **Steam Reco** : un site qui récupère les données des jeux Steam grâce à des API et recommande des jeux selon des critères que l'utilisateur choisit.
Code : https://github.com/BoWhite50/steam-reco

---

## 🔗 Liens des conversations avec l'IA

| Conversation | Lien |
|---|---|
| Conversation de mon collègue (début du projet) | https://claude.ai/share/e2918099-a79a-46ed-8ee3-471c8ef1c5d4 |
| **Ma conversation (projet Claude « steam recomandation »)** | **👉 [conversation.md](conversation.md)** : toutes mes demandes et les réponses de l'IA, dans l'ordre |
| Projet Claude d'origine | https://claude.ai/code/project/chan_01DEiN6Poko8iwBbSS2A7Csg (⚠️ ne s'ouvre qu'en étant connecté à mon compte, d'où le fichier `conversation.md`) |

Outil utilisé : **Claude** (Anthropic), dans un projet Claude relié à mon dossier de travail sur mon PC.

---

## 1. Comment j'ai utilisé l'IA

J'ai utilisé l'IA comme un **collègue développeur** à qui je confie des tâches précises, et pas comme une machine qui fait tout à ma place.

1. **Cadrer** : je lui ai donné la consigne du prof (photo) et mon idée de départ.
2. **Planifier** : je lui ai demandé un plan (technologies, API, règles d'analyse) **avant** de coder, pour valider les choix moi-même.
3. **Construire petit à petit** : j'ai ajouté une idée à la fois (nombre de joueurs, carrousel, pépites montantes, filtre jeux/logiciels…).
4. **Tester et corriger** : j'ouvrais le site, je regardais le résultat, puis je demandais des corrections précises (avec des captures d'écran quand c'était visuel).
5. **Comprendre** : le code est commenté en français pour que je puisse expliquer chaque règle.

---

## 2. Une utilisation « symbiotique » : l'IA m'a aidé à trouver des infos et à décider plus vite

L'idée de la symbiose : **je donne la direction et je juge le résultat, l'IA cherche, vérifie et propose.** Chacun apporte ce que l'autre n'a pas.

| Situation | Ce que l'IA a apporté | Ce que j'ai décidé |
|---|---|---|
| **Choix des API** | Elle a comparé les sources : SteamSpy (avis, temps de jeu, propriétaires), Steam Web API (classement du jour, joueurs connectés), Steam Store (prix en euros, date de sortie, genres). Aucune clé API n'est nécessaire. | Utiliser les trois pour avoir des données complètes. |
| **Pourquoi un serveur** | Elle a expliqué que les API Steam bloquent les appels faits depuis le navigateur (CORS), donc qu'il fallait un petit serveur Node.js. | Garder une architecture simple : Node.js + HTML/CSS/JS. |
| **Limites des API** | Le Store limite le nombre de requêtes. Elle a proposé un cache et un chargement progressif en arrière-plan. | Accepter que les infos arrivent petit à petit au premier lancement. |
| **Peak introuvable** | En cherchant dans les données, l'IA a découvert que Peak n'était **pas** dans les listes SteamSpy (elles favorisent les vieux jeux avec beaucoup de propriétaires). Elle a proposé d'ajouter le classement du jour de Steam et les meilleures ventes du Store. | Ajouter ces sources pour trouver les « pépites montantes ». |
| **Wallpaper Engine** | Elle a vérifié l'API et vu que Steam classe Wallpaper Engine comme un « game ». Il fallait donc regarder les genres (« Utilities », « Design & Illustration »…). | Créer la règle 8 « Jeu ou logiciel » avec un filtre. |
| **Lancer le site** | J'ai demandé un .exe ou un .bat. Elle a conseillé le **.bat** : c'est un simple fichier texte, lisible par le prof, et pas bloqué par l'antivirus. | Utiliser `lancer-site.bat`. |
| **Fichiers écrasés** | Une modification avait effacé une fonctionnalité précédente. L'IA a comparé les fichiers, trouvé ce qui manquait et fusionné les deux versions. | Mettre le projet sur Git pour pouvoir revenir en arrière. |

Sans l'IA, j'aurais passé beaucoup de temps à lire la documentation des API et à chercher pourquoi certains jeux n'apparaissaient pas. Avec elle, je me suis concentré sur **ce que le site doit faire** et sur **la vérification du résultat**.

---

## 3. Les méthodes de prompt engineering utilisées

| Méthode | Exemple dans le projet | Pourquoi ça marche |
|---|---|---|
| **Donner le contexte et l'objectif final** | « Site web qui, grâce à l'API Steam, récupère les infos sur les jeux (temps de jeu moyen, rétention, prix, indé ou gros budget, avis…). Le but final : faire des recommandations grâce à des critères éditables. » | L'IA comprend où on va, pas seulement la tâche du moment. |
| **Donner les contraintes** | J'ai envoyé la photo de la consigne (au moins 1 API, 3 règles, Git, documentation). | La réponse respecte le cahier des charges dès le départ. |
| **Planifier avant d'exécuter** | L'IA a proposé un plan avant de coder ; je l'ai validé. | On évite de coder dans la mauvaise direction. |
| **Une demande précise à la fois** | « Critère de plus : nombre de joueurs. » | Plus facile à vérifier, moins d'erreurs. |
| **Décrire par l'usage et par comparaison** | « La première chose qu'on voit est le top du jour, en liste horizontale comme un fil d'actualité. » | L'IA visualise ce que l'utilisateur doit voir. |
| **Donner des exemples concrets** | « Des jeux à l'image de Peak, Gambling with your friends, How to Fish : une montée fulgurante vu leur faible prix et la qualité du jeu. » | L'IA en déduit les critères (récent, pas cher, très bien noté, en forte hausse). |
| **Montrer le problème** | Capture d'écran des curseurs blancs + « réduis le nombre d'options pour que ce soit plus abordable ». | Pas besoin de longues explications : l'IA voit le problème. |
| **Corriger après avoir testé** | « Fais plutôt un top statique qu'on fait bouger avec des flèches. » / « La molette doit faire défiler la liste ou la page selon où elle est placée. » | J'améliore le site en le testant, au lieu de tout prévoir au départ. |

---

## 4. Ce que j'ai vérifié ou décidé moi-même

- J'ai **testé le site** après chaque modification et demandé des corrections quand quelque chose n'allait pas (curseurs illisibles, barres de défilement blanches, panneau trop long, fonctionnalité effacée).
- J'ai **choisi les critères** de recommandation et les exemples de jeux qui servent de modèle (Peak, How to Fish…).
- J'ai **refusé ou modifié** des propositions quand elles ne correspondaient pas à ce que je voulais (par exemple le bandeau défilant, remplacé par un carrousel à flèches).
- J'ai mis le code sur **GitHub** moi-même.

---

## 5. Lien avec ma charte éthique

Ma charte dit que j'utilise l'IA de deux façons : parfois comme un **partenaire** à qui je donne un rôle, un objectif et ma façon de voir le projet (usage « symbiotique »). Dans ce projet, 

Comment j'ai respecté mes règles :

- **Ne pas prendre chaque réponse à la lettre** : j'ai testé le site à chaque étape. Plusieurs fois, le résultat ne me convenait pas et je l'ai fait corriger.
- **Garder un avis critique** : c'est moi qui ai décidé du design, des critères et des exemples. L'IA proposait, je validais ou je refusais.
- **Apprendre, pas seulement obtenir une réponse** : j'ai demandé que le code soit commenté en français et que les explications soient simples (je suis en 1re année). Je dois pouvoir expliquer chaque règle d'analyse.
- **Accompagner l'IA dans son raisonnement** : je lui ai donné ma vision (exemples de jeux, captures d'écran, ordre des priorités) au lieu de la laisser tout inventer.
- **Données** : le site n'utilise que des données publiques de Steam et SteamSpy. Aucune donnée personnelle de joueur n'est collectée.

L'IA m'a permis d'aller plus vite et plus loin que ce que j'aurais fait seul (8 règles d'analyse au lieu des 3 demandées), mais c'est moi qui ai piloté le projet.
