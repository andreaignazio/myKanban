# Workspace Action Map

This document maps the current workspace-scoped actions in the backend.
It is intended as the starting inventory for a progressive move toward a centralized policy gate.

## Scope

Included here:

- `/api/workspaces/*` routes
- workspace-scoped share/invite routes
- workspace-scoped audit/activity routes
- workspace subscription checkout route

Not included yet:

- board-only routes outside the workspace scope
- cards, lists, checklist, comment, label, watch actions except when exposed through a workspace-scoped route

## Proposed Normalized Actions

Suggested canonical action names for a future gate:

- `workspace.create`
- `workspace.list.mine`
- `workspace.search.public`
- `workspace.patch`
- `workspace.board.list`
- `workspace.board.create`
- `workspace.board.close`
- `workspace.board.restore`
- `workspace.board.purge`
- `workspace.board.listClosed`
- `workspace.member.list`
- `workspace.member.add`
- `workspace.member.changeRole`
- `workspace.member.remove`
- `workspace.audit.read`
- `workspace.activity.user.read`
- `workspace.activity.self.read`
- `workspace.card.activity.read`
- `workspace.card.mirrors.read`
- `workspace.shareoffer.create`
- `workspace.shareoffer.listOutgoing`
- `workspace.shareoffer.listIncomingRequests`
- `workspace.shareoffer.listPendingBoards`
- `workspace.shareoffer.listPendingBoardRequestCounts`
- `workspace.access.request`
- `workspace.subscription.checkout`

## Action Taxonomy

For the future gate, grouping actions by route verb alone is not enough.
The more useful classification is:

- `read`: actions that only read state and do not create side effects.
- `mutating`: actions that change state but operate on a single main resource with a relatively local policy surface.
- `compound`: actions that coordinate multiple resources, multiple policy domains, or both.

This classification is useful because the gate shape will likely differ by family:

- `read` actions usually need resource visibility and maybe a few contextual constraints.
- `mutating` actions usually need one main permission check plus targeted invariants.
- `compound` actions usually need a resolved action context before policy evaluation, because they span more than one target or more than one rule family.

### Classification Heuristics

An action should be considered `read` when:

- it does not write domain state;
- it does not emit business events as part of the use case;
- it does not create, delete, restore, or rewire relations.

An action should be considered `mutating` when:

- it writes domain state;
- it has one main target aggregate or relation;
- the policy can be expressed mostly as “actor can mutate resource X under role/constraint Y”.

An action should be considered `compound` when one or more of these is true:

- it coordinates workspace-level and board-level authorization together;
- it mutates more than one resource family in one use case;
- it mixes authorization with business gating like share state, invitation state, subscription, or membership graph transitions;
- it emits lifecycle events after a multi-step transaction;
- it contains branching policy depending on whether the actor acts on self vs others, same workspace vs cross-entry, existing membership vs new membership.

### First Workspace Classification

#### Read actions

- `workspace.list.mine`
- `workspace.search.public`
- `workspace.shareoffer.listPendingTargets`
- `workspace.board.list`
- `workspace.board.listClosed`
- `workspace.member.list`
- `workspace.audit.read`
- `workspace.activity.user.read`
- `workspace.activity.self.read`
- `workspace.card.activity.read`
- `workspace.card.mirrors.read`
- `workspace.shareoffer.listOutgoing`
- `workspace.shareoffer.listIncomingRequests`
- `workspace.shareoffer.listPendingBoards`
- `workspace.shareoffer.listPendingBoardRequestCounts`

#### Mutating actions

- `workspace.create`
- `workspace.patch`
- `workspace.member.changeRole`
- `workspace.shareoffer.create`
- `workspace.access.request`
- `workspace.subscription.checkout`

#### Compound actions

- `workspace.board.create`
- `workspace.board.close`
- `workspace.board.restore`
- `workspace.board.purge`
- `workspace.member.add`
- `workspace.member.remove`

### Why Some Actions Are Compound

Some examples worth calling out explicitly:

- `workspace.board.create`
 it looks local, but it actually combines workspace membership policy, role policy, positional state, board creation, user-board relation creation, and event emission.

- `workspace.member.add`
 it is not just “can edit workspace members”; it creates a new workspace membership edge for a target user and therefore behaves more like an access-grant action than a simple patch.

- `workspace.member.remove`
 it branches between self-removal and admin removal, and it also cascades to board memberships inside the workspace.

- `workspace.board.close` / `restore` / `purge`
 they combine workspace-scoped permission, board-scoped permission, board/workspace consistency checks, transactional state changes, and lifecycle events.

### Design Implications For The Future Gate

