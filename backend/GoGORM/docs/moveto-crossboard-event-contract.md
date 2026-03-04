# Cross-board `moveto` realtime contract (backend)

## Scope

Questo documento descrive il nuovo flusso realtime dedicato allo spostamento card cross-board (`PATCH /boards/:boardID/cards/:cardID/moveto`) separato da `listcard.moved`.

## Eventi emessi

### 1) Board channel event

- **Type**: `listcard.crossboard.moved`
- **Transport**: `ws.Event` via `Hub.BroadCastToBoard`
- **Emitter orchestrator**: `EventRegistryService.EmitCrossBoardMove`

#### Payload (board)

```json
{
  "RootListCardID": "<uuid>",
  "MovedListCardID": "<uuid>",
  "CardID": "<uuid>",
  "SourceBoardID": "<uuid>",
  "TargetBoardID": "<uuid>",
  "FromListID": "<uuid>",
  "ToListID": "<uuid>",
  "ListCardPatch": {
    "ID": "<uuid>",
    "CardID": "<uuid>",
    "ListID": "<uuid>",
    "RootID": "<uuid>",
    "Mirrors": ["<uuid>"]
  },
  "FromListCards": [
    {
      "ID": "<uuid>",
      "CardID": "<uuid>",
      "ListID": "<uuid>",
      "RootID": "<uuid>"
    }
  ],
  "ToListCards": [
    {
      "ID": "<uuid>",
      "CardID": "<uuid>",
      "ListID": "<uuid>",
      "RootID": "<uuid>"
    }
  ],
  "ListCardIdsByListID": {
    "<sourceListID>": ["<listCardID>", "..."],
    "<targetListID>": ["<listCardID>", "..."]
  },
  "ExternalRootsByID": {
    "<rootListCardID>": {
      "RootListCardID": "<uuid>",
      "CardID": "<uuid>",
      "BoardID": "<uuid>",
      "WorkspaceID": "<uuid>",
      "WorkspaceName": "<string>",
      "ListID": "<uuid>",
      "BoardName": "<string>",
      "ListTitle": "<string>",
      "CardTitle": "<string>",
      "UpdatedAt": "<RFC3339>"
    }
  }
}
```

> Nota: il payload è board-scoped. Su board diverse da source/target, i campi `FromListCards`/`ToListCards` possono essere vuoti e il payload funge da trigger di riallineamento mirror basato su `RootListCardID`.

### 2) User channel event (Inbox)

- **Type**: `inbox.rootcard.moved`
- **Transport**: `ws.UserEvent` via `Hub.BroadCastToUser`
- **Emitter orchestrator**: `EventRegistryService.EmitCrossBoardMove`

#### Payload (inbox user)

```json
{
  "RootListCardID": "<uuid>",
  "CardID": "<uuid>",
  "SourceBoardID": "<uuid>",
  "TargetBoardID": "<uuid>",
  "SourceListID": "<uuid>",
  "TargetListID": "<uuid>",
  "AffectedInboxCardIDs": ["<uuid>", "..."],
  "ExternalRootsByID": {
    "<rootListCardID>": {
      "RootListCardID": "<uuid>",
      "CardID": "<uuid>",
      "BoardID": "<uuid>",
      "WorkspaceID": "<uuid>",
      "WorkspaceName": "<string>",
      "ListID": "<uuid>",
      "BoardName": "<string>",
      "ListTitle": "<string>",
      "CardTitle": "<string>",
      "UpdatedAt": "<RFC3339>"
    }
  }
}
```

## Metodi usati per trovare i consumers

### Board consumers

Metodo repository:

- `ResolveBoardConsumersForRootListCard(ctx, rootListCardID, sourceBoardID, targetBoardID)`

Regola di risoluzione:

1. Include sempre `sourceBoardID`
2. Include sempre `targetBoardID`
3. Aggiunge tutte le board che hanno `list_cards.root_id = rootListCardID` (join con `board_lists`)
4. Deduplica gli ID board

### Inbox user consumers

Metodo repository:

- `ResolveInboxUserConsumersForRootListCard(ctx, rootListCardID)`

Regola di risoluzione:

1. Cerca in `user_inbox_cards` con `root_list_card_id = rootListCardID`
2. Filtra soft-deleted (`deleted_at IS NULL`)
3. Restituisce `DISTINCT user_id`

### Inbox card IDs per utente (payload enrichment)

Metodo repository:

- `ResolveInboxCardIDsForUserAndRootListCard(ctx, userID, rootListCardID)`

Regola di risoluzione:

1. Cerca in `user_inbox_cards` per `user_id` + `root_list_card_id`
2. Filtra soft-deleted
3. Restituisce `DISTINCT id` (inbox card IDs)

### External root refs (payload enrichment)

Metodo repository:

- `GetExternalRootRefsByIDs(ctx, rootIDs)`

Regola di risoluzione:

1. Materializza i root via `list_cards` + join con `board_lists`, `boards`, `workspaces`, `lists`, `cards`
2. Restituisce la shape canonica backend `dto.ExternalRootRefResponse`
3. Popola `ExternalRootsByID` in entrambi i payload (`board` e `inbox user`)

## Ownership del flusso

- `ListCardsService.MoveCardToBoard`: mutazione stato + ritorno `MoveCardToBoardEventData`
- `ListCardsHandler.MoveCardToBoard`: invoca orchestrator `EmitCrossBoardMove`
- `EventRegistryService.EmitCrossBoardMove`: risolve consumer e invia eventi board/user

## Vincolo architetturale rispettato

Nel path `moveto` cross-board il service non emette più eventi realtime direttamente (`Hub.BroadCastToBoard` / `Hub.BroadCastToUser`).
