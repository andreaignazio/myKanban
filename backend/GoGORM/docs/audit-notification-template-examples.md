# Audit notification examples (pre-refactor baseline)

Questo file definisce il testo notifica **atteso** per ogni `AuditTemplateKey`, prima del refactor tecnico.
L’obiettivo è fissare il copy utente e la strategia link, così backend/frontend possono convergere sullo stesso contratto.

## Regole link

- Link card: `/workspaces/{workspaceID}/boards/{boardID}/cards/{cardID}`
- Link list: `/workspaces/{workspaceID}/boards/{boardID}` (con anchor/list focus lato FE)
- Link board: `/workspaces/{workspaceID}/boards/{boardID}`
- Link user activity: `/users/{userID}/activities`
- Link user cards: `/users/{userID}/cards`
- Link user boards: `/users/{userID}/boards`

> Contratto target: path parameter formalizzato su `:userID`.
> Alias consigliato per utente corrente: `/users/me/activities`, `/users/me/cards`, `/users/me/boards`.
> Le route legacy `/user/*` possono restare come redirect temporaneo.

## Convenzioni placeholder

- `{actor}` = nome attore, linkato a `/users/{actorID}/activities`
- `{targetUser}` = utente target, linkato in base al contesto:
  - contesto activity: `/users/{targetUserID}/activities`
  - contesto card membership: `/users/{targetUserID}/cards`
  - contesto board/workspace membership: `/users/{targetUserID}/boards`
- `{card}`, `{list}`, `{board}`, `{workspace}`, `{label}`, `{checklist}`, `{entry}` = label risolte live; fallback da `Params`

## Template copy map

| TemplateKey | Testo notifica mostrato all’utente |
|---|---|
| `audit.legacy.event` | `{actor} ha eseguito un'azione` |
| `audit.card.created` | `{actor} ha creato la card {card} nella lista {list} su {board}` |
| `audit.card.patched` | `{actor} ha aggiornato la card {card} nella lista {list}` |
| `audit.card.mirrored` | `{actor} ha specchiato la card {card} da {list} su {board}` |
| `audit.label.created` | `{actor} ha creato l'etichetta {label} su {board}` |
| `audit.label.deleted` | `{actor} ha eliminato l'etichetta {label} da {board}` |
| `audit.label.patched` | `{actor} ha aggiornato l'etichetta {label} su {board}` |
| `audit.card.label.added` | `{actor} ha aggiunto l'etichetta {label} alla card {card}` |
| `audit.card.label.removed` | `{actor} ha rimosso l'etichetta {label} dalla card {card}` |
| `audit.card.member.added` | `{actor} ha aggiunto {targetUser} come membro della card {card}` |
| `audit.card.member.removed` | `{actor} ha rimosso {targetUser} dai membri della card {card}` |
| `audit.card.member.added.self` | `{actor} ti ha aggiunto come membro della card {card}` |
| `audit.card.member.removed.self` | `{actor} ti ha rimosso dai membri della card {card}` |
| `audit.card_comment.created` | `{actor} ha commentato la card {card}` |
| `audit.card_comment.deleted` | `{actor} ha eliminato un commento sulla card {card}` |
| `audit.card_comment.edited` | `{actor} ha modificato un commento sulla card {card}` |
| `audit.checklist.created` | `{actor} ha creato la checklist {checklist} nella card {card}` |
| `audit.checklist.patched` | `{actor} ha aggiornato la checklist {checklist} nella card {card}` |
| `audit.checklist.deleted` | `{actor} ha eliminato la checklist {checklist} dalla card {card}` |
| `audit.checklist.moved` | `{actor} ha spostato la checklist {checklist} nella card {card}` |
| `audit.checklist.entry.created` | `{actor} ha creato la voce {entry} nella checklist {checklist}` |
| `audit.checklist.entry.patched` | `{actor} ha aggiornato la voce {entry} nella checklist {checklist}` |
| `audit.checklist.entry.deleted` | `{actor} ha eliminato la voce {entry} dalla checklist {checklist}` |
| `audit.checklist.entry.moved` | `{actor} ha spostato la voce {entry} nella checklist {checklist}` |
| `audit.checklist.entry.member.added` | `{actor} ha assegnato {targetUser} alla voce {entry}` |
| `audit.checklist.entry.member.removed` | `{actor} ha rimosso {targetUser} dalla voce {entry}` |
| `audit.checklist.entry.member.added.self` | `{actor} ti ha assegnato alla voce {entry}` |
| `audit.checklist.entry.member.removed.self` | `{actor} ti ha rimosso dalla voce {entry}` |
| `audit.workspace.board.created` | `{actor} ha creato la board {board} nel workspace {workspace}` |
| `audit.workspace.board.closed` | `{actor} ha chiuso la board {board} nel workspace {workspace}` |
| `audit.workspace.board.restored` | `{actor} ha ripristinato la board {board} nel workspace {workspace}` |
| `audit.workspace.board.purged` | `{actor} ha eliminato definitivamente la board {board} nel workspace {workspace}` |
| `audit.workspace.member.role.changed` | `{actor} ha cambiato il ruolo di {targetUser} in {workspace}` |
| `audit.workspace.member.role.changed.self` | `{actor} ti ha cambiato ruolo in {workspace}` |
| `audit.workspace.member.removed` | `{actor} ha rimosso {targetUser} dal workspace {workspace}` |
| `audit.workspace.member.removed.self` | `{actor} ti ha rimosso dal workspace {workspace}` |

## Regola di rendering utente (nuova)

Quando compare un utente nel testo:

- `{actor}` è sempre cliccabile verso `/user/activities?targetUserID={actorID}`
- `{actor}` è sempre cliccabile verso `/users/{actorID}/activities`
- `{targetUser}` è sempre cliccabile e la destinazione dipende dal dominio evento:
  - eventi card/checklist/member: `/users/{targetUserID}/cards`
  - eventi workspace/board membership: `/users/{targetUserID}/boards`
  - fallback generico: `/users/{targetUserID}/activities`

## Regola varianti self

- Se `viewerUserID == targetUserID`, usare template `.self` quando disponibile.
- Varianti `.self` previste:
  - `audit.card.member.added.self`
  - `audit.card.member.removed.self`
  - `audit.checklist.entry.member.added.self`
  - `audit.checklist.entry.member.removed.self`
  - `audit.workspace.member.role.changed.self`
  - `audit.workspace.member.removed.self`

## Fallback data policy

- Il FE prova prima la risoluzione live da `Links` + `Entities` bulk fornite dai getter audit.
- Se una entity non si risolve live, usa `Params` (ultima ancora di salvataggio).
- `Snapshot` non deve essere usato come sorgente di rendering nel nuovo contratto.
