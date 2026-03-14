# Card Authorization & Mirror Fan-out

## 1. Principio di base

La modifica di una card è sempre autorizzata rispetto alla **board originale** (root board), indipendentemente da dove la card viene visualizzata o modificata. Se la card è presente come mirror su una board B ma il suo originale è sulla board A, i diritti vengono verificati sulla board A.

---

## 2. Authz per la modifica di card (`PatchBoardCard`)

### Entry point BE

`AuthzCardsHandler.BuildAuthzContext` in `internal/authzcontext/cardsHandler.go`.

La modalità operativa è selezionata al momento della costruzione del handler:

| Modalità | Factory | Caso d'uso |
|---|---|---|
| `PatchBoardCard` | `NewAuthzCardsHandlerPatchBoardCard` | Modifica card da board view |
| `PatchInboxMirrorCard` | `NewAuthzCardsHandlerPatchInboxMirrorCard` | Modifica card da inbox mirror |

### Risoluzione del contesto (`resolveBoardListContext`)

**`PatchBoardCard`:**

```
ResolveRootBoardListFromCardID(cardID)
  └─ GetRootListCardByCardID(cardID)        // JOIN list_cards lc2 ON lc2.root_id = list_cards.id
  └─ GetRootBoardListByListID(listID)       // JOIN board_lists bl2 ON bl2.root_id = board_lists.id
  └─ → rootBoardList (board A)
```

Il check di `AccessMode` e ruolo viene eseguito sul `rootBoardList`, non sulla board corrente. Una mirror card visualizzata su board B viene authz sulla board A.

**`PatchInboxMirrorCard`:**

```
GetBoardListByID(payload.BoardListID)
GetBoardListByCardIDAndBoardID(cardID, board.BoardID)
→ boardList (root board list risolto per quella board)
```

### Policy applicate

Tutte e quattro le seguenti policy devono passare:

1. `FactBoardRole >= Member` — l'utente è almeno membro della root board
2. `FactActorWorkspaceRole >= Member` — l'utente è membro del workspace
3. `FactBoardListAccessMode == Editable` — la root board list non è in readonly
4. `FactCardEffectiveBoardListID == rootBoardList.ID` — la card appartiene effettivamente a quella lista

---

## 3. Authz lato FE (`useCardEditableContext`)

`src/hooks/useCardEditableContext.ts`

### Determinazione mirror card

Una card è considerata mirror quando `effectiveRootBoard` è definito. Questo viene calcolato da `useCardRootBoardContext` tramite `listCard.RootID !== listCard.ID` (board mirror) o `source === "inbox-mirror"`.

### Logica di controllo

```
isMirrorCard = !!effectiveRootBoard

targetBoardId = isMirrorCard ? effectiveRootBoard.ID : resolvedBoardId

cacheKey = cardContext.listCardId ?? cardContext.rootListCardId
rootListCardData = rootListCardDataByListCardId[cacheKey]
rootBoardList = boardListById[rootListCardData.rootBoardListID]

accessMode = isMirrorCard ? rootBoardList?.AccessMode : localBoardList?.AccessMode
role = useCurrentBoardRole(targetBoardId).role

hasRootBoardAccess = !isMirrorCard || role !== undefined
canEdit = hasRootBoardAccess && !isViewer && accessMode !== "readonly"
```

**Caso edge:** se `role === undefined` (nessuna `UserBoard` sulla root board, es. accesso revocato) → `canEdit = false`.

### Fonte dati: `rootListCardData`

La cache `rootListCardDataByListCardId` è keyed per `effectiveListCardID`:

- board mirror → `listCardId`
- inbox-mirror → `rootListCardId`

Viene popolata da `fetchRootBoardForListcardId` (`GET /boards/:boardID/listcards/:listCardID/rootboard`) e contiene:

- `rootBoardListID` — ID della board list radice
- flag di stato (`isUserBoardPurged`, `isRootSoftDeleted`, ecc.)

---

## 4. Invalidazione cache `rootListCardData`

La cache deve essere invalidata quando:

| Evento | Causa |
|---|---|
| `board.list.patched` | cambio `AccessMode` sulla root board list |
| `EventBoardPatched`, `EventWorkspaceBoardClosed/Purged` | cambio stato della root board |
| `EventBoardListCardMoved`, `EventBoardListCardPurged` | spostamento/rimozione della card |
| `listcard.crossboard.moved` | cross-board move |

Il meccanismo è: il BE emette `invalidations.RootBoardListCardIds` nel payload WS → il FE riceve l'evento, aggiunge gli ID a `invalidatedRootBoardListCardIds` → `useCardRootBoardContext` rileva la flag e richiama `fetchRootBoardForListcardId`.

