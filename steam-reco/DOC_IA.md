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
| Correction | "Dans le top du jour, faisons plutôt un top statique qu'on fait bouger avec des flèches. Autant agrandir cet affichage en même temps." | **Retour après avoir testé** : je corrige l'interface après l'avoir vue, au lieu de tout décrire au départ. |

## 3. Les décisions où l'IA m'a aidé

- **Stack** : HTML/CSS/JS + un petit serveur Node.js (Express). L'IA a expliqué qu'un serveur est obligatoire, parce que les API Steam bloquent les appels depuis le navigateur (CORS).
- **Choix des API** : SteamSpy pour le temps de jeu, les avis, le prix et les propriétaires. Steam pour le classement du jour et les joueurs en direct. Le Store pour la date de sortie et le genre "Indie".
- **Règles d'analyse** : la consigne en demande 3, on en a fait 6 (avis, rentabilité €/h, durée de vie, rétention, indé/gros budget, nombre de joueurs), plus un score pondéré par des curseurs.
- **Limites d'API** : le Store limite les requêtes, donc on a ajouté un cache et un chargement progressif.

## 4. Ce que j'ai vérifié ou modifié moi-même

_(à compléter : tests, bugs trouvés, seuils des règles ajustés, etc.)_

## 5. Charte éthique

- Les données viennent d'API publiques. Aucune donnée personnelle de joueur n'est utilisée.
- Le code généré a été relu et testé. Je dois être capable d'expliquer chaque règle.
- L'IA a été utilisée pour accélérer le travail, pas pour remplacer la compréhension.
