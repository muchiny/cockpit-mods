# cockpit-mods

Deux mods [Claude Code](https://claude.com/claude-code) qui habillent une
session en cockpit spatial, avec leurs bancs qualité. Les libellés sont en
français, empruntés au vol spatial et à Star Citizen.

| Mod | Ce qu'il fait |
|---|---|
| [`status-band`](status-band/) | Cockpit au-dessus du prompt : étoiles animées, saut quantique pendant le travail, onze instruments (vaisseau, nav et git, bouclier, carburant 5 h/7 j, chrono, systèmes, escadrille, crédits, soute, contrats, heure), compactés puis paginés selon la largeur. |
| [`plan-de-vol`](plan-de-vol/) | Panneau latéral : le logigramme de la session (prompts, étapes, pourquoi), ouvert par `/plan-de-vol [transparent\|gris]`. |

À savoir avant d'installer :

- L'API des mods de Claude Code est en accès anticipé et peut changer d'une
  version à l'autre. Les deux mods sont testés contre la version fixée dans
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`CLAUDE_CODE_VERSION`).
- `plan-de-vol` fait résumer les étapes par Haiku : ces appels sont comptés
  sur le compte de la personne qui l'utilise.
- La jauge SOUTE de `status-band` lit `/proc/meminfo` : elle ne s'affiche que
  sous Linux et WSL.

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
banc) est à part, long, et prévu pour Linux : copies de travail dans
`/var/tmp`, 8 Go de RAM libre exigés. Le détail du banc de plan-de-vol, ses
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