This taxonomy suggests a progressive rollout path:

- start with `read` actions only if the goal is to normalize visibility checks without changing writes;
- start with `mutating` actions if the goal is to reduce duplicated role checks while keeping policy shape simple;
- defer `compound` actions until there is a stable `WorkspaceActionContext` resolver.

For this codebase, the most pragmatic path is:

- normalize `mutating` workspace actions first;
- then move `read` actions onto the same gate once the policy surface is stable;
- finally extract `compound` actions after the context object is proven.

## Route Inventory

### Core workspace actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `POST /api/workspaces/` | `CreateUserWorkspace` | `CreateWorkspace` | no RBAC guard, plus `CheckWorkspaceMembershipLimit(userID)` | `workspace.create` |
| `GET /api/workspaces/` | `GetUserWorkspaces` | `GetUserWorkspaces` | implicit by current user context only | `workspace.list.mine` |
| `GET /api/workspaces/search` | `SearchPublicWorkspaces` | `SearchPublicWorkspaces` | public authenticated read, query validation only | `workspace.search.public` |
| `GET /api/workspaces/pending-offers/targets` | `GetPendingOfferTargetWorkspacesForUser` | `GetPendingOfferTargetWorkspacesForUser` | current user context only | `workspace.shareoffer.listPendingTargets` |
| `PATCH /api/workspaces/:workspaceID/props` | `PatchWorkspaceProps` | `PatchWorkspaceProps` | workspace membership required, role `>= admin` | `workspace.patch` |

### Workspace board actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `GET /api/workspaces/:workspaceID/boards` | `GetWorkspaceBoardsForUserID` | `GetWorkspaceBoardsForUserID` | workspace membership required, role `>= viewer` | `workspace.board.list` |
| `POST /api/workspaces/:workspaceID/boards` | `CreateBoardInWorkspace` | `CreateBoardInWorkspace` | workspace membership required, role `>= member`, plus `CheckWorkspaceMembershipLimit(userID)` | `workspace.board.create` |
| `DELETE /api/workspaces/:workspaceID/boards/:boardID` | `CloseBoardInWorkspace` | `CloseBoardInWorkspace` | workspace membership required, role `>= member`, plus board role `>= admin`, plus board must belong to workspace | `workspace.board.close` |
| `POST /api/workspaces/:workspaceID/boards/:boardID/restore` | `RestoreBoardInWorkspace` | `RestoreBoardInWorkspace` | workspace role `>= member`, board role `>= admin`, board must belong to workspace | `workspace.board.restore` |
| `DELETE /api/workspaces/:workspaceID/boards/:boardID/purge` | `PurgeBoardInWorkspace` | `PurgeBoardInWorkspace` | workspace role `>= member`, board role `>= admin`, board must belong to workspace | `workspace.board.purge` |
| `GET /api/workspaces/:workspaceID/boards/closed` | `GetClosedBoardsInWorkspace` | `GetClosedBoardsInWorkspace` | workspace role `>= viewer` | `workspace.board.listClosed` |

### Workspace member actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `GET /api/workspaces/:workspaceID/members` | `GetWorkspaceMembers` | `GetWorkspaceMembers` | workspace membership required, role `>= viewer` | `workspace.member.list` |
| `POST /api/workspaces/:workspaceID/members` | `AddWorkspaceMember` | `AddWorkspaceMember` | workspace membership required, role `>= admin`, target role validation, plus `CheckWorkspaceMembershipLimit(targetUserID)` | `workspace.member.add` |
| `PATCH /api/workspaces/:workspaceID/members/:memberID` | `ChangeWorkspaceMemberRole` | `ChangeWorkspaceMemberRole` | workspace membership required, role `>= admin`, target role validation | `workspace.member.changeRole` |
| `DELETE /api/workspaces/:workspaceID/members/:memberID` | `DeleteWorkspaceMember` | `DeleteWorkspaceMember` | requester must be workspace member; if removing another user then requester role `>= admin`; self-removal forbidden for owner | `workspace.member.remove` |

