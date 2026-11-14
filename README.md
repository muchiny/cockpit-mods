# cockpit-mods

Deux mods [Claude Code](https://claude.com/claude-code) qui habillent une
session en cockpit spatial, avec leurs bancs qualité. Les libellés sont en
français, empruntés au vol spatial et à Star Citizen.

| Mod | Ce qu'il fait |
|---|---|
| [`status-band`](status-band/) | Cockpit au-dessus du prompt : étoiles animées, saut quantique pendant le travail, onze instruments (vaisseau, nav et git du projet travaillé, bouclier, carburant avec compte à rebours et rythme, chrono, systèmes, escadrille, crédits, soute, contrats, heure), compactés puis paginés selon la largeur. |
| [`plan-de-vol`](plan-de-vol/) | Panneau latéral : le logigramme de la session (prompts, étapes, pourquoi), ouvert par `/plan-de-vol [transparent\|gris]`, écrit en Markdown par `/plan-de-vol export [chemin]`. |

À savoir avant d'installer :

- L'API des mods de Claude Code est en accès anticipé et peut changer d'une
  version à l'autre. Les deux mods sont testés contre la version fixée dans
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`CLAUDE_CODE_VERSION`).
- `plan-de-vol` fait résumer les étapes par Haiku : ces appels sont comptés
  sur le compte de la personne qui l'utilise.
- `/plan-de-vol export` écrit le plan de vol en Markdown, pour une passation :
  l'objectif, puis chaque contrat avec son prompt, ses étapes et leur
  pourquoi, ce qui n'est pas encore résumé et ses escadrilles. Sans chemin, le
  fichier va dans `~/.claude/plan-de-vol/`, jamais dans le dossier de travail.
  Panneau fermé, rien n'est résumé : l'export donne alors le journal brut des
  derniers prompts.
- Tant que son panneau est affiché, une session garde une copie de son plan
  dans le store du mod (les 12 plus récentes sont gardées). À la reprise, le
  plan repart de cette copie, sans rien redemander à Haiku ; seuls les prompts
  tapés depuis sont relus dans le transcript.
- La jauge SOUTE de `status-band` lit `/proc/meminfo` : elle ne s'affiche que
  sous Linux et WSL.
- CARBURANT montre la fenêtre que le compte a (5 h, 7 j ou les deux), son
  compte à rebours, et dit si le rythme tenu depuis l'ouverture de la fenêtre
  mène jusqu'à la remise à zéro (`tient`) ou non (`à sec` dans tant de temps).
  C'est une extrapolation linéaire, muette pendant le premier vingtième de la
  fenêtre.
- CRÉDITS montre, sur un forfait à fenêtre hebdomadaire, la part de la semaine
  que la session a prise ; sans cette fenêtre (clé API), des dollars. La part
  est une estimation : le coût est propre à la session, le pourcentage est
  celui du compte entier, et c'est un registre tenu dans le store du mod,
  partagé entre les sessions de la machine, qui donne ce que vaut un dollar.
  Ce qui est dépensé ailleurs (autre machine, claude.ai) la gonfle, sans
  jamais dépasser ce que le compte entier a consommé.
- Les sessions de la machine se passent l'état des fenêtres par le store :
  CARBURANT est rempli dès le lancement, avant la première réponse, et une
  session au repos suit ce que lisent celles qui travaillent.
- NAV montre le dépôt du dossier de la session ; lancée hors de tout dépôt,
  celui du dernier fichier que Claude a lu ou écrit.

## Installer

Au prompt d'une session en terminal :

```
/plugin install status-band --marketplace muchiny/cockpit-mods
/plugin install plan-de-vol --marketplace muchiny/cockpit-mods
```

Depuis un shell :

```sh
claude plugin install status-band --marketplace muchiny/cockpit-mods
claude plugin install plan-de-vol --marketplace muchiny/cockpit-mods
```

Dans l'application de bureau, où `/plugin` ne tourne pas : « + » à côté de la
zone de saisie, Plugins, Add marketplace avec `muchiny/cockpit-mods`, puis Add
plugin.

Pour y travailler depuis un clone, charger les dossiers tels quels (rechargés à
chaud à chaque enregistrement) : `claude --plugin-dir <clone>/status-band`, ou
`CLAUDE_CODE_PLUGIN_DIRS` dans le bloc `env` de `~/.claude/settings.json`.

## Organisation du dépôt

```
.claude-plugin/marketplace.json   les deux mods, installables depuis ce dépôt
status-band/                      le mod : hooks/ (module, surface, tests), types/
plan-de-vol/                      le mod : hooks/, tests/, types/
qa/                               bancs qualité, hors des dossiers des mods
├── package.json                  dépendances communes aux deux bancs
├── status-band/                  check.sh, coverage.mjs, mutation.mjs
└── plan-de-vol/                  lint.sh, coverage.mjs, golden.mjs, mutation.mjs
sonar-project.properties          périmètre de l'analyse SonarQube Cloud
```

Un dossier de mod est surveillé et rechargé à chaud par Claude Code : il ne
porte ni `node_modules` ni rapports, d'où les bancs à part dans `qa/`.

## Bancs qualité

```sh
cd qa && npm ci                   # une fois : dépendances des deux bancs

qa/status-band/check.sh           # tsc, ESLint, validation, tests, couverture 100 %

cd qa/plan-de-vol
./lint.sh                         # tsc strict + ESLint typé, 0 avertissement
npm test                          # claude plugin test
node golden.mjs --check           # dessins approuvés inchangés
node coverage.mjs                 # couverture 100 % sur les quatre axes
```

`tsc` et ESLint lisent les types du moteur (`<mod>/.claude-plugin/types/`),
que Claude Code écrit quand une session charge le mod : charger le mod une fois
avant de les lancer. Le mutation testing (`node mutation.mjs` dans chaque
banc) est à part, long, et prévu pour Linux : copies de travail sur disque,
dans chaque banc (`qa/plan-de-vol/work`, `qa/status-band/.mutation`),
8 Go de RAM libre exigés. Le détail du banc de plan-de-vol, ses
exclusions et ses mutants équivalents sont dans
[`qa/plan-de-vol/README.md`](qa/plan-de-vol/README.md).

## CI et SonarQube

À chaque push et pull request, [`ci.yml`](.github/workflows/ci.yml) valide le
marketplace et les deux mods, joue leurs tests, vérifie les dessins approuvés
et exige 100 % de couverture, puis envoie les sources et les deux rapports
lcov à SonarQube Cloud (projet `muchiny_cockpit-mods`). Ni la validation ni
les tests ne demandent de compte Claude ; `tsc` et ESLint restent des portes
locales, faute de types du moteur en CI.

## Licence

[MIT](LICENSE).
