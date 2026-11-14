# Banc qualité du mod plan-de-vol

Hors du dossier du mod : celui-ci est surveillé et rechargé à chaud, il ne
doit porter ni `node_modules` ni rapports. Les dépendances sont celles des
bancs des mods, un niveau au-dessus (`qa/package.json`, `npm ci`
là-bas) : le banc de status-band, `../status-band/`, s'en sert aussi.

| Commande | Ce qu'elle prouve | Seuil |
|---|---|---|
| `./lint.sh` | `tsc` strict + ESLint `strictTypeChecked` et `stylisticTypeChecked` (typescript-eslint), 0 avertissement | sortie 0 |
| `npm test` | la suite `claude plugin test` (kit du moteur), dessins approuvés compris | 0 échec |
| `node coverage.mjs` | couverture Istanbul mesurée dans le moteur (environnements du plugin, des tests et du module de surface) | 100 % lignes, instructions, fonctions, branches |
| `node gaps.mjs [fichier]` | ce que la dernière mesure n'a pas couvert, avec le code | — |
| `node golden.mjs` | réécrit `tests/golden.ts`, les dessins approuvés, et dit lesquels changent (`--check` : seulement le dire) | — |
| `node mutation.mjs` | mutants façon Stryker (opérateurs, conditions, textes, tableaux, corps de fonction, méthodes), chacun jugé par la suite | survivants tous justifiés ci-dessous |

`mutation.mjs --list` compte les mutants, `--file a.ts,b.ts` en limite les
sources, `--only id,id` en rejoue, `--report` relit les derniers verdicts.
Les verdicts sont gardés par source (`mutation/<source>.json`) avec
l'empreinte du code jugé : une source modifiée depuis est dite PÉRIMÉE. Il
tourne sur 4 copies dans `/var/tmp` (disque, pas le tmpfs `/tmp`) et refuse
de démarrer sous 8 Go de RAM libre.

## Dessins approuvés

`tests/scenes.ts` rend le panneau (monté dans le moteur), le logigramme, la
route, le bandeau, l'en-tête warp image par image et les prompts envoyés à
Haiku ; chaque scène est écrite en clair, puis segment par segment avec son
style (couleur, fond, gras, italique). `tests/render.test.ts` compare chacune
à `tests/golden.ts`. Un changement voulu du dessin : `node golden.mjs`, puis
relire le diff de `tests/golden.ts` avant de le garder ; un changement que
personne n'a voulu est un bogue.

## Exclusions

Exclus de la couverture et de la mutation, et seulement eux : les
déclarations `atom(...)` (le scan du moteur les lit telles qu'écrites) et
trois blocs marqués `istanbul ignore next` dans `register.tsx`, que le kit de
test ne peut pas atteindre (il ne lève pas `ui.close`, retombe sur son
propre stockage quand un hook d'état de test échoue, et ne peut pas faire
échouer `$.store`).

## Mutants équivalents

Survivants examinés un à un et gardés parce qu'aucun test ne peut les
distinguer du code : le comportement observable est le même. Quand un code
plus simple faisait disparaître le mutant, le code a été simplifié plutôt que
le mutant listé ici.

| Source | Expression mutée | Pourquoi rien ne change |
|---|---|---|
| `warp.tsx` | `r < 1 / 3`, `r < 2 / 3` → `<=` (couche d'une étoile) | `r` est un flottant tiré au hasard : la borne exacte n'est jamais tirée |
| `warp.tsx` | `star.x < 0` → `<=` | idem, la position exacte 0 n'est jamais atteinte |
| `warp.tsx` | `sim.warp > 0.5` → `>=`, `sim.warp < 0.01` → `<=` | `warp` est lissé exponentiellement et ne tombe jamais pile sur la borne |
| `warp.tsx` | `bold`/`dim` d'une case vide `false` → `true` | le gras et l'atténué d'une espace ne se voient pas ; le rendu les fusionne |
| `chart.ts` | la jonction `┯` d'une carte ALERTE | « À VOUS » est toujours la dernière carte : aucune ne la suit |
| `summary.ts` | `i < last` → `<=` dans les restes de `takePending` | à `i = last`, l'entrée est celle que le tour prend, déjà écartée |
| `register.tsx` | `batch.some(change => change.plan)` et `stamped.length > 0` toujours vrais (ou `>=`) | gardes de performance : sans elles, une écriture identique de plus |
| `register.tsx` | `before.missions.length > 0` dans la reprise | garde de performance, même résultat |
| `register.tsx` | l'époque de remise à zéro `+ 1` → `- 1` | seule compte qu'elle diffère de la précédente |
| `register.tsx` | l'étiquette de journal `'écriture'` vidée | le kit de test ne peut pas faire échouer une écriture d'état |

Règles assouplies dans `eslint.config.mjs`, chacune justifiée en commentaire :
alias `type` plutôt qu'`interface`, nombres admis dans les gabarits,
`no-misused-promises` sans la vérification des arguments et attributs (le
moteur attend la promesse d'un hook et d'un `onPress` ; la vérification des
arguments prend plus de 4 minutes sur `register.tsx`).