### Workspace audit and activity actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `GET /api/workspaces/:workspaceID/auditlog` | `GetWorkspaceAuditLog` | `EventRegistryService.GetWorkspaceAuditLog` | workspace role `>= viewer` | `workspace.audit.read` |
| `GET /api/workspaces/:workspaceID/cards/:cardID/activity` | `GetWorkspaceCardActivity` | `EventRegistryService.GetWorkspaceCardActivity` | workspace role `>= viewer` | `workspace.card.activity.read` |
| `GET /api/workspaces/:workspaceID/activity/users/:userID` | `GetWorkspaceUserActivity` | `EventRegistryService.GetWorkspaceUserActivity` | workspace role `>= viewer`; if requester reads another user's activity then workspace role `>= member` | `workspace.activity.user.read` |
| `GET /api/workspaces/:workspaceID/activity/me` | `GetWorkspaceMyActivity` | `EventRegistryService.GetWorkspaceUserActivity` | workspace role `>= viewer` | `workspace.activity.self.read` |
| `GET /api/workspaces/:workspaceID/cards/:cardID/mirrors` | `GetWorkspaceCardMirrors` | listcards service | workspace-scoped read; guard not mapped here yet | `workspace.card.mirrors.read` |

### Workspace share and access actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `POST /api/workspaces/:workspaceID/shareoffers` | `CreateWorkspaceShareOffer` | `ShareService.CreateWorkspaceShareOffer` | workspace role lookup, parsed role must be `>= admin`; offered role capped to caller role | `workspace.shareoffer.create` |
| `GET /api/workspaces/:workspaceID/shareoffers` | `GetWorkspaceOutgoingShareOffers` | `ShareService.GetWorkspaceOutgoingShareOffers` | workspace role lookup, parsed role must be `>= viewer` | `workspace.shareoffer.listOutgoing` |
| `POST /api/shareoffers/workspaces/:workspaceID/request` | `CreateWorkspaceAccessRequest` | `ShareService.CreateWorkspaceAccessRequest` | not mapped here in detail yet; belongs to workspace access flow | `workspace.access.request` |
| `GET /api/shareoffers/workspaces/:workspaceID/incoming/requests` | `GetWorkspaceRequestsIncomingWithUsers` | `ShareService.GetWorkspaceRequestsIncomingByWorkspaceWithUsers` | workspace role `>= member` | `workspace.shareoffer.listIncomingRequests` |
| `GET /api/shareoffers/workspaces/:workspaceID/pending/boards` | `GetPendingOfferTargetBoardsByWorkspaceForUser` | `ShareService.GetPendingOfferTargetBoardsByWorkspaceForUser` | workspace role `>= viewer` | `workspace.shareoffer.listPendingBoards` |
| `GET /api/shareoffers/workspaces/:workspaceID/pending/board-access-requests` | `GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner` | `ShareService.GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner` | workspace role `>= viewer`; repo narrows to admin/owner visibility semantics | `workspace.shareoffer.listPendingBoardRequestCounts` |

### Workspace subscription actions

| Route | Handler | Service | Current guard | Candidate action |
| --- | --- | --- | --- | --- |
| `POST /api/workspaces/:workspaceID/subscription/checkout` | `StartCheckoutForWorkspace` | `SubscriptionService.StartCheckoutForWorkspace` | workspace role `>= owner` | `workspace.subscription.checkout` |

## Current Guard Patterns

The current workspace area uses several recurring patterns:

- Direct workspace membership lookup followed by role comparison.
- `authz.CheckUserMinWorkspaceRole(...)` for explicit workspace role checks.
- `authz.CheckUserMinRole(...)` when a workspace action also depends on board-level authority.
- Ad hoc business constraints inside service methods.
- Subscription checks currently wired through `CheckWorkspaceMembershipLimit(...)`, which is now effectively a no-op after the derived-user-level removal.

## Immediate Observations For Future Centralization

- The same semantic action is guarded differently across methods: some use `GetUserWorkspace`, some use `CheckUserMinWorkspaceRole`.
- Several workspace actions are actually compound policies, especially board lifecycle actions inside a workspace.
- Workspace-scoped share flows already behave like policy decisions and should likely be moved under the same gate as core workspace actions.
- A future centralized gate should probably resolve a `WorkspaceActionContext` first, then evaluate policy with explicit action names.
- Route verb is not a sufficient proxy for policy complexity; `POST` contains both simple mutating actions and clearly compound actions.
- The `read / mutating / compound` split is likely more useful than `GET / POST / PATCH / DELETE` when planning rollout order.

## Suggested First Centralization Slice

If centralization starts from the outside in, the first slice should likely cover:

- `workspace.patch`
- `workspace.member.changeRole`
- `workspace.shareoffer.create`
- `workspace.subscription.checkout`

Those actions are high-value, already workspace-scoped, and still sit in the `mutating` bucket rather than the `compound` bucket.

## Suggested Second Slice

Once the first slice is stable, the next good candidates are:

- `workspace.member.add`
- `workspace.member.remove`
- `workspace.board.create`

Those are still close to the workspace boundary, but they are already compound enough that they should benefit from a real action-context object instead of simple direct checks.
