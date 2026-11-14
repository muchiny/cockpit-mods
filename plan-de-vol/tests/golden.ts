// Généré par qa/plan-de-vol/golden.mjs (npm run golden) : ne pas
// modifier à la main. Chaque scène de tests/scenes.ts, le dessin en clair puis
// chaque segment et son style.

export const GOLDEN: Record<string, string> = {
  'panneau · au démarrage': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"idle","missions":0,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" italic=true> "—"
    <Text backgroundColor="#121212"> "                                                       "
  <Text> " "
  <Text> " "
  <Text color="text" italic=true> "  En attente du premier contrat"`,
  'panneau · une mission résumée qui attend la personne': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"waiting","missions":1,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" weight="semibold"> "Logigramme de session"
    <Text backgroundColor="#121212"> "                                   "
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="text" backgroundColor="#121212"> " "
    <Text color="warning" backgroundColor="#121212" weight="semibold"> "◉"
    <Text backgroundColor="#121212"> "                                                                 "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=68>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold"> "P1"
        <Text> "    "
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="suggestion" weight="semibold"> " P1 · Faire le mod                                                  "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "« fais un mod »"
      <Text backgroundColor="#121212"> "                                                    "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "╭"
      <Text color="success" backgroundColor="#1c1c1c"> "──────────────────────────────────────────────────────────────╮"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "│ "
      <Text color="success" backgroundColor="#1c1c1c" weight="semibold"> "✓ "
      <Text color="text" backgroundColor="#1c1c1c" weight="semibold"> "Lu register.tsx"
      <Text backgroundColor="#1c1c1c"> "                                           "
      <Text color="success" backgroundColor="#1c1c1c"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "│ "
      <Text backgroundColor="#1c1c1c"> "  "
      <Text color="text" backgroundColor="#1c1c1c"> "pour comprendre le câblage"
      <Text backgroundColor="#1c1c1c"> "                                "
      <Text color="success" backgroundColor="#1c1c1c"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "╰───────────────────────────────┬──────────────────────────────╯"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┏━ "
      <Text color="warning" backgroundColor="#262626" weight="semibold"> "À VOUS"
      <Text color="warning" backgroundColor="#262626"> " "
      <Text color="warning" backgroundColor="#262626"> "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┃ "
      <Text color="warning" backgroundColor="#262626" weight="semibold"> "◆ "
      <Text color="text" backgroundColor="#262626" weight="semibold"> "Valide la maquette"
      <Text backgroundColor="#262626"> "                                        "
      <Text color="warning" backgroundColor="#262626"> " ┃"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"`,
  'panneau · une ancienne mission choisie, la personne attendue sur la dernière': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"waiting","missions":3,"glass":"#eeeeee"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#eeeeee"> " "
    <Text color="suggestion" backgroundColor="#eeeeee" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#eeeeee" weight="semibold"> "Logigramme de session"
    <Text backgroundColor="#eeeeee"> "               "
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#eeeeee"> " "
    <Text color="text" backgroundColor="#eeeeee"> " "
    <Text color="success" backgroundColor="#eeeeee" weight="semibold"> "◉"
    <Text color="success" backgroundColor="#eeeeee" weight="semibold"> "━━━━━"
    <Text color="success" backgroundColor="#eeeeee" weight="semibold"> "●"
    <Text color="success" backgroundColor="#eeeeee" weight="semibold"> "━━━━━"
    <Text color="warning" backgroundColor="#eeeeee" weight="semibold"> "◆"
    <Text backgroundColor="#eeeeee"> "                                 "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#eeeeee" width=48>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold"> "P1"
        <Text> "    "
      <Box key="stop-1" flexDirection="row">
        <Button key="station-1" label="P2" plain=true>
          <Text color="text" weight="semibold"> "P2"
        <Text> "    "
      <Box key="stop-2" flexDirection="row">
        <Button key="station-2" label="P3" plain=true>
          <Text color="text" weight="semibold"> "P3"
        <Text> "    "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#eeeeee" width=48>
      <Text> " "
      <Button key="prev" label="précédent" hotkey="q" plain=true>
      <Text> "   "
      <Button key="next" label="suivant" hotkey="d" plain=true>
      <Text> "   "
      <Button key="live" label="position" hotkey="z" plain=true>
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="subtle" weight="semibold"> " P1 · Faire le mod                     "
      <Text color="inverseText" backgroundColor="warning" weight="semibold"> " archive "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#eeeeee"> " "
      <Text color="text" backgroundColor="#eeeeee" italic=true> "« un »"
      <Text backgroundColor="#eeeeee"> "                                         "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#e4e4e4"> "╭"
      <Text color="success" backgroundColor="#e4e4e4"> "──────────────────────────────────────────╮"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#e4e4e4"> "│ "
      <Text color="success" backgroundColor="#e4e4e4" weight="semibold"> "✓ "
      <Text color="text" backgroundColor="#e4e4e4" weight="semibold"> "Lu register.tsx"
      <Text backgroundColor="#e4e4e4"> "                       "
      <Text color="success" backgroundColor="#e4e4e4"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#e4e4e4"> "│ "
      <Text backgroundColor="#e4e4e4"> "  "
      <Text color="text" backgroundColor="#e4e4e4"> "pour comprendre le câblage"
      <Text backgroundColor="#e4e4e4"> "            "
      <Text color="success" backgroundColor="#e4e4e4"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#e4e4e4"> "╰──────────────────────────────────────────╯"
  <Text color="warning" weight="semibold" wrap="truncate-end"> "  ◆ À vous sur P3 : Valide la maquette"`,
  'panneau · au travail, une flotte en vol': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"warp","missions":1,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" italic=true> "calcul de trajectoire…"
    <Text backgroundColor="#121212"> "                                  "
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="text" backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "◉"
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "╍╍►"
    <Text backgroundColor="#121212"> "                                                              "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=68>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold"> "P1"
        <Text> "    "
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="suggestion" weight="semibold"> " P1 · « lance la revue »                                            "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "« lance la revue »"
      <Text backgroundColor="#121212"> "                                                 "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "╔═ "
      <Text color="merged" backgroundColor="#1c1c1c" weight="semibold"> "ESCADRILLE · revue"
      <Text color="merged" backgroundColor="#1c1c1c"> " "
      <Text color="merged" backgroundColor="#1c1c1c"> "═════════════════════════════════════════╗"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "║ "
      <Text color="suggestion" backgroundColor="#1c1c1c" weight="semibold"> "⟳ 2 en vol"
      <Text backgroundColor="#1c1c1c"> "   "
      <Text color="success" backgroundColor="#1c1c1c" weight="semibold"> "✓ 0 au hangar"
      <Text backgroundColor="#1c1c1c"> "                                  "
      <Text color="merged" backgroundColor="#1c1c1c"> " ║"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "║ "
      <Text color="suggestion" backgroundColor="#1c1c1c" weight="semibold"> "◎ "
      <Text color="suggestion" backgroundColor="#1c1c1c" weight="semibold"> "◎ "
      <Text backgroundColor="#1c1c1c"> "                                                        "
      <Text color="merged" backgroundColor="#1c1c1c"> " ║"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "║ "
      <Text color="suggestion" backgroundColor="#1c1c1c" weight="semibold"> "⟳ "
      <Text color="text" backgroundColor="#1c1c1c"> "bugs"
      <Text backgroundColor="#1c1c1c"> "                                                      "
      <Text color="merged" backgroundColor="#1c1c1c"> " ║"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "║ "
      <Text color="suggestion" backgroundColor="#1c1c1c" weight="semibold"> "⟳ "
      <Text color="text" backgroundColor="#1c1c1c"> "perf"
      <Text backgroundColor="#1c1c1c"> "                                                      "
      <Text color="merged" backgroundColor="#1c1c1c"> " ║"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="merged" backgroundColor="#1c1c1c"> "╚═══════════════════════════════╤══════════════════════════════╝"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="subtle" backgroundColor="#121212"> "┌┄ "
      <Text color="subtle" backgroundColor="#121212" weight="semibold"> "JOURNAL"
      <Text color="subtle" backgroundColor="#121212"> " "
      <Text color="subtle" backgroundColor="#121212"> "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="subtle" backgroundColor="#121212"> "┆ "
      <Text color="text" backgroundColor="#121212"> "· Flotte : revue"
      <Text backgroundColor="#121212"> "                                            "
      <Text color="subtle" backgroundColor="#121212"> " ┆"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="subtle" backgroundColor="#121212"> "└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="suggestion" backgroundColor="#262626"> "╔═ "
      <Text color="suggestion" backgroundColor="#262626" weight="semibold"> "MANŒUVRE"
      <Text color="suggestion" backgroundColor="#262626"> " "
      <Text color="suggestion" backgroundColor="#262626"> "═══════════════════════════════════════════════════╗"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="suggestion" backgroundColor="#262626"> "║ "
      <Text color="suggestion" backgroundColor="#262626" weight="semibold"> "⟳ "
      <Text color="text" backgroundColor="#262626" weight="semibold"> "Flotte : revue"
      <Text backgroundColor="#262626"> "                                            "
      <Text color="suggestion" backgroundColor="#262626"> " ║"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="suggestion" backgroundColor="#262626"> "╚══════════════════════════════════════════════════════════════╝"`,
  'panneau · vscode, étroit, sans en-tête': `<Box flexDirection="column">
  <Text wrap="truncate-end">
    <Text> "  "
    <Text> " "
    <Text color="suggestion" weight="semibold" bold=true> "OBJECTIF ► "
    <Text color="text" italic=true> "calcul de trajectoire…"
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text> " "
    <Text color="text"> " "
    <Text color="success" weight="semibold" bold=true> "◉"
    <Text> "                   "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" width=22>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold" bold=true> "P1"
        <Text> "    "
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="suggestion" weight="semibold" bold=true> " P1 · « fais un mod » "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text> " "
      <Text color="text" italic=true> "« fais un mod »"
      <Text> "      "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text> " "
      <Text color="text" italic=true> "en attente du décoll…"`,
  'panneau · étroit, la navigation en flèches': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"idle","missions":3,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" italic=true> "calcul de trajectoire…"
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="text" backgroundColor="#121212"> " "
    <Text color="success" backgroundColor="#121212" weight="semibold"> "●"
    <Text color="success" backgroundColor="#121212" weight="semibold"> "━━━━━"
    <Text color="success" backgroundColor="#121212" weight="semibold"> "●"
    <Text color="success" backgroundColor="#121212" weight="semibold"> "━━━━━"
    <Text color="success" backgroundColor="#121212" weight="semibold"> "◉"
    <Text backgroundColor="#121212"> "             "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=28>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="text" weight="semibold"> "P1"
        <Text> "    "
      <Box key="stop-1" flexDirection="row">
        <Button key="station-1" label="P2" plain=true>
          <Text color="text" weight="semibold"> "P2"
        <Text> "    "
      <Box key="stop-2" flexDirection="row">
        <Button key="station-2" label="P3" plain=true>
          <Text color="suggestion" weight="semibold"> "P3"
        <Text> "    "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=28>
      <Text> " "
      <Button key="prev" label="◀" hotkey="q" plain=true>
      <Text> " "
      <Button key="next" label="▶" hotkey="d" plain=true>
      <Text> " "
      <Button key="live" label="position" hotkey="z" plain=true>
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="suggestion" weight="semibold"> " P3 · « trois »             "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "« trois »"
      <Text backgroundColor="#121212"> "                  "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "en attente du décollage…"
      <Text backgroundColor="#121212"> "   "`,
  'panneau · desktop, une longue question coupée, vue d’une ancienne mission': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"waiting","missions":2,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold" bold=true> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" italic=true> "calcul de trajectoire…"
    <Text backgroundColor="#121212"> "    "
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="text" backgroundColor="#121212"> " "
    <Text color="success" backgroundColor="#121212" weight="semibold" bold=true> "◉"
    <Text color="success" backgroundColor="#121212" weight="semibold" bold=true> "━━━━━"
    <Text color="warning" backgroundColor="#121212" weight="semibold" bold=true> "◆"
    <Text backgroundColor="#121212"> "                             "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=38>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold" bold=true> "P1"
        <Text> "    "
      <Box key="stop-1" flexDirection="row">
        <Button key="station-1" label="P2" plain=true>
          <Text color="text" weight="semibold" bold=true> "P2"
        <Text> "    "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=38>
      <Text> " "
      <Button key="prev" label="◀" hotkey="q" plain=true>
      <Text> " "
      <Button key="next" label="▶" hotkey="d" plain=true>
      <Text> " "
      <Button key="live" label="position" hotkey="z" plain=true>
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="subtle" weight="semibold" bold=true> " P1 · « un »                 "
      <Text color="inverseText" backgroundColor="warning" weight="semibold" bold=true> " archive "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "« un »"
      <Text backgroundColor="#121212"> "                               "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "en attente du décollage…"
      <Text backgroundColor="#121212"> "             "
  <Text color="warning" weight="semibold" wrap="truncate-end" bold=true> "  ◆ À vous sur P2 : Choisir entre la mi…"`,
  'panneau · court, seules les cartes récentes tiennent': `<Box flexDirection="column">
  <Client key="warp" module="hooks/warp.tsx" props={"mode":"waiting","missions":1,"glass":"#121212"} width="100%" height=3>
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="suggestion" backgroundColor="#121212" weight="semibold"> "OBJECTIF ► "
    <Text color="text" backgroundColor="#121212" weight="semibold"> "Logigramme de session"
    <Text backgroundColor="#121212"> "                                   "
  <Text> " "
  <Text wrap="truncate-end">
    <Text> "  "
    <Text backgroundColor="#121212"> " "
    <Text color="text" backgroundColor="#121212"> " "
    <Text color="warning" backgroundColor="#121212" weight="semibold"> "◉"
    <Text backgroundColor="#121212"> "                                                                 "
  <Box flexDirection="row">
    <Text> "  "
    <Box flexDirection="row" backgroundColor="#121212" width=68>
      <Text> " "
      <Box key="stop-0" flexDirection="row">
        <Button key="station-0" label="P1" plain=true>
          <Text color="suggestion" weight="semibold"> "P1"
        <Text> "    "
  <Text> " "
  <Box flexDirection="column">
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="inverseText" backgroundColor="suggestion" weight="semibold"> " P1 · Faire le mod                                                  "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "« beaucoup de travail »"
      <Text backgroundColor="#121212"> "                                            "
    <Text> " "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text backgroundColor="#121212"> " "
      <Text color="text" backgroundColor="#121212" italic=true> "┆ 6 étapes plus haut"
      <Text backgroundColor="#121212"> "                                           "
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="error" backgroundColor="#1c1c1c"> "╭"
      <Text color="error" backgroundColor="#1c1c1c"> "──────────────────────────────────────────────────────────────╮"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="error" backgroundColor="#1c1c1c"> "│ "
      <Text color="error" backgroundColor="#1c1c1c" weight="semibold"> "× "
      <Text color="text" backgroundColor="#1c1c1c" weight="semibold"> "Étape 7"
      <Text backgroundColor="#1c1c1c"> "                                                   "
      <Text color="error" backgroundColor="#1c1c1c"> " │"
      <Text color="warning" weight="semibold"> " ◀─╮"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="error" backgroundColor="#1c1c1c"> "│ "
      <Text backgroundColor="#1c1c1c"> "  "
      <Text color="text" backgroundColor="#1c1c1c"> "parce que"
      <Text backgroundColor="#1c1c1c"> "                                                 "
      <Text color="error" backgroundColor="#1c1c1c"> " │"
      <Text color="warning" weight="semibold"> "   │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="error" backgroundColor="#1c1c1c"> "╰───────────────────────────────┬──────────────────────────────╯"
      <Text color="warning" weight="semibold"> "   ⟲"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
      <Text> "                               "
      <Text color="warning" weight="semibold"> "   │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#1c1c1c"> "╭"
      <Text color="warning" backgroundColor="#1c1c1c"> "──────────────────────────────────────────────────────────────╮"
      <Text color="warning" weight="semibold"> "   │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#1c1c1c"> "│ "
      <Text color="warning" backgroundColor="#1c1c1c" weight="semibold"> "⟲ "
      <Text color="text" backgroundColor="#1c1c1c" weight="semibold"> "Étape 8 menée"
      <Text backgroundColor="#1c1c1c"> "                                             "
      <Text color="warning" backgroundColor="#1c1c1c"> " │"
      <Text color="warning" weight="semibold"> " ──╯"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#1c1c1c"> "╰───────────────────────────────┬──────────────────────────────╯"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "╭"
      <Text color="success" backgroundColor="#1c1c1c"> "──────────────────────────────────────────────────────────────╮"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "│ "
      <Text color="success" backgroundColor="#1c1c1c" weight="semibold"> "✓ "
      <Text color="text" backgroundColor="#1c1c1c" weight="semibold"> "Étape 9 menée menée"
      <Text backgroundColor="#1c1c1c"> "                                       "
      <Text color="success" backgroundColor="#1c1c1c"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "│ "
      <Text backgroundColor="#1c1c1c"> "  "
      <Text color="text" backgroundColor="#1c1c1c"> "parce que"
      <Text backgroundColor="#1c1c1c"> "                                                 "
      <Text color="success" backgroundColor="#1c1c1c"> " │"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="success" backgroundColor="#1c1c1c"> "╰───────────────────────────────┬──────────────────────────────╯"
    <Text wrap="truncate-end">
      <Text> "                                  "
      <Text color="suggestion" weight="semibold"> "▼"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┏━ "
      <Text color="warning" backgroundColor="#262626" weight="semibold"> "À VOUS"
      <Text color="warning" backgroundColor="#262626"> " "
      <Text color="warning" backgroundColor="#262626"> "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┃ "
      <Text color="warning" backgroundColor="#262626" weight="semibold"> "◆ "
      <Text color="text" backgroundColor="#262626" weight="semibold"> "Valide la maquette"
      <Text backgroundColor="#262626"> "                                        "
      <Text color="warning" backgroundColor="#262626"> " ┃"
    <Text wrap="truncate-end">
      <Text> "  "
      <Text color="warning" backgroundColor="#262626"> "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"`,
  'haiku · consignes': `Tu tiens le « plan de vol » d'une session de travail entre une personne et Claude (assistant de code) : un logigramme court de ce qui a été fait et pourquoi.
On te donne une mission (un prompt de la personne), les étapes déjà tracées, et le journal de ce qui s'est passé depuis. Tu ajoutes seulement les étapes nouvelles.
Format : {"objective": string, "title": string, "steps": [{"kind": "done"|"decision"|"fail"|"fix", "what": string, "why": string}], "waiting": string|null}
"steps" : 0 à 3 étapes NOUVELLES, dans l'ordre ; ne répète jamais une étape déjà tracée.
Règles d'écriture, en français, lisible d'un coup d'œil :
- "what" : ce qui a été fait, 40 caractères maximum ; regroupe les actions semblables (« Lu 4 fichiers du mod »), ne liste jamais chaque outil ;
- "why" : la raison de l'action (« pour … », « car … ») ou, pour un test ou une vérification, ce qu'il a donné ; 50 caractères maximum ;
- "kind" : done = action menée, decision = choix fait (par Claude ou par la personne), fail = échec réel, fix = correction de cet échec ;
- "fail" seulement pour une ligne marquée ÉCHEC ou une erreur que Claude rapporte explicitement ; n'invente jamais d'échec ; un "fix" suit toujours le "fail" qu'il corrige ;
- "title" : ce que la personne voulait avec ce prompt, 35 caractères maximum ;
- "objective" : le but global de toute la session, 45 caractères maximum ; garde l'objectif connu sauf si le but a clairement changé ;
- "waiting" : ce que la personne doit faire maintenant (répondre, valider, tester…) si Claude attend quelque chose d'elle à la fin du journal, sinon null.
Réponds UNIQUEMENT par un objet JSON, sans texte autour ni bloc de code.
══
Tu tiens le « plan de vol » d'une session de travail entre une personne et Claude (assistant de code) : un logigramme court de ce qui a été fait et pourquoi.
On te donne plusieurs missions numérotées (un prompt de la personne chacune), pour chacune les étapes déjà tracées et le journal de ce qui s'est passé depuis. Tu ajoutes seulement les étapes nouvelles.
Format : {"objective": string, "missions": [{"n": number, "title": string, "steps": [{"kind": "done"|"decision"|"fail"|"fix", "what": string, "why": string}], "waiting": string|null}]}
Une entrée par MISSION, "n" étant son numéro ; 0 à 4 étapes NOUVELLES chacune, jamais une étape déjà tracée ; "waiting" pour la dernière seulement, null pour les autres.
Règles d'écriture, en français, lisible d'un coup d'œil :
- "what" : ce qui a été fait, 40 caractères maximum ; regroupe les actions semblables (« Lu 4 fichiers du mod »), ne liste jamais chaque outil ;
- "why" : la raison de l'action (« pour … », « car … ») ou, pour un test ou une vérification, ce qu'il a donné ; 50 caractères maximum ;
- "kind" : done = action menée, decision = choix fait (par Claude ou par la personne), fail = échec réel, fix = correction de cet échec ;
- "fail" seulement pour une ligne marquée ÉCHEC ou une erreur que Claude rapporte explicitement ; n'invente jamais d'échec ; un "fix" suit toujours le "fail" qu'il corrige ;
- "title" : ce que la personne voulait avec ce prompt, 35 caractères maximum ;
- "objective" : le but global de toute la session, 45 caractères maximum ; garde l'objectif connu sauf si le but a clairement changé ;
- "waiting" : ce que la personne doit faire maintenant (répondre, valider, tester…) si Claude attend quelque chose d'elle à la fin du journal, sinon null.
Réponds UNIQUEMENT par un objet JSON, sans texte autour ni bloc de code.`,
  'haiku · incrément, premier prompt': `Objectif connu : aucun
Missions précédentes : aucune
=== MISSION P1 ===
PROMPT : fais un mod
Étapes déjà tracées :
aucune
Journal depuis :
CLAUDE : Je regarde
· Lu a.ts`,
  'haiku · incrément, passé, étapes repliées': `Objectif connu : Construire plan-de-vol
Missions précédentes : P3 Titre 2 ; P4 prompt ancien numéro 3 un peu long… ; P5 Titre 4 ; P6 prompt ancien numéro 5 un peu long… ; P7 Titre 6 ; P8 prompt ancien numéro 7 un peu long… ; P9 Titre 8 ; P10 prompt ancien numéro 9 un peu long…
=== MISSION P11 ===
PROMPT : Construis un logigramme de la session qui grandit au fil du temps, lisible d’un coup d’œil, avec ce qui a été fait, pourquoi, et sur quel prompt
Étapes déjà tracées :
(4 étapes plus anciennes)
- [done] Lu les hooks du mod — Comprendre le rendu du panneau
- [decision] Un seul panneau latéral — 
Journal depuis :
· Lu b.ts`,
  'haiku · incrément, étapes toutes repliées': `Objectif connu : Objectif
Missions précédentes : P1 Titre 0
=== MISSION P2 ===
PROMPT : suite
Étapes déjà tracées :
(2 étapes plus anciennes)
aucune
Journal depuis :
`,
  'haiku · lot de trois, un journal trop long': `Objectif connu : aucun

=== MISSION 1 ===
PROMPT : court
Étapes déjà tracées :
aucune
Journal depuis :
· Lu a.ts

=== MISSION 2 ===
PROMPT : long
Étapes déjà tracées :
- [fix] Bornes du pointeur corrigées — Rejoué au vert
- [fix] Nettoyage — 
Journal depuis :
…

· ligne 0040 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0041 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0042 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0043 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0044 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0045 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0046 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0047 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0048 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0049 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0050 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0051 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0052 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0053 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0054 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0055 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0056 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0057 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0058 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0059 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0060 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0061 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0062 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0063 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0064 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0065 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0066 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0067 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0068 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0069 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0070 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0071 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0072 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0073 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0074 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0075 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0076 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0077 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0078 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0079 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0080 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0081 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0082 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0083 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0084 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0085 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0086 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0087 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0088 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0089 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0090 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0091 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0092 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0093 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0094 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0095 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0096 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0097 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0098 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0099 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0100 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0101 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0102 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0103 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0104 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0105 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0106 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0107 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0108 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0109 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0110 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0111 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0112 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0113 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0114 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0115 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0116 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0117 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0118 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0119 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

=== MISSION 3 ===
PROMPT : muet
Étapes déjà tracées :
aucune
Journal depuis :
`,
  'haiku · lot d’un seul, au-delà du plancher': `Objectif connu : Objectif

=== MISSION 1 ===
PROMPT : seul
Étapes déjà tracées :
aucune
Journal depuis :
· ligne 0000 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0001 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0002 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0003 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0004 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0005 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0006 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0007 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0008 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0009 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0010 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0011 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0012 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0013 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0014 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0015 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0016 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0017 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0018 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
· ligne 0019 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
  'journal de bord · chaque nature d’étape, journal brut, escadrille, la personne attendue': `# Plan de vol — 2026-11-14 02:42

- Session : \`1c0ffee5-0a1b-4c2d-8e3f-5a6b7c8d9e0f\`
- Dossier : \`/home/pilote/projet\`
- Contrats : 2

## OBJECTIF

Construire plan-de-vol

## P1 · Logigramme de session

> Construis un logigramme de la session qui grandit au fil du temps, lisible d’un coup d’œil, avec ce qui a été fait, pourquoi, et sur quel prompt

- _Étapes plus anciennes, non gardées : 3_
- **Fait** : Lu les hooks du mod — Comprendre le rendu du panneau
- **Décision** : Un seul panneau latéral
- **Échec** : Tests du rendu étroit en échec sur trois cas — Le pointeur sortait du cadre quand le panneau rétrécissait
- **Correction** : Bornes du pointeur corrigées — Rejoué au vert
- **Correction** : Nettoyage

**ESCADRILLE « revue-ultracode »** : 1 en vol, 1 au hangar, 1 perdu, 1 en silence radio
- en vol : relecteur 0 (Lu chart.ts)

## P2 · « ajoute un export en Markdown »

> ajoute un export
> en Markdown

**JOURNAL** (pas encore résumé, 2 lignes) :

\`\`\`text
CLAUDE : Je regarde le rendu
· Lu chart.ts
\`\`\`

**À VOUS** : Valider la maquette
`,
  'journal de bord · au travail, sans objectif': `# Plan de vol — 2026-11-14 02:42

- Session : \`1c0ffee5-0a1b-4c2d-8e3f-5a6b7c8d9e0f\`
- Dossier : \`/home/pilote/projet\`
- Contrats : 1

## OBJECTIF

_Trajectoire non calculée._

## P1 · « fais un mod »

> fais un mod

**MANŒUVRE** : Edit chart.ts
`,
  'objectif · aucun prompt · sans verre': `   OBJECTIF ► —                                   
──
0: "  " | " " | "OBJECTIF ► " suggestion gras | "—" text italique | "                                   "`,
  'objectif · en analyse · sombre': `   OBJECTIF ► calcul de trajectoire…              
──
0: "  " | " " fond #121212 | "OBJECTIF ► " suggestion fond #121212 gras | "calcul de trajectoire…" text fond #121212 italique | "              " fond #121212`,
  'objectif · long, coupé · clair': `   OBJECTIF ► Construis un logigramme … 
──
0: "  " | " " fond #eeeeee | "OBJECTIF ► " suggestion fond #eeeeee gras | "Construis un logigramme …" text fond #eeeeee gras | " " fond #eeeeee`,
  'bandeau · en direct, titré': `   P5 · Logigramme de session                               
   « court »                                                
──
0: "  " | " P5 · Logigramme de session                               " inverseText fond suggestion gras
1: "  " | " " fond #121212 | "« court »" text fond #121212 italique | "                                                " fond #121212`,
  'bandeau · historique, prompt long': `   P2 · « Construis un logigr…  archive 
   « Construis un logigramme de la      
   session qui grandit au fil du …      
──
0: "  " | " P2 · « Construis un logigr… " inverseText fond subtle gras | " archive " inverseText fond warning gras
1: "  " | " " fond #eeeeee | "« Construis un logigramme de la" text fond #eeeeee italique | "      " fond #eeeeee
2: "  " | " " fond #eeeeee | "session qui grandit au fil du …" text fond #eeeeee italique | "      " fond #eeeeee`,
  'bandeau · deux lignes tout juste': `   P3 · « un prompt qui tien… 
   « un prompt qui tient sur  
   deux lignes exactement »   
──
0: "  " | " P3 · « un prompt qui tien… " inverseText fond suggestion gras
1: "  " | " " | "« un prompt qui tient sur" text italique | "  "
2: "  " | " " | "deux lignes exactement »" text italique | "   "`,
  'bandeau · deuxième ligne pleine, coupée': `   P4 · « aaaa bbbb cccc ddd… 
   « aaaa bbbb cccc dddd      
   eeee ffff gggg hhhh iiii…  
──
0: "  " | " P4 · « aaaa bbbb cccc ddd… " inverseText fond suggestion gras
1: "  " | " " | "« aaaa bbbb cccc dddd" text italique | "      "
2: "  " | " " | "eeee ffff gggg hhhh iiii…" text italique | "  "`,
  'bandeau · très étroit': `   P1 · T…  archive 
   « Construis un   
   logigramme de …  
──
0: "  " | " P1 · T… " inverseText fond subtle gras | " archive " inverseText fond warning gras
1: "  " | " " | "« Construis un" text italique | "   "
2: "  " | " " | "logigramme de …" text italique | "  "`,
  'route · trois prompts, le dernier au travail': `    ●━━━━━●━━━━━◉╍╍►                                        
──
0: "  " | " " fond #121212 | " " text fond #121212 | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "◉" suggestion fond #121212 gras | "╍╍►" suggestion fond #121212 gras | "                                        " fond #121212
──
P1#0 P2#1 P3#2 choisie`,
  'route · un ancien choisi, les récents repliés, question posée': `    ●━━━━━●━━━━━●━━━━━◉━━━━━● ┄         
──
0: "  " | " " fond #eeeeee | " " text fond #eeeeee | "●" success fond #eeeeee gras | "━━━━━" success fond #eeeeee gras | "●" success fond #eeeeee gras | "━━━━━" success fond #eeeeee gras | "●" success fond #eeeeee gras | "━━━━━" success fond #eeeeee gras | "◉" success fond #eeeeee gras | "━━━━━" success fond #eeeeee gras | "●" success fond #eeeeee gras | " ┄" text fond #eeeeee | "         " fond #eeeeee
──
P1#0 P2#1 P3#2 P4#3 choisie P5#4`,
  'route · fenêtre glissée des deux côtés': `   ┄●━━━━━●━━━━━●━━━━━◉━━━━━● ┄         
──
0: "  " | " " fond #121212 | "┄" text fond #121212 | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "◉" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | " ┄" text fond #121212 | "         " fond #121212
──
P6#5 P7#6 P8#7 P9#8 choisie P10#9`,
  'route · au repos, le dernier attend': `    ●━━━━━◉━━━━━●━━━━━●━━━━━◆                               
──
0: "  " | " " | " " text | "●" success gras | "━━━━━" success gras | "◉" success gras | "━━━━━" success gras | "●" success gras | "━━━━━" success gras | "●" success gras | "━━━━━" success gras | "◆" warning gras | "                               "
──
P1#0 P2#1 choisie P3#2 P4#3 P5#4`,
  'route · au repos, rien n’attend, le dernier choisi': `    ●━━━━━●━━━━━●━━━━━◉                                     
──
0: "  " | " " fond #121212 | " " text fond #121212 | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "●" success fond #121212 gras | "━━━━━" success fond #121212 gras | "◉" success fond #121212 gras | "                                     " fond #121212
──
P1#0 P2#1 P3#2 P4#3 choisie`,
  'route · un seul prompt': `    ◉   
──
0: "  " | " " | " " text | "◉" success gras | "   "
──
P1#0 choisie`,
  'logigramme · vide': `   en attente du décollage…                                 
──
0: "  " | " " fond #121212 | "en attente du décollage…" text fond #121212 italique | "                                 " fond #121212`,
  'logigramme · étapes, boucle échec → correction, en cours': `  ╭────────────────────────────────────────────────────╮
  │ ✓ Lu les hooks du mod                              │
  │   Comprendre le rendu du panneau                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ◇────────────────────────────────────────────────────◇
  │ ◆ Un seul panneau latéral                          │
  ◇──────────────────────────┬─────────────────────────◇
                             ▼
  ╭────────────────────────────────────────────────────╮
  │ × Tests du rendu étroit en échec sur trois cas     │ ◀─╮
  │   Le pointeur sortait du cadre quand le panneau    │   │
  │   rétrécissait                                     │   │
  ╰──────────────────────────┬─────────────────────────╯   ⟲
                             ▼                             │
  ╭────────────────────────────────────────────────────╮   │
  │ ⟲ Bornes du pointeur corrigées                     │ ──╯
  │   Rejoué au vert                                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ╭────────────────────────────────────────────────────╮
  │ ⟲ Nettoyage                                        │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ╔═ MANŒUVRE ═════════════════════════════════════════╗
  ║ ⟳ Bash · npm test                                  ║
  ╚════════════════════════════════════════════════════╝
──
0: "  " | "╭" success fond #1c1c1c | "────────────────────────────────────────────────────╮" success fond #1c1c1c
1: "  " | "│ " success fond #1c1c1c | "✓ " success fond #1c1c1c gras | "Lu les hooks du mod" text fond #1c1c1c gras | "                             " fond #1c1c1c | " │" success fond #1c1c1c
2: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "Comprendre le rendu du panneau" text fond #1c1c1c | "                  " fond #1c1c1c | " │" success fond #1c1c1c
3: "  " | "╰──────────────────────────┬─────────────────────────╯" success fond #1c1c1c
4: "                             " | "▼" suggestion gras
5: "  " | "◇" suggestion fond #1c1c1c | "────────────────────────────────────────────────────◇" suggestion fond #1c1c1c
6: "  " | "│ " suggestion fond #1c1c1c | "◆ " suggestion fond #1c1c1c gras | "Un seul panneau latéral" text fond #1c1c1c gras | "                         " fond #1c1c1c | " │" suggestion fond #1c1c1c
7: "  " | "◇──────────────────────────┬─────────────────────────◇" suggestion fond #1c1c1c
8: "                             " | "▼" suggestion gras
9: "  " | "╭" error fond #1c1c1c | "────────────────────────────────────────────────────╮" error fond #1c1c1c
10: "  " | "│ " error fond #1c1c1c | "× " error fond #1c1c1c gras | "Tests du rendu étroit en échec sur trois cas" text fond #1c1c1c gras | "    " fond #1c1c1c | " │" error fond #1c1c1c | " ◀─╮" warning gras
11: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "Le pointeur sortait du cadre quand le panneau" text fond #1c1c1c | "   " fond #1c1c1c | " │" error fond #1c1c1c | "   │" warning gras
12: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "rétrécissait" text fond #1c1c1c | "                                    " fond #1c1c1c | " │" error fond #1c1c1c | "   │" warning gras
13: "  " | "╰──────────────────────────┬─────────────────────────╯" error fond #1c1c1c | "   ⟲" warning gras
14: "                             " | "▼" suggestion gras | "                          " | "   │" warning gras
15: "  " | "╭" warning fond #1c1c1c | "────────────────────────────────────────────────────╮" warning fond #1c1c1c | "   │" warning gras
16: "  " | "│ " warning fond #1c1c1c | "⟲ " warning fond #1c1c1c gras | "Bornes du pointeur corrigées" text fond #1c1c1c gras | "                    " fond #1c1c1c | " │" warning fond #1c1c1c | " ──╯" warning gras
17: "  " | "│ " warning fond #1c1c1c | "  " fond #1c1c1c | "Rejoué au vert" text fond #1c1c1c | "                                  " fond #1c1c1c | " │" warning fond #1c1c1c
18: "  " | "╰──────────────────────────┬─────────────────────────╯" warning fond #1c1c1c
19: "                             " | "▼" suggestion gras
20: "  " | "╭" warning fond #1c1c1c | "────────────────────────────────────────────────────╮" warning fond #1c1c1c
21: "  " | "│ " warning fond #1c1c1c | "⟲ " warning fond #1c1c1c gras | "Nettoyage" text fond #1c1c1c gras | "                                       " fond #1c1c1c | " │" warning fond #1c1c1c
22: "  " | "╰──────────────────────────┬─────────────────────────╯" warning fond #1c1c1c
23: "                             " | "▼" suggestion gras
24: "  " | "╔═ " suggestion fond #262626 | "MANŒUVRE" suggestion fond #262626 gras | " " suggestion fond #262626 | "═════════════════════════════════════════╗" suggestion fond #262626
25: "  " | "║ " suggestion fond #262626 | "⟳ " suggestion fond #262626 gras | "Bash · npm test" text fond #262626 gras | "                                 " fond #262626 | " ║" suggestion fond #262626
26: "  " | "╚════════════════════════════════════════════════════╝" suggestion fond #262626`,
  'logigramme · étroit, sans gouttière · clair': `  ◇──────────────────────────◇
  │ ◆ Un seul panneau        │
  │   latéral                │
  ◇─────────────┬────────────◇
                ▼
  ╭──────────────────────────╮
  │ × Tests du rendu étroit  │
  │   en échec sur trois cas │
  │   Le pointeur sortait du │
  │   cadre quand le panneau │
  │   rétrécissait           │
  ╰─────────────┬────────────╯
                ▼
  ╭──────────────────────────╮
  │ ⟲ Bornes du pointeur     │
  │   corrigées              │
  │   Rejoué au vert         │
  ╰──────────────────────────╯
──
0: "  " | "◇" suggestion fond #e4e4e4 | "──────────────────────────◇" suggestion fond #e4e4e4
1: "  " | "│ " suggestion fond #e4e4e4 | "◆ " suggestion fond #e4e4e4 gras | "Un seul panneau" text fond #e4e4e4 gras | "       " fond #e4e4e4 | " │" suggestion fond #e4e4e4
2: "  " | "│ " suggestion fond #e4e4e4 | "  " fond #e4e4e4 | "latéral" text fond #e4e4e4 gras | "               " fond #e4e4e4 | " │" suggestion fond #e4e4e4
3: "  " | "◇─────────────┬────────────◇" suggestion fond #e4e4e4
4: "                " | "▼" suggestion gras
5: "  " | "╭" error fond #e4e4e4 | "──────────────────────────╮" error fond #e4e4e4
6: "  " | "│ " error fond #e4e4e4 | "× " error fond #e4e4e4 gras | "Tests du rendu étroit" text fond #e4e4e4 gras | " " fond #e4e4e4 | " │" error fond #e4e4e4
7: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "en échec sur trois cas" text fond #e4e4e4 gras | " │" error fond #e4e4e4
8: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "Le pointeur sortait du" text fond #e4e4e4 | " │" error fond #e4e4e4
9: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "cadre quand le panneau" text fond #e4e4e4 | " │" error fond #e4e4e4
10: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "rétrécissait" text fond #e4e4e4 | "          " fond #e4e4e4 | " │" error fond #e4e4e4
11: "  " | "╰─────────────┬────────────╯" error fond #e4e4e4
12: "                " | "▼" suggestion gras
13: "  " | "╭" warning fond #e4e4e4 | "──────────────────────────╮" warning fond #e4e4e4
14: "  " | "│ " warning fond #e4e4e4 | "⟲ " warning fond #e4e4e4 gras | "Bornes du pointeur" text fond #e4e4e4 gras | "    " fond #e4e4e4 | " │" warning fond #e4e4e4
15: "  " | "│ " warning fond #e4e4e4 | "  " fond #e4e4e4 | "corrigées" text fond #e4e4e4 gras | "             " fond #e4e4e4 | " │" warning fond #e4e4e4
16: "  " | "│ " warning fond #e4e4e4 | "  " fond #e4e4e4 | "Rejoué au vert" text fond #e4e4e4 | "        " fond #e4e4e4 | " │" warning fond #e4e4e4
17: "  " | "╰──────────────────────────╯" warning fond #e4e4e4`,
  'logigramme · replié, étapes plus haut · historique': `   ┆ 6 étapes plus haut                                 
  ╭────────────────────────────────────────────────────╮
  │ ⟲ Bornes du pointeur corrigées                     │
  │   Rejoué au vert                                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ╭────────────────────────────────────────────────────╮
  │ ⟲ Nettoyage                                        │
  ╰────────────────────────────────────────────────────╯
──
0: "  " | " " | "┆ 6 étapes plus haut" text italique | "                                 "
1: "  " | "╭" warning | "────────────────────────────────────────────────────╮" warning
2: "  " | "│ " warning | "⟲ " warning gras | "Bornes du pointeur corrigées" text gras | "                    " | " │" warning
3: "  " | "│ " warning | "  " | "Rejoué au vert" text | "                                  " | " │" warning
4: "  " | "╰──────────────────────────┬─────────────────────────╯" warning
5: "                             " | "▼" suggestion gras
6: "  " | "╭" warning | "────────────────────────────────────────────────────╮" warning
7: "  " | "│ " warning | "⟲ " warning gras | "Nettoyage" text gras | "                                       " | " │" warning
8: "  " | "╰────────────────────────────────────────────────────╯" warning`,
  'logigramme · journal long, résumé en cours, question': `  ┌┄ DÉBRIEFING ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
  ┆ ┄ 2 actions plus tôt                               ┆
  ┆ · Lu c.ts                                          ┆
  ┆ · Lu d.ts                                          ┆
  ┆ · Lu e.ts                                          ┆
  ┆ · Lu f.ts                                          ┆
  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                             ▼
  ┏━ À VOUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃ ◆ Garder le thème sombre ou suivre le terminal ?   ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
──
0: "  " | "┌┄ " subtle fond #121212 | "DÉBRIEFING" subtle fond #121212 gras | " " subtle fond #121212 | "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐" subtle fond #121212
1: "  " | "┆ " subtle fond #121212 | "┄ 2 actions plus tôt" text fond #121212 | "                              " fond #121212 | " ┆" subtle fond #121212
2: "  " | "┆ " subtle fond #121212 | "· Lu c.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
3: "  " | "┆ " subtle fond #121212 | "· Lu d.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
4: "  " | "┆ " subtle fond #121212 | "· Lu e.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
5: "  " | "┆ " subtle fond #121212 | "· Lu f.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
6: "  " | "└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘" subtle fond #121212
7: "                             " | "▼" suggestion gras
8: "  " | "┏━ " warning fond #262626 | "À VOUS" warning fond #262626 gras | " " warning fond #262626 | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" warning fond #262626
9: "  " | "┃ " warning fond #262626 | "◆ " warning fond #262626 gras | "Garder le thème sombre ou suivre le terminal ?" text fond #262626 gras | "  " fond #262626 | " ┃" warning fond #262626
10: "  " | "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" warning fond #262626`,
  'logigramme · journal court · historique, clair': `  ┌┄ JOURNAL ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
  ┆ · Lu a.ts                                          ┆
  ┆ · Grep « route »                                   ┆
  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
──
0: "  " | "┌┄ " subtle fond #eeeeee | "JOURNAL" subtle fond #eeeeee gras | " " subtle fond #eeeeee | "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐" subtle fond #eeeeee
1: "  " | "┆ " subtle fond #eeeeee | "· Lu a.ts" text fond #eeeeee | "                                         " fond #eeeeee | " ┆" subtle fond #eeeeee
2: "  " | "┆ " subtle fond #eeeeee | "· Grep « route »" text fond #eeeeee | "                                  " fond #eeeeee | " ┆" subtle fond #eeeeee
3: "  " | "└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘" subtle fond #eeeeee`,
  'logigramme · en attente après le résumé': `  ╭────────────────────────────────────────────────────╮
  │ ✓ Lu les hooks du mod                              │
  │   Comprendre le rendu du panneau                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ┏━ À VOUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃ ◆ Choisir entre deux mises en page                 ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
──
0: "  " | "╭" success fond #1c1c1c | "────────────────────────────────────────────────────╮" success fond #1c1c1c
1: "  " | "│ " success fond #1c1c1c | "✓ " success fond #1c1c1c gras | "Lu les hooks du mod" text fond #1c1c1c gras | "                             " fond #1c1c1c | " │" success fond #1c1c1c
2: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "Comprendre le rendu du panneau" text fond #1c1c1c | "                  " fond #1c1c1c | " │" success fond #1c1c1c
3: "  " | "╰──────────────────────────┬─────────────────────────╯" success fond #1c1c1c
4: "                             " | "▼" suggestion gras
5: "  " | "┏━ " warning fond #262626 | "À VOUS" warning fond #262626 gras | " " warning fond #262626 | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" warning fond #262626
6: "  " | "┃ " warning fond #262626 | "◆ " warning fond #262626 gras | "Choisir entre deux mises en page" text fond #262626 gras | "                " fond #262626 | " ┃" warning fond #262626
7: "  " | "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" warning fond #262626`,
  'logigramme · en cours sans action': `  ╔═ MANŒUVRE ═════════════════════════════════════════╗
  ║ ⟳ Réfléchit                                        ║
  ╚════════════════════════════════════════════════════╝
──
0: "  " | "╔═ " suggestion | "MANŒUVRE" suggestion gras | " " suggestion | "═════════════════════════════════════════╗" suggestion
1: "  " | "║ " suggestion | "⟳ " suggestion gras | "Réfléchit" text gras | "                                       " | " ║" suggestion
2: "  " | "╚════════════════════════════════════════════════════╝" suggestion`,
  'logigramme · flotte nombreuse, étroite': `  ╔═ ESCADRILLE · revue-u… ══╗
  ║ ⟳ 3 en vol               ║
  ║ ✓ 30 au hangar           ║
  ║ × 5 perdus               ║
  ║ ○ 2 en silence radio     ║
  ║ ● ● ● ● ● ● ● ● ● ● ● ●  ║
  ║ ● ● ● ● ● ● ● ● ● ● ● ●  ║
  ║ ● ● ● ● ● ● × × × × × ◎  ║
  ║ + 4 drones               ║
  ║ ⟳ relecteur 35 · Lit ch… ║
  ║ ⟳ relecteur 36           ║
  ║ ⟳ relecteur 37 · Lance … ║
  ╚══════════════════════════╝
──
0: "  " | "╔═ " merged fond #1c1c1c | "ESCADRILLE · revue-u…" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "══╗" merged fond #1c1c1c
1: "  " | "║ " merged fond #1c1c1c | "⟳ 3 en vol" suggestion fond #1c1c1c gras | "              " fond #1c1c1c | " ║" merged fond #1c1c1c
2: "  " | "║ " merged fond #1c1c1c | "✓ 30 au hangar" success fond #1c1c1c gras | "          " fond #1c1c1c | " ║" merged fond #1c1c1c
3: "  " | "║ " merged fond #1c1c1c | "× 5 perdus" error fond #1c1c1c gras | "              " fond #1c1c1c | " ║" merged fond #1c1c1c
4: "  " | "║ " merged fond #1c1c1c | "○ 2 en silence radio" text fond #1c1c1c | "    " fond #1c1c1c | " ║" merged fond #1c1c1c
5: "  " | "║ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " ║" merged fond #1c1c1c
6: "  " | "║ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " ║" merged fond #1c1c1c
7: "  " | "║ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "× " error fond #1c1c1c gras | "× " error fond #1c1c1c gras | "× " error fond #1c1c1c gras | "× " error fond #1c1c1c gras | "× " error fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | " ║" merged fond #1c1c1c
8: "  " | "║ " merged fond #1c1c1c | "+ 4 drones" text fond #1c1c1c | "              " fond #1c1c1c | " ║" merged fond #1c1c1c
9: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 35 · Lit ch…" text fond #1c1c1c | " ║" merged fond #1c1c1c
10: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 36" text fond #1c1c1c | "          " fond #1c1c1c | " ║" merged fond #1c1c1c
11: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 37 · Lance …" text fond #1c1c1c | " ║" merged fond #1c1c1c
12: "  " | "╚══════════════════════════╝" merged fond #1c1c1c`,
  'logigramme · flotte rentrée · clair': `  ╭─ ESCADRILLE · relecture ───────────────────────────╮
  │ ⟳ 0 en vol   ✓ 2 au hangar   × 1 perdu             │
  │ ● ● ×                                              │
  ╰────────────────────────────────────────────────────╯
──
0: "  " | "╭─ " merged fond #e4e4e4 | "ESCADRILLE · relecture" merged fond #e4e4e4 gras | " " merged fond #e4e4e4 | "───────────────────────────╮" merged fond #e4e4e4
1: "  " | "│ " merged fond #e4e4e4 | "⟳ 0 en vol" subtle fond #e4e4e4 gras | "   " fond #e4e4e4 | "✓ 2 au hangar" success fond #e4e4e4 gras | "   " fond #e4e4e4 | "× 1 perdu" error fond #e4e4e4 gras | "            " fond #e4e4e4 | " │" merged fond #e4e4e4
2: "  " | "│ " merged fond #e4e4e4 | "● " success fond #e4e4e4 gras | "● " success fond #e4e4e4 gras | "× " error fond #e4e4e4 gras | "                                            " fond #e4e4e4 | " │" merged fond #e4e4e4
3: "  " | "╰────────────────────────────────────────────────────╯" merged fond #e4e4e4`,
  'logigramme · flotte, minuscule': `  ╭─ ESCADRILLE… ╮
  │ ⟳ 0 en vol   │
  │ ✓ 1 au hang… │
  │ ○ 2 en sile… │
  │ ○ ○ ●        │
  ╰──────────────╯
──
0: "  " | "╭─ " merged fond #1c1c1c | "ESCADRILLE…" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "╮" merged fond #1c1c1c
1: "  " | "│ " merged fond #1c1c1c | "⟳ 0 en vol" subtle fond #1c1c1c gras | "  " fond #1c1c1c | " │" merged fond #1c1c1c
2: "  " | "│ " merged fond #1c1c1c | "✓ 1 au hang…" success fond #1c1c1c gras | " │" merged fond #1c1c1c
3: "  " | "│ " merged fond #1c1c1c | "○ 2 en sile…" text fond #1c1c1c | " │" merged fond #1c1c1c
4: "  " | "│ " merged fond #1c1c1c | "○ " text fond #1c1c1c | "○ " text fond #1c1c1c | "● " success fond #1c1c1c gras | "      " fond #1c1c1c | " │" merged fond #1c1c1c
5: "  " | "╰──────────────╯" merged fond #1c1c1c`,
  'logigramme · trop court : la plus récente, seule': `   ┆ 4 étapes plus haut                                 
  ╭────────────────────────────────────────────────────╮
  │ ⟲ Nettoyage                                        │
  ╰────────────────────────────────────────────────────╯
──
0: "  " | " " fond #121212 | "┆ 4 étapes plus haut" text fond #121212 italique | "                                 " fond #121212
1: "  " | "╭" warning fond #1c1c1c | "────────────────────────────────────────────────────╮" warning fond #1c1c1c
2: "  " | "│ " warning fond #1c1c1c | "⟲ " warning fond #1c1c1c gras | "Nettoyage" text fond #1c1c1c gras | "                                       " fond #1c1c1c | " │" warning fond #1c1c1c
3: "  " | "╰────────────────────────────────────────────────────╯" warning fond #1c1c1c`,
  'logigramme · à la ligne près : tout tient, sans repli': `  ╭────────────────────────────────────────────────────╮
  │ ✓ Lu les hooks du mod                              │
  │   Comprendre le rendu du panneau                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ◇────────────────────────────────────────────────────◇
  │ ◆ Un seul panneau latéral                          │
  ◇────────────────────────────────────────────────────◇
──
0: "  " | "╭" success fond #1c1c1c | "────────────────────────────────────────────────────╮" success fond #1c1c1c
1: "  " | "│ " success fond #1c1c1c | "✓ " success fond #1c1c1c gras | "Lu les hooks du mod" text fond #1c1c1c gras | "                             " fond #1c1c1c | " │" success fond #1c1c1c
2: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "Comprendre le rendu du panneau" text fond #1c1c1c | "                  " fond #1c1c1c | " │" success fond #1c1c1c
3: "  " | "╰──────────────────────────┬─────────────────────────╯" success fond #1c1c1c
4: "                             " | "▼" suggestion gras
5: "  " | "◇" suggestion fond #1c1c1c | "────────────────────────────────────────────────────◇" suggestion fond #1c1c1c
6: "  " | "│ " suggestion fond #1c1c1c | "◆ " suggestion fond #1c1c1c gras | "Un seul panneau latéral" text fond #1c1c1c gras | "                         " fond #1c1c1c | " │" suggestion fond #1c1c1c
7: "  " | "◇────────────────────────────────────────────────────◇" suggestion fond #1c1c1c`,
  'logigramme · à la ligne près : une de moins, repliée': `   ┆ 1 étape plus haut                                  
  ◇────────────────────────────────────────────────────◇
  │ ◆ Un seul panneau latéral                          │
  ◇────────────────────────────────────────────────────◇
──
0: "  " | " " fond #121212 | "┆ 1 étape plus haut" text fond #121212 italique | "                                  " fond #121212
1: "  " | "◇" suggestion fond #1c1c1c | "────────────────────────────────────────────────────◇" suggestion fond #1c1c1c
2: "  " | "│ " suggestion fond #1c1c1c | "◆ " suggestion fond #1c1c1c gras | "Un seul panneau latéral" text fond #1c1c1c gras | "                         " fond #1c1c1c | " │" suggestion fond #1c1c1c
3: "  " | "◇────────────────────────────────────────────────────◇" suggestion fond #1c1c1c`,
  'logigramme · clair, chaque carte, en cours': `  ╭────────────────────────────────────────────────────╮
  │ ✓ Lu les hooks du mod                              │
  │   Comprendre le rendu du panneau                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ◇────────────────────────────────────────────────────◇
  │ ◆ Un seul panneau latéral                          │
  ◇──────────────────────────┬─────────────────────────◇
                             ▼
  ╭────────────────────────────────────────────────────╮
  │ × Tests du rendu étroit en échec sur trois cas     │ ◀─╮
  │   Le pointeur sortait du cadre quand le panneau    │   │
  │   rétrécissait                                     │   │
  ╰──────────────────────────┬─────────────────────────╯   ⟲
                             ▼                             │
  ╭────────────────────────────────────────────────────╮   │
  │ ⟲ Bornes du pointeur corrigées                     │ ──╯
  │   Rejoué au vert                                   │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ╭────────────────────────────────────────────────────╮
  │ ⟲ Nettoyage                                        │
  ╰──────────────────────────┬─────────────────────────╯
                             ▼
  ╔═ MANŒUVRE ═════════════════════════════════════════╗
  ║ ⟳ Edit chart.ts                                    ║
  ╚════════════════════════════════════════════════════╝
──
0: "  " | "╭" success fond #e4e4e4 | "────────────────────────────────────────────────────╮" success fond #e4e4e4
1: "  " | "│ " success fond #e4e4e4 | "✓ " success fond #e4e4e4 gras | "Lu les hooks du mod" text fond #e4e4e4 gras | "                             " fond #e4e4e4 | " │" success fond #e4e4e4
2: "  " | "│ " success fond #e4e4e4 | "  " fond #e4e4e4 | "Comprendre le rendu du panneau" text fond #e4e4e4 | "                  " fond #e4e4e4 | " │" success fond #e4e4e4
3: "  " | "╰──────────────────────────┬─────────────────────────╯" success fond #e4e4e4
4: "                             " | "▼" suggestion gras
5: "  " | "◇" suggestion fond #e4e4e4 | "────────────────────────────────────────────────────◇" suggestion fond #e4e4e4
6: "  " | "│ " suggestion fond #e4e4e4 | "◆ " suggestion fond #e4e4e4 gras | "Un seul panneau latéral" text fond #e4e4e4 gras | "                         " fond #e4e4e4 | " │" suggestion fond #e4e4e4
7: "  " | "◇──────────────────────────┬─────────────────────────◇" suggestion fond #e4e4e4
8: "                             " | "▼" suggestion gras
9: "  " | "╭" error fond #e4e4e4 | "────────────────────────────────────────────────────╮" error fond #e4e4e4
10: "  " | "│ " error fond #e4e4e4 | "× " error fond #e4e4e4 gras | "Tests du rendu étroit en échec sur trois cas" text fond #e4e4e4 gras | "    " fond #e4e4e4 | " │" error fond #e4e4e4 | " ◀─╮" warning gras
11: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "Le pointeur sortait du cadre quand le panneau" text fond #e4e4e4 | "   " fond #e4e4e4 | " │" error fond #e4e4e4 | "   │" warning gras
12: "  " | "│ " error fond #e4e4e4 | "  " fond #e4e4e4 | "rétrécissait" text fond #e4e4e4 | "                                    " fond #e4e4e4 | " │" error fond #e4e4e4 | "   │" warning gras
13: "  " | "╰──────────────────────────┬─────────────────────────╯" error fond #e4e4e4 | "   ⟲" warning gras
14: "                             " | "▼" suggestion gras | "                          " | "   │" warning gras
15: "  " | "╭" warning fond #e4e4e4 | "────────────────────────────────────────────────────╮" warning fond #e4e4e4 | "   │" warning gras
16: "  " | "│ " warning fond #e4e4e4 | "⟲ " warning fond #e4e4e4 gras | "Bornes du pointeur corrigées" text fond #e4e4e4 gras | "                    " fond #e4e4e4 | " │" warning fond #e4e4e4 | " ──╯" warning gras
17: "  " | "│ " warning fond #e4e4e4 | "  " fond #e4e4e4 | "Rejoué au vert" text fond #e4e4e4 | "                                  " fond #e4e4e4 | " │" warning fond #e4e4e4
18: "  " | "╰──────────────────────────┬─────────────────────────╯" warning fond #e4e4e4
19: "                             " | "▼" suggestion gras
20: "  " | "╭" warning fond #e4e4e4 | "────────────────────────────────────────────────────╮" warning fond #e4e4e4
21: "  " | "│ " warning fond #e4e4e4 | "⟲ " warning fond #e4e4e4 gras | "Nettoyage" text fond #e4e4e4 gras | "                                       " fond #e4e4e4 | " │" warning fond #e4e4e4
22: "  " | "╰──────────────────────────┬─────────────────────────╯" warning fond #e4e4e4
23: "                             " | "▼" suggestion gras
24: "  " | "╔═ " suggestion fond #dadada | "MANŒUVRE" suggestion fond #dadada gras | " " suggestion fond #dadada | "═════════════════════════════════════════╗" suggestion fond #dadada
25: "  " | "║ " suggestion fond #dadada | "⟳ " suggestion fond #dadada gras | "Edit chart.ts" text fond #dadada gras | "                                   " fond #dadada | " ║" suggestion fond #dadada
26: "  " | "╚════════════════════════════════════════════════════╝" suggestion fond #dadada`,
  'logigramme · clair, à toi': `  ┏━ À VOUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃ ◆ Valider la maquette                              ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
──
0: "  " | "┏━ " warning fond #dadada | "À VOUS" warning fond #dadada gras | " " warning fond #dadada | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" warning fond #dadada
1: "  " | "┃ " warning fond #dadada | "◆ " warning fond #dadada gras | "Valider la maquette" text fond #dadada gras | "                             " fond #dadada | " ┃" warning fond #dadada
2: "  " | "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" warning fond #dadada`,
  'logigramme · historique pendant un tour': `  ╭────────────────────────────────────────────────────╮
  │ ✓ Lu les hooks du mod                              │
  │   Comprendre le rendu du panneau                   │
  ╰────────────────────────────────────────────────────╯
──
0: "  " | "╭" success fond #1c1c1c | "────────────────────────────────────────────────────╮" success fond #1c1c1c
1: "  " | "│ " success fond #1c1c1c | "✓ " success fond #1c1c1c gras | "Lu les hooks du mod" text fond #1c1c1c gras | "                             " fond #1c1c1c | " │" success fond #1c1c1c
2: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "Comprendre le rendu du panneau" text fond #1c1c1c | "                  " fond #1c1c1c | " │" success fond #1c1c1c
3: "  " | "╰────────────────────────────────────────────────────╯" success fond #1c1c1c`,
  'logigramme · quarante colonnes, la boucle tient': `  ╭────────────────────────────────╮
  │ × Tests du rendu étroit en     │ ◀─╮
  │   échec sur trois cas          │   │
  │   Le pointeur sortait du cadre │   │
  │   quand le panneau             │   │
  │   rétrécissait                 │   ⟲
  ╰────────────────┬───────────────╯   │
                   ▼                   │
  ╭────────────────────────────────╮   │
  │ ⟲ Bornes du pointeur corrigées │ ──╯
  │   Rejoué au vert               │
  ╰────────────────────────────────╯
──
0: "  " | "╭" error fond #1c1c1c | "────────────────────────────────╮" error fond #1c1c1c
1: "  " | "│ " error fond #1c1c1c | "× " error fond #1c1c1c gras | "Tests du rendu étroit en" text fond #1c1c1c gras | "    " fond #1c1c1c | " │" error fond #1c1c1c | " ◀─╮" warning gras
2: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "échec sur trois cas" text fond #1c1c1c gras | "         " fond #1c1c1c | " │" error fond #1c1c1c | "   │" warning gras
3: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "Le pointeur sortait du cadre" text fond #1c1c1c | " │" error fond #1c1c1c | "   │" warning gras
4: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "quand le panneau" text fond #1c1c1c | "            " fond #1c1c1c | " │" error fond #1c1c1c | "   │" warning gras
5: "  " | "│ " error fond #1c1c1c | "  " fond #1c1c1c | "rétrécissait" text fond #1c1c1c | "                " fond #1c1c1c | " │" error fond #1c1c1c | "   ⟲" warning gras
6: "  " | "╰────────────────┬───────────────╯" error fond #1c1c1c | "   │" warning gras
7: "                   " | "▼" suggestion gras | "                " | "   │" warning gras
8: "  " | "╭" warning fond #1c1c1c | "────────────────────────────────╮" warning fond #1c1c1c | "   │" warning gras
9: "  " | "│ " warning fond #1c1c1c | "⟲ " warning fond #1c1c1c gras | "Bornes du pointeur corrigées" text fond #1c1c1c gras | " │" warning fond #1c1c1c | " ──╯" warning gras
10: "  " | "│ " warning fond #1c1c1c | "  " fond #1c1c1c | "Rejoué au vert" text fond #1c1c1c | "              " fond #1c1c1c | " │" warning fond #1c1c1c
11: "  " | "╰────────────────────────────────╯" warning fond #1c1c1c`,
  'logigramme · compteurs de flotte pile à la largeur': `  ╔═ ESCADRILLE · pile ════════╗
  ║ ⟳ 2 en vol   ✓ 1 au hangar ║
  ║ ◎ ◎ ●                      ║
  ║ ⟳ relecteur 0              ║
  ║ ⟳ relecteur 1              ║
  ╚════════════════════════════╝
──
0: "  " | "╔═ " merged fond #1c1c1c | "ESCADRILLE · pile" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "════════╗" merged fond #1c1c1c
1: "  " | "║ " merged fond #1c1c1c | "⟳ 2 en vol" suggestion fond #1c1c1c gras | "   " fond #1c1c1c | "✓ 1 au hangar" success fond #1c1c1c gras | " ║" merged fond #1c1c1c
2: "  " | "║ " merged fond #1c1c1c | "◎ " suggestion fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | "● " success fond #1c1c1c gras | "                    " fond #1c1c1c | " ║" merged fond #1c1c1c
3: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 0" text fond #1c1c1c | "             " fond #1c1c1c | " ║" merged fond #1c1c1c
4: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 1" text fond #1c1c1c | "             " fond #1c1c1c | " ║" merged fond #1c1c1c
5: "  " | "╚════════════════════════════╝" merged fond #1c1c1c`,
  'logigramme · deux rangées pleines de drones': `  ╭─ ESCADRILLE · rangées ───╮
  │ ⟳ 0 en vol               │
  │ ✓ 24 au hangar           │
  │ ● ● ● ● ● ● ● ● ● ● ● ●  │
  │ ● ● ● ● ● ● ● ● ● ● ● ●  │
  ╰──────────────────────────╯
──
0: "  " | "╭─ " merged fond #1c1c1c | "ESCADRILLE · rangées" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "───╮" merged fond #1c1c1c
1: "  " | "│ " merged fond #1c1c1c | "⟳ 0 en vol" subtle fond #1c1c1c gras | "              " fond #1c1c1c | " │" merged fond #1c1c1c
2: "  " | "│ " merged fond #1c1c1c | "✓ 24 au hangar" success fond #1c1c1c gras | "          " fond #1c1c1c | " │" merged fond #1c1c1c
3: "  " | "│ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " │" merged fond #1c1c1c
4: "  " | "│ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " │" merged fond #1c1c1c
5: "  " | "╰──────────────────────────╯" merged fond #1c1c1c`,
  'logigramme · trois rangées pleines, aucun reste': `  ╭─ ESCADRILLE · pleines ───╮
  │ ⟳ 0 en vol               │
  │ ✓ 36 au hangar           │
  │ ● ● ● ● ● ● ● ● ● ● ● ●  │
  │ ● ● ● ● ● ● ● ● ● ● ● ●  │
  │ ● ● ● ● ● ● ● ● ● ● ● ●  │
  ╰──────────────────────────╯
──
0: "  " | "╭─ " merged fond #1c1c1c | "ESCADRILLE · pleines" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "───╮" merged fond #1c1c1c
1: "  " | "│ " merged fond #1c1c1c | "⟳ 0 en vol" subtle fond #1c1c1c gras | "              " fond #1c1c1c | " │" merged fond #1c1c1c
2: "  " | "│ " merged fond #1c1c1c | "✓ 36 au hangar" success fond #1c1c1c gras | "          " fond #1c1c1c | " │" merged fond #1c1c1c
3: "  " | "│ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " │" merged fond #1c1c1c
4: "  " | "│ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " │" merged fond #1c1c1c
5: "  " | "│ " merged fond #1c1c1c | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | "● " success fond #1c1c1c gras | " │" merged fond #1c1c1c
6: "  " | "╰──────────────────────────╯" merged fond #1c1c1c`,
  'logigramme · cinq drones en vol, les trois derniers nommés': `  ╔═ ESCADRILLE · cinq ════════════════════════════════╗
  ║ ⟳ 5 en vol   ✓ 0 au hangar                         ║
  ║ ◎ ◎ ◎ ◎ ◎                                          ║
  ║ ⟳ relecteur 2 · tâche 2                            ║
  ║ ⟳ relecteur 3 · tâche 3                            ║
  ║ ⟳ relecteur 4 · tâche 4                            ║
  ╚════════════════════════════════════════════════════╝
──
0: "  " | "╔═ " merged fond #1c1c1c | "ESCADRILLE · cinq" merged fond #1c1c1c gras | " " merged fond #1c1c1c | "════════════════════════════════╗" merged fond #1c1c1c
1: "  " | "║ " merged fond #1c1c1c | "⟳ 5 en vol" suggestion fond #1c1c1c gras | "   " fond #1c1c1c | "✓ 0 au hangar" success fond #1c1c1c gras | "                        " fond #1c1c1c | " ║" merged fond #1c1c1c
2: "  " | "║ " merged fond #1c1c1c | "◎ " suggestion fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | "◎ " suggestion fond #1c1c1c gras | "                                        " fond #1c1c1c | " ║" merged fond #1c1c1c
3: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 2 · tâche 2" text fond #1c1c1c | "                           " fond #1c1c1c | " ║" merged fond #1c1c1c
4: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 3 · tâche 3" text fond #1c1c1c | "                           " fond #1c1c1c | " ║" merged fond #1c1c1c
5: "  " | "║ " merged fond #1c1c1c | "⟳ " suggestion fond #1c1c1c gras | "relecteur 4 · tâche 4" text fond #1c1c1c | "                           " fond #1c1c1c | " ║" merged fond #1c1c1c
6: "  " | "╚════════════════════════════════════════════════════╝" merged fond #1c1c1c`,
  'logigramme · journal de quatre actions, une longue': `  ┌┄ JOURNAL ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
  ┆ · Lu a.ts                                          ┆
  ┆ · Bash · une commande bien trop longue pour tenir… ┆
  ┆ · Lu c.ts                                          ┆
  ┆ · Lu d.ts                                          ┆
  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
──
0: "  " | "┌┄ " subtle fond #121212 | "JOURNAL" subtle fond #121212 gras | " " subtle fond #121212 | "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐" subtle fond #121212
1: "  " | "┆ " subtle fond #121212 | "· Lu a.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
2: "  " | "┆ " subtle fond #121212 | "· Bash · une commande bien trop longue pour tenir…" text fond #121212 | " ┆" subtle fond #121212
3: "  " | "┆ " subtle fond #121212 | "· Lu c.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
4: "  " | "┆ " subtle fond #121212 | "· Lu d.ts" text fond #121212 | "                                         " fond #121212 | " ┆" subtle fond #121212
5: "  " | "└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘" subtle fond #121212`,
  'logigramme · minuscule': `  ╭──────────────╮
  │ ✓ Lu les     │
  │   hooks du   │
  │   mod        │
  │   Comprendre │
  │   le rendu   │
  │   du panneau │
  ╰───────┬──────╯
          ▼
  ◇──────────────◇
  │ ◆ Un seul    │
  │   panneau    │
  │   latéral    │
  ◇──────────────◇
──
0: "  " | "╭" success fond #1c1c1c | "──────────────╮" success fond #1c1c1c
1: "  " | "│ " success fond #1c1c1c | "✓ " success fond #1c1c1c gras | "Lu les" text fond #1c1c1c gras | "    " fond #1c1c1c | " │" success fond #1c1c1c
2: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "hooks du" text fond #1c1c1c gras | "  " fond #1c1c1c | " │" success fond #1c1c1c
3: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "mod" text fond #1c1c1c gras | "       " fond #1c1c1c | " │" success fond #1c1c1c
4: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "Comprendre" text fond #1c1c1c | " │" success fond #1c1c1c
5: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "le rendu" text fond #1c1c1c | "  " fond #1c1c1c | " │" success fond #1c1c1c
6: "  " | "│ " success fond #1c1c1c | "  " fond #1c1c1c | "du panneau" text fond #1c1c1c | " │" success fond #1c1c1c
7: "  " | "╰───────┬──────╯" success fond #1c1c1c
8: "          " | "▼" suggestion gras
9: "  " | "◇" suggestion fond #1c1c1c | "──────────────◇" suggestion fond #1c1c1c
10: "  " | "│ " suggestion fond #1c1c1c | "◆ " suggestion fond #1c1c1c gras | "Un seul" text fond #1c1c1c gras | "   " fond #1c1c1c | " │" suggestion fond #1c1c1c
11: "  " | "│ " suggestion fond #1c1c1c | "  " fond #1c1c1c | "panneau" text fond #1c1c1c gras | "   " fond #1c1c1c | " │" suggestion fond #1c1c1c
12: "  " | "│ " suggestion fond #1c1c1c | "  " fond #1c1c1c | "latéral" text fond #1c1c1c gras | "   " fond #1c1c1c | " │" suggestion fond #1c1c1c
13: "  " | "◇──────────────◇" suggestion fond #1c1c1c`,
  'warp · au repos': `*       *•      ╭─ PLAN DE VOL ───────────╮      •          
         · +    │ EN ORBITE  ·  1 contrat │*··              
    •   •     · ╰─────────────────────────╯·       •        
──
0: "*" text gras | "       " | "*" text gras | "•" subtle | "      " | "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "───────────╮" suggestion | "      " | "•" subtle | "          "
1: "         " | "·" inactive pâle | " " | "+" suggestion gras | "    " | "│" suggestion | " " | "EN" inactive gras | " " | "ORBITE" inactive gras | "  " | "·" text | "  " | "1" text | " " | "contrat" text | " " | "│" suggestion | "*" text gras | "··" inactive pâle | "              "
2: "    " | "•" subtle | "   " | "•" subtle | "     " | "·" inactive pâle | " " | "╰─────────────────────────╯" suggestion | "·" inactive pâle | "       " | "•" subtle | "        "
══
       *•       ╭─ PLAN DE VOL ───────────╮     •·         *
         · •    │ EN ORBITE  ·  1 contrat │ ··              
    •   •     · ╰─────────────────────────╯        +        
──
0: "       " | "*" text gras | "•" subtle | "       " | "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "───────────╮" suggestion | "     " | "•" subtle | "·" inactive pâle | "         " | "*" text gras
1: "         " | "·" inactive pâle | " " | "•" subtle | "    " | "│" suggestion | " " | "EN" inactive gras | " " | "ORBITE" inactive gras | "  " | "·" text | "  " | "1" text | " " | "contrat" text | " " | "│" suggestion | " " | "··" inactive pâle | "              "
2: "    " | "•" subtle | "   " | "•" subtle | "     " | "·" inactive pâle | " " | "╰─────────────────────────╯" suggestion | "        " | "+" suggestion gras | "        "
══
      * •       ╭─ PLAN DE VOL ───────────╮     •·        +*
         ·•     │ EN ORBITE  ·  1 contrat │ ··              
   •   •      · ╰─────────────────────────╯        •        
──
0: "      " | "*" text gras | " " | "•" subtle | "       " | "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "───────────╮" suggestion | "     " | "•" subtle | "·" inactive pâle | "        " | "+" suggestion gras | "*" text gras
1: "         " | "·" inactive pâle | "•" subtle | "     " | "│" suggestion | " " | "EN" inactive gras | " " | "ORBITE" inactive gras | "  " | "·" text | "  " | "1" text | " " | "contrat" text | " " | "│" suggestion | " " | "··" inactive pâle | "              "
2: "   " | "•" subtle | "   " | "•" subtle | "      " | "·" inactive pâle | " " | "╰─────────────────────────╯" suggestion | "        " | "•" subtle | "        "
══
*     •         ╭─ PLAN DE VOL ───────────╮   • ·    *      
        ·       │ EN ORBITE  ·  1 contrat │··               
 •   •       ·  ╰─────────────────────────╯     •           
──
0: "*" text gras | "     " | "•" subtle | "         " | "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "───────────╮" suggestion | "   " | "•" subtle | " " | "·" inactive pâle | "    " | "*" text gras | "      "
1: "        " | "·" inactive pâle | "       " | "│" suggestion | " " | "EN" inactive gras | " " | "ORBITE" inactive gras | "  " | "·" text | "  " | "1" text | " " | "contrat" text | " " | "│" suggestion | "··" inactive pâle | "               "
2: " " | "•" subtle | "   " | "•" subtle | "       " | "·" inactive pâle | "  " | "╰─────────────────────────╯" suggestion | "     " | "•" subtle | "           "`,
  'warp · en vol, sur verre sombre': `*       *•     ╭─ PLAN DE VOL ──────────────╮    •          
         · +   │ QUANTUM »    ·  3 contrats │·              
    •   •     ·╰────────────────────────────╯      •        
──
0: "*" text gras | "       " | "*" text gras | "•" subtle | "     " | "╭─" suggestion fond #0e121b | " " fond #0e121b | "PLAN" text fond #0e121b gras | " " fond #0e121b | "DE" text fond #0e121b gras | " " fond #0e121b | "VOL" text fond #0e121b gras | " " fond #0e121b | "──────────────╮" suggestion fond #0e121b | "    " | "•" subtle | "          "
1: "         " | "·" inactive pâle | " " | "+" suggestion gras | "   " | "│" suggestion fond #0e121b | " " fond #0e121b | "QUANTUM" suggestion fond #0e121b gras | " " fond #0e121b | "»" suggestion fond #0e121b gras | "    " fond #0e121b | "·" text fond #0e121b | "  " fond #0e121b | "3" text fond #0e121b | " " fond #0e121b | "contrats" text fond #0e121b | " " fond #0e121b | "│" suggestion fond #0e121b | "·" inactive pâle | "              "
2: "    " | "•" subtle | "   " | "•" subtle | "     " | "·" inactive pâle | "╰────────────────────────────╯" suggestion fond #0e121b | "      " | "•" subtle | "        "
══
     *─╌•╌     ╭─ PLAN DE VOL ──────────────╮  •╌·       *─╌
         ·•╌   │ QUANTUM »»   ·  3 contrats │·              
   •╌  •╌     ·╰────────────────────────────╯     +╌        
──
0: "     " | "*" text gras | "─" text | "╌" text pâle | "•" subtle | "╌" subtle pâle | "     " | "╭─" suggestion fond #0e121b | " " fond #0e121b | "PLAN" text fond #0e121b gras | " " fond #0e121b | "DE" text fond #0e121b gras | " " fond #0e121b | "VOL" text fond #0e121b gras | " " fond #0e121b | "──────────────╮" suggestion fond #0e121b | "  " | "•" subtle | "╌" subtle pâle | "·" inactive pâle | "       " | "*" text gras | "─" text | "╌" text pâle
1: "         " | "·" inactive pâle | "•" subtle | "╌" subtle pâle | "   " | "│" suggestion fond #0e121b | " " fond #0e121b | "QUANTUM" suggestion fond #0e121b gras | " " fond #0e121b | "»»" suggestion fond #0e121b gras | "   " fond #0e121b | "·" text fond #0e121b | "  " fond #0e121b | "3" text fond #0e121b | " " fond #0e121b | "contrats" text fond #0e121b | " " fond #0e121b | "│" suggestion fond #0e121b | "·" inactive pâle | "              "
2: "   " | "•" subtle | "╌" subtle pâle | "  " | "•" subtle | "╌" subtle pâle | "     " | "·" inactive pâle | "╰────────────────────────────╯" suggestion fond #0e121b | "     " | "+" suggestion gras | "╌" subtle pâle | "        "
══
 ──╌           ╭─ PLAN DE VOL ──────────────╮──╌╌╌  ━──╌╌╌  
   ──╌─╌      ─│ QUANTUM »»»  ·  3 contrats │               
──╌        ─╌  ╰────────────────────────────╯╌          ──╌ 
──
0: " " | "──" subtle | "╌" subtle pâle | "           " | "╭─" suggestion fond #0e121b | " " fond #0e121b | "PLAN" text fond #0e121b gras | " " fond #0e121b | "DE" text fond #0e121b gras | " " fond #0e121b | "VOL" text fond #0e121b gras | " " fond #0e121b | "──────────────╮" suggestion fond #0e121b | "──" text | "╌╌╌" text pâle | "  " | "━" text gras | "──" text | "╌╌╌" text pâle | "  "
1: "   " | "──" subtle | "╌" subtle pâle | "─" inactive | "╌" inactive pâle | "      " | "─" subtle | "│" suggestion fond #0e121b | " " fond #0e121b | "QUANTUM" suggestion fond #0e121b gras | " " fond #0e121b | "»»»" suggestion fond #0e121b gras | "  " fond #0e121b | "·" text fond #0e121b | "  " fond #0e121b | "3" text fond #0e121b | " " fond #0e121b | "contrats" text fond #0e121b | " " fond #0e121b | "│" suggestion fond #0e121b | "               "
2: "──" subtle | "╌" subtle pâle | "        " | "─" inactive | "╌" inactive pâle | "  " | "╰────────────────────────────╯" suggestion fond #0e121b | "╌" subtle pâle | "          " | "──" subtle | "╌" subtle pâle | " "
══
──╌╌     ─╌ ──╌╭─ PLAN DE VOL ──────────────╮ ━───╌╌╌╌───╌╌╌
 ─╌            │ QUANTUM »    ·  3 contrats │──╌╌    ─╌─╌╌  
 ──╌╌╌╌       ─╰────────────────────────────╯           ──╌╌
──
0: "──" subtle | "╌╌" subtle pâle | "     " | "─" inactive | "╌" inactive pâle | " " | "──" subtle | "╌" subtle pâle | "╭─" suggestion fond #0e121b | " " fond #0e121b | "PLAN" text fond #0e121b gras | " " fond #0e121b | "DE" text fond #0e121b gras | " " fond #0e121b | "VOL" text fond #0e121b gras | " " fond #0e121b | "──────────────╮" suggestion fond #0e121b | " " | "━" text gras | "───" text | "╌╌╌╌" text pâle | "───" text | "╌╌╌" text pâle
1: " " | "─" inactive | "╌" inactive pâle | "            " | "│" suggestion fond #0e121b | " " fond #0e121b | "QUANTUM" suggestion fond #0e121b gras | " " fond #0e121b | "»" suggestion fond #0e121b gras | "    " fond #0e121b | "·" text fond #0e121b | "  " fond #0e121b | "3" text fond #0e121b | " " fond #0e121b | "contrats" text fond #0e121b | " " fond #0e121b | "│" suggestion fond #0e121b | "──" subtle | "╌╌" subtle pâle | "    " | "─" inactive | "╌" inactive pâle | "─" subtle | "╌╌" subtle pâle | "  "
2: " " | "──" subtle | "╌╌╌╌" subtle pâle | "       " | "─" subtle | "╰────────────────────────────╯" suggestion fond #0e121b | "           " | "──" subtle | "╌╌" subtle pâle
══
     •╌         ╭─ PLAN DE VOL ────────────╮╌         •╌    
                │ EN ORBITE  ·  3 contrats │   •╌ ·       · 
        •╌╌╌─╌╌ ╰──────────────────────────╯      •╌   •╌•╌ 
──
0: "     " | "•" subtle | "╌" subtle pâle | "         " | "╭─" suggestion fond #0e121b | " " fond #0e121b | "PLAN" text fond #0e121b gras | " " fond #0e121b | "DE" text fond #0e121b gras | " " fond #0e121b | "VOL" text fond #0e121b gras | " " fond #0e121b | "────────────╮" suggestion fond #0e121b | "╌" text pâle | "         " | "•" subtle | "╌" subtle pâle | "    "
1: "                " | "│" suggestion fond #0e121b | " " fond #0e121b | "EN" inactive fond #0e121b gras | " " fond #0e121b | "ORBITE" inactive fond #0e121b gras | "  " fond #0e121b | "·" text fond #0e121b | "  " fond #0e121b | "3" text fond #0e121b | " " fond #0e121b | "contrats" text fond #0e121b | " " fond #0e121b | "│" suggestion fond #0e121b | "   " | "•" subtle | "╌" subtle pâle | " " | "·" inactive pâle | "       " | "·" inactive pâle | " "
2: "        " | "•" subtle | "╌" subtle pâle | "╌╌" text pâle | "─" text | "╌╌" text pâle | " " | "╰──────────────────────────╯" suggestion fond #0e121b | "      " | "•" subtle | "╌" subtle pâle | "   " | "•" subtle | "╌" subtle pâle | "•" subtle | "╌" subtle pâle | " "`,
  'warp · en attente, le cadre clignote': `*     *•  ╭─ PLAN DE VOL ──────────────╮•·        
        ·+│ ATTENTE ATC  ·  2 contrats │          
   •  •   ╰────────────────────────────╯   •      
──
0: "*" text gras | "     " | "*" text gras | "•" subtle | "  " | "╭─" warning fond #eef1f6 | " " fond #eef1f6 | "PLAN" text fond #eef1f6 gras | " " fond #eef1f6 | "DE" text fond #eef1f6 gras | " " fond #eef1f6 | "VOL" text fond #eef1f6 gras | " " fond #eef1f6 | "──────────────╮" warning fond #eef1f6 | "•" subtle | "·" inactive pâle | "        "
1: "        " | "·" inactive pâle | "+" suggestion gras | "│" warning fond #eef1f6 | " " fond #eef1f6 | "ATTENTE" warning fond #eef1f6 gras | " " fond #eef1f6 | "ATC" warning fond #eef1f6 gras | "  " fond #eef1f6 | "·" text fond #eef1f6 | "  " fond #eef1f6 | "2" text fond #eef1f6 | " " fond #eef1f6 | "contrats" text fond #eef1f6 | " " fond #eef1f6 | "│" warning fond #eef1f6 | "          "
2: "   " | "•" subtle | "  " | "•" subtle | "   " | "╰────────────────────────────╯" warning fond #eef1f6 | "   " | "•" subtle | "      "
══
     * •  ╭─ PLAN DE VOL ──────────────╮•·       *
       · •│ ATTENTE ATC  ·  2 contrats │          
   •  •   ╰────────────────────────────╯  •       
──
0: "     " | "*" text gras | " " | "•" subtle | "  " | "╭─" suggestion fond #eef1f6 | " " fond #eef1f6 | "PLAN" text fond #eef1f6 gras | " " fond #eef1f6 | "DE" text fond #eef1f6 gras | " " fond #eef1f6 | "VOL" text fond #eef1f6 gras | " " fond #eef1f6 | "──────────────╮" suggestion fond #eef1f6 | "•" subtle | "·" inactive pâle | "       " | "*" text gras
1: "       " | "·" inactive pâle | " " | "•" subtle | "│" suggestion fond #eef1f6 | " " fond #eef1f6 | "ATTENTE" warning fond #eef1f6 gras | " " fond #eef1f6 | "ATC" warning fond #eef1f6 gras | "  " fond #eef1f6 | "·" text fond #eef1f6 | "  " fond #eef1f6 | "2" text fond #eef1f6 | " " fond #eef1f6 | "contrats" text fond #eef1f6 | " " fond #eef1f6 | "│" suggestion fond #eef1f6 | "          "
2: "   " | "•" subtle | "  " | "•" subtle | "   " | "╰────────────────────────────╯" suggestion fond #eef1f6 | "  " | "•" subtle | "       "`,
  'warp · badge pile à la largeur': `╭─ PLAN DE VOL ──────────────╮
│ QUANTUM »    ·  3 contrats │
╰────────────────────────────╯
──
0: "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "──────────────╮" suggestion
1: "│" suggestion | " " | "QUANTUM" suggestion gras | " " | "»" suggestion gras | "    " | "·" text | "  " | "3" text | " " | "contrats" text | " " | "│" suggestion
2: "╰────────────────────────────╯" suggestion`,
  'warp · une colonne de moins, le statut seul': `*   * ╭─ PLAN DE VOL ─╮•·    
    ·+│ QUANTUM »     │      
  • • ╰───────────────╯ •    
──
0: "*" text gras | "   " | "*" text gras | " " | "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "─╮" suggestion | "•" subtle | "·" inactive pâle | "    "
1: "    " | "·" inactive pâle | "+" suggestion gras | "│" suggestion | " " | "QUANTUM" suggestion gras | " " | "»" suggestion gras | "     " | "│" suggestion | "      "
2: "  " | "•" subtle | " " | "•" subtle | " " | "╰───────────────╯" suggestion | " " | "•" subtle | "    "`,
  'warp · étroit': `╭─ PLAN DE VOL ─╮ 
│ QUANTUM »     │ 
╰───────────────╯ 
──
0: "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "─╮" suggestion | " "
1: "│" suggestion | " " | "QUANTUM" suggestion gras | " " | "»" suggestion gras | "     " | "│" suggestion | " "
2: "╰───────────────╯" suggestion | " "
══
╭─ PLAN DE VOL ─╮╌
│ QUANTUM »»    │─
╰───────────────╯─
──
0: "╭─" suggestion | " " | "PLAN" text gras | " " | "DE" text gras | " " | "VOL" text gras | " " | "─╮" suggestion | "╌" text pâle
1: "│" suggestion | " " | "QUANTUM" suggestion gras | " " | "»»" suggestion gras | "    " | "│" suggestion | "─" subtle
2: "╰───────────────╯" suggestion | "─" subtle`,
}
