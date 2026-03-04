# Subscription Rules (stato attuale del codice)

Questo documento riassume i limiti **intrinseci nel codice** backend (non i piani commerciali desiderati).

## Piani riconosciuti

- `free`
- `pro`
- `premium`

Fonti: `models.SubscriptionPlan`, parsing e validazione request checkout.

## Limiti per utente: numero massimo di workspace membership

La regola effettivamente usata per autorizzare ingressi/creazioni workspace è:

- `free` → max **5** workspace
- `pro` → max **10** workspace
- `premium` → **illimitato** (`-1`)

Implementazione:

- `MaxWorkspacesForUserLevel(level)` in `internal/subscription/types.go`
- enforcement tramite `CheckWorkspaceMembershipLimit(ctx, userID)` in `internal/subscription/service.go`

### Come viene derivato il livello utente

Il livello utente è calcolato da `GetDerivedUserLevel` su membership + subscription attive/trial:

- considera solo subscription con `status IN ('trial','active')` e non soft-deleted
- fallback a `free` se non trova piani validi

**Nota importante (comportamento corrente):**

Nel `CASE` SQL viene controllato prima `pro` e poi `premium`. Quindi, se un utente ha almeno un workspace `pro` e almeno uno `premium`, il livello derivato risulta `pro` (non `premium`).

## Limiti per workspace: numero massimo board

È definita una funzione con i limiti:

- `free` → max **5** board
- `pro` → max **15** board
- `premium` → **illimitato** (`-1`)

Implementazione: `MaxBoardsForWorkspaceSubscription(plan)` in `internal/subscription/types.go`.

**Stato enforcement:** al momento non risulta applicata in nessun flusso di creazione board (funzione definita ma non usata).

## Dove i limiti sono applicati oggi

Il controllo `CheckWorkspaceMembershipLimit` è usato in più flussi applicativi, tra cui:

- creazione workspace
- aggiunta membri board (quando può implicare ingresso in un nuovo workspace)
- join workspace / accettazione share board o workspace verso workspace non ancora membro

## Stati e campi subscription rilevanti

Nel modello/migrazioni:

- `workspace_subscriptions.plan`: `free|pro|premium`
- stati supportati a livello schema: `none|trial|active|past_due|canceled|incomplete|unpaid`
- i calcoli di livello e lookup subscription “attiva” usano però solo `trial`/`active`

## Sintesi operativa

1. Il limite **effettivamente vincolante oggi** è soprattutto quello di **workspace membership per utente**.
2. I limiti board per piano sono **codificati ma non enforceati**.
3. Esiste una priorità SQL attuale che può degradare `premium` a `pro` nel livello derivato quando coesistono entrambi.

## TODO enforcement (da implementare)

- Applicare enforcement del limite **max boards per workspace** in tutti i flussi di creazione board.
- Applicare enforcement del limite **max members per workspace** (regola appena aggiunta).
