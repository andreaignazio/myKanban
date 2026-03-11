package authzdto

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"

	"github.com/google/uuid"
)

type Request struct {
	UserID        uuid.UUID
	CorrelationID uuid.UUID
	Action        actions.Action
	Payload       RequestPayload
}

type RequestPayload struct {
	WorkspacePatchPayload       *WorkspacePatchPayload
	CardInListPatchPayload      *CardInListPatchPayload
	InboxCardMoveToBoardPayload *InboxCardMoveToBoardPayload
	InboxCardDetatchPayload     *InboxCardDetatchPayload
	ReadListCardPayload         *ReadListCardPayload
	CreateListCardPayload       *CreateListCardPayload
	CopyListCardPayload         *CopyListCardPayload
}

type WorkspacePatchPayload struct {
	WorkspaceID uuid.UUID
}

type CardInListPatchPayload struct {
	CardID      uuid.UUID
	BoardListID uuid.UUID
}

type InboxCardMoveToBoardPayload struct {
	CardID            uuid.UUID
	TargetWorkspaceID uuid.UUID
	TargetBoardID     uuid.UUID
	TargetListID      uuid.UUID
}

type InboxCardDetatchPayload struct {
	CardID uuid.UUID
}

type ReadListCardPayload struct {
	WorkspaceID       uuid.UUID
	CardID            uuid.UUID
	SourceBoardListID uuid.UUID
	RootListCardID    *uuid.UUID
}

type CreateListCardPayload struct {
	TargetWorkspaceID uuid.UUID
	TargetBoardListID uuid.UUID
}
type CopyListCardPayload struct {
	ReadListCardPayload
	CreateListCardPayload
}

type Response struct {
	Authorized bool
}

type AuthzContext struct {
	Facts       map[FactKind]Fact
	PolicySpecs []PolicySpec
}

type FactKind string

const (
	FactActorWorkspaceRole             FactKind = "actor.workspace_role"
	FactSourceWorkspaceRole            FactKind = "source.workspace_role"
	FactTargetWorkspaceRole            FactKind = "target.workspace_role"
	FactWorkspaceSubscriptionPlan      FactKind = "workspace.subscription_plan"
	FactBoardRole                      FactKind = "board_role"
	FactSourceBoardRole                FactKind = "source.board_role"
	FactTargetBoardRole                FactKind = "target.board_role"
	FactBoardListAccessMode            FactKind = "board_list_access_mode"
	FactTargetBoardListAccessMode      FactKind = "target.board_list_access_mode"
	FactBoardWorkspaceID               FactKind = "board_workspace_id"
	FactCardEffectiveBoardListID       FactKind = "card.effective_board_list_id"
	FactSourceCardEffectiveBoardListID FactKind = "source.card.effective_board_list_id"
	FactEffectiveInboxCardUserID       FactKind = "effective_inbox_card_user_id"
)

type PolicyKind string

const (
	PolicyRequireFactPresence     PolicyKind = "require_fact_presence"
	PolicyRequireMinimumFactValue PolicyKind = "require_minimum_fact_value"
	PolicyRequireExactFactValue   PolicyKind = "require_exact_fact_value"
)

type PolicySpec struct {
	PolicyKind PolicyKind
	FactKind   FactKind
	Value      Fact
}

type Fact struct {
	WorkspaceRole       *rbac.Role
	SubscriptionPlan    *subscriptionplan.Plan
	BoardRole           *rbac.Role
	BoardListAccessMode *rbac.BoardListAccessMode
	BoardWorkspaceID    *uuid.UUID
	BoardListID         *uuid.UUID
	InboxCardUserID     *uuid.UUID
}

func NewWorkspaceRoleFact(role rbac.Role) Fact {
	return Fact{
		WorkspaceRole: &role,
	}
}

func NewSourceWorkspaceRoleFact(role rbac.Role) Fact {
	return Fact{
		WorkspaceRole: &role,
	}
}

func NewTargetWorkspaceRoleFact(role rbac.Role) Fact {
	return Fact{
		WorkspaceRole: &role,
	}
}

func NewBoardRoleFact(role rbac.Role) Fact {
	return Fact{
		BoardRole: &role,
	}
}

func NewSourceBoardRoleFact(role rbac.Role) Fact {
	return Fact{
		BoardRole: &role,
	}
}

func NewTargetBoardRoleFact(role rbac.Role) Fact {
	return Fact{
		BoardRole: &role,
	}
}

func NewSubscriptionPlanFact(plan subscriptionplan.Plan) Fact {
	return Fact{
		SubscriptionPlan: &plan,
	}
}

func NewBoardListAccessModeFact(mode rbac.BoardListAccessMode) Fact {
	return Fact{
		BoardListAccessMode: &mode,
	}
}

func NewTargetBoardListAccessModeFact(mode rbac.BoardListAccessMode) Fact {
	return Fact{
		BoardListAccessMode: &mode,
	}
}

func NewBoardWorkspaceIDFact(workspaceID uuid.UUID) Fact {
	return Fact{
		BoardWorkspaceID: &workspaceID,
	}
}

func NewCardEffectiveBoardListIDFact(boardListID uuid.UUID) Fact {
	return Fact{
		BoardListID: &boardListID,
	}
}

func NewSourceCardEffectiveBoardListIDFact(boardListID uuid.UUID) Fact {
	return Fact{
		BoardListID: &boardListID,
	}
}

func NewEffectiveInboxCardUserIDFact(userID uuid.UUID) Fact {
	return Fact{
		InboxCardUserID: &userID,
	}
}

// SetFact canonicalizes the provided fact so only the field allowed by factKind is stored.
func SetFact(facts map[FactKind]Fact, factKind FactKind, value Fact) error {
	switch factKind {
	case FactActorWorkspaceRole:
		fallthrough
	case FactSourceWorkspaceRole:
		fallthrough
	case FactTargetWorkspaceRole:
		if value.WorkspaceRole == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			WorkspaceRole: value.WorkspaceRole,
		}

		return nil
	case FactWorkspaceSubscriptionPlan:
		if value.SubscriptionPlan == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			SubscriptionPlan: value.SubscriptionPlan,
		}
		return nil
	case FactBoardRole:
		fallthrough
	case FactSourceBoardRole:
		fallthrough
	case FactTargetBoardRole:
		if value.BoardRole == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardRole: value.BoardRole,
		}
		return nil
	case FactBoardListAccessMode:
		fallthrough
	case FactTargetBoardListAccessMode:
		if value.BoardListAccessMode == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardListAccessMode: value.BoardListAccessMode,
		}
		return nil
	case FactBoardWorkspaceID:
		if value.BoardWorkspaceID == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardWorkspaceID: value.BoardWorkspaceID,
		}
		return nil
	case FactCardEffectiveBoardListID:
		fallthrough
	case FactSourceCardEffectiveBoardListID:
		if value.BoardListID == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardListID: value.BoardListID,
		}
		return nil
	case FactEffectiveInboxCardUserID:
		if value.InboxCardUserID == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			InboxCardUserID: value.InboxCardUserID,
		}
		return nil

	default:
		return domainerr.ErrUnsupportedFact
	}
}