**Fan-out `board.list.patched` (v. sezione 5):**
lo stesso evento viene propagato alle board consumer in modo che anche loro invalidino la cache.

Il FE ha anche una invalidazione locale per `board.list.patched`: quando arriva l'evento, scansiona `rootListCardDataByListCardId` e invalida tutte le entry il cui `rootBoardListID` coincide con una delle board lists patchate (senza aspettare il refetch).

---

## 5. Fan-out eventi mirror (`MirrorPropagationService`)

`internal/eventregistry/mirrorpropagationservice.go`

### Architettura

```
EventRegistryService.Emit(event)
  └─ resolveMirrorPropagation(input)
       └─ MirrorPropagationService.Resolve(input)
            ├─ getRootIDsResolver(eventType)   → RootIDsResolver
            ├─ resolveInvalidatedListCardIDs(rootIDs)
            ├─ getBoardTargetsResolver(eventType) → BoardTargetsResolver
            └─ userTargetsResolver.Resolve(...)
```

### Resolver per `EventBoardListPatched`

| Resolver | Implementazione | Logica |
|---|---|---|
| `RootIDsResolver` | `listPatchedRootIDsResolver` | `ResolveRootListCardIDsByListID(listID)` — trova i `root_id` di tutte le list card nella lista patchata |
| `BoardTargetsResolver` | `rootScopedBoardTargetsResolver` | Per ogni root ID: `ResolveBoardConsumersForRootListCard` — board che hanno mirror di quella card |

### Resolver per altri eventi rilevanti

| Evento | RootIDs | BoardTargets |
|---|---|---|
| `EventBoardPatched/Closed/Purged` | `ResolveRootListCardIDsByBoardID` | `ResolveBoardConsumersForSourceBoardMirrors` + `CardMirrors` |
| `EventBoardListCardMoved` | da `MoveCardEventPayload.RootID` | `ResolveBoardConsumersForRootListCard` |
| `EventBoardListCardPurged` | da `StatePayload.ListCardRelations.RootID` | `ResolveBoardConsumersForRootListCard` |
| `EventListCardCrossBoardMoved` | da `RootListCardID` / `MovedListCardID` | `ResolveBoardConsumersForRootListCard` (src→target) |
| **`EventBoardListPatched`** | `ResolveRootListCardIDsByListID(listID)` | `ResolveBoardConsumersForRootListCard` |

### `InvalidatedListCardIDs`

Da `rootListCardIDs`, il service chiama `ResolveListCardIDsByRootID` per ciascun root → raccoglie tutti i `listCardID` che dipendono da quel root. Questo set viene iniettato nel payload WS come `invalidations.RootBoardListCardIds`.

### Fan-out board aggiuntivo (`resolveAdditionalFanoutBoardIDs`)

Parallelo al propagation service, `resolveAdditionalFanoutBoardIDs` in `registry.go` risolve board extra da aggiungere all'`affectedBoardIDs` (che determina a chi viene inviato il broadcast WS). Per `EventBoardListPatched` usa `ResolveBoardConsumersForSourceBoardMirrors` + `ResolveBoardConsumersForSourceBoardCardMirrors`.

---

## 6. Flusso completo: cambio AccessMode su lista con mirror

```
Admin → PATCH /boards/A/lists/L/access { AccessMode: "readonly" }
  │
  ├─ BE: PatchListAccessMode(L, "readonly")
  │    └─ Emit(EventBoardListPatched, boardID=A, targets=[board:A, list:L])
  │         ├─ listPatchedRootIDsResolver → rootIDs = card root IDs in lista L
  │         ├─ rootScopedBoardTargetsResolver → boardIDs = [B, C, ...] (board con mirror)
  │         ├─ resolveInvalidatedListCardIDs → listCardIDs di tutti i mirror
  │         └─ broadcast WS a [A, B, C] con payload:
  │              { Type: "board.list.patched",
  │                StatePayload: { BoardListRelations: [{ID, AccessMode:"readonly"}] },
  │                Invalidations: { RootBoardListCardIds: [...] } }
  │
  ├─ FE board A: riceve "board.list.patched"
  │    ├─ aggiorna boardListById[L.boardListID].AccessMode = "readonly"
  │    ├─ invalida rootboard cache per le list card locali con rootBoardListID = L.boardListID
  │    └─ useCardEditableContext ricalcola: accessMode="readonly" → canEdit=false
  │
  └─ FE board B (consumer mirror): riceve "board.list.patched"
       ├─ aggiorna boardListById se la board list è in store
       ├─ invalida rootboard cache via invalidations.RootBoardListCardIds
       └─ fetchRootBoardForListcardId() → nuovo rootListCardData con rootBoardListID aggiornato
            └─ useCardEditableContext ricalcola: accessMode="readonly" → canEdit=false
```
