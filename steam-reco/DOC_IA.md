# Comment l'IA a été utilisée dans ce projet

> Document demandé par la consigne. À compléter au fur et à mesure du projet.

## Outil utilisé

- **Claude** (Anthropic), dans un projet Claude relié à mon dossier de travail.
- Lien de la conversation : _(à coller ici)_

## 1. Démarche

J'ai utilisé l'IA comme un "collègue développeur" :

1. **Cadrer** : je lui ai donné la consigne du prof (photo) et mon idée de départ.
2. **Décider** : je lui ai demandé un plan (technologies, API, règles d'analyse) **avant** de coder, pour valider les choix moi-même.
3. **Itérer** : j'ai ajouté mes idées au fur et à mesure (critère "nombre de joueurs", bandeau défilant), et l'IA les a intégrées.
4. **Comprendre** : le code est commenté en français pour que je puisse l'expliquer.

## 2. Les prompts importants

| Étape | Mon prompt (résumé) | Technique de prompt engineering |
|-------|---------------------|----------------------------------|
| Sujet | "Site web qui, grâce à l'API Steam, récupère les infos sur les jeux (temps de jeu moyen, rétention pour les jeux anciens, prix, indé ou gros budget, avis Steam…). Le but final : faire des recommandations grâce à des critères éditables." | **Contexte + objectif clair** : je décris le résultat final attendu, pas seulement la tâche. |
| Consigne | J'ai envoyé la photo de la consigne + le dossier de travail. | **Donner les contraintes** (au moins 1 API, 3 règles, Git, documentation) pour que la réponse les respecte. |
| Plan | L'IA a proposé un plan avant de coder ; je l'ai validé. | **Planifier avant d'exécuter** : on évite de coder dans la mauvaise direction. |
| Ajout | "Critère de plus : nombre de joueurs." | **Itération courte** : une demande précise à la fois. |
| Design | "Un site à l'apparence sobre ; la première chose qu'on voit est le top du jour en liste horizontale défilante comme un fil d'actualité ; en dessous, une interface plus complète avec les paramètres de tri." | **Décrire l'interface par l'usage** (ce que l'utilisateur voit en premier), avec une comparaison concrète ("comme un fil d'actualité"). |
| Nouvelle recommandation | "Passons maintenant à la recommandation de nouveaux jeux à l'image de Peak, Gambling with your friends, How to Fish. Ce sont des jeux qui connaissent une montée fulgurante vu leur faible prix et la qualité du jeu." | **Donner des exemples concrets** : au lieu de définir les critères moi-même, je cite des jeux qui correspondent, et l'IA en déduit les critères (récent, pas cher, très bien noté, en forte hausse). |
| Filtre | "En parallèle, différencie les types de jeux sur Steam : si ce sont des utilitaires comme Wallpaper Engine ou des jeux vidéo." | **Exemple concret d'un problème vu dans les données** : Wallpaper Engine apparaissait dans le top du jour alors que ce n'est pas un jeu. L'IA a vérifié l'API et vu que Steam le classe quand même en "game" : il a fallu passer par les genres. |
| Correction | "Dans le top du jour, faisons plutôt un top statique qu'on fait bouger avec des flèches. Autant agrandir cet affichage en même temps." | **Retour après avoir testé** : je corrige l'interface après l'avoir vue, au lieu de tout décrire au départ. |

## 3. Les décisions où l'IA m'a aidé

- **Stack** : HTML/CSS/JS + un petit serveur Node.js (Express). L'IA a expliqué qu'un serveur est obligatoire, parce que les API Steam bloquent les appels depuis le navigateur (CORS).
- **Choix des API** : SteamSpy pour le temps de jeu, les avis, le prix et les propriétaires. Steam pour le classement du jour et les joueurs en direct. Le Store pour la date de sortie et le genre "Indie".
- **Règles d'analyse** : la consigne en demande 3, on en a fait 8 (avis, rentabilité €/h, durée de vie, rétention, indé/gros budget, nombre de joueurs, pépite montante, jeu ou logiciel), plus un score pondéré par des curseurs.
- **Trouver les jeux qui montent** : l'IA a remarqué que Peak n'était pas dans les listes SteamSpy (elles favorisent les vieux jeux avec beaucoup de propriétaires). On a donc ajouté le classement du jour de Steam et les meilleures ventes du Store comme sources, et on va chercher la fiche SteamSpy de ces jeux un par un.
- **Limites d'API** : le Store limite les requêtes, donc on a ajouté un cache et un chargement progressif.

## 4. Ce que j'ai vérifié ou modifié moi-même

_(à compléter : tests, bugs trouvés, seuils des règles ajustés, etc.)_

## 5. Charte éthique

- Les données viennent d'API publiques. Aucune donnée personnelle de joueur n'est utilisée.
- Le code généré a été relu et testé. Je dois être capable d'expliquer chaque règle.
- L'IA a été utilisée pour accélérer le travail, pas pour remplacer la compréhension.
