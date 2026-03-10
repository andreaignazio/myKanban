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
	WorkspaceID   *uuid.UUID
	CorrelationID uuid.UUID
	Action        actions.Action
	Resource      ResourceRef
	AncillaryData map[ResourceType]ResourceRef
}

type ResourceRef struct {
	ResourceType ResourceType
	ResourceID   uuid.UUID
}

type ResourceType string

const (
	ResourceTypeCard      ResourceType = "card"
	ResourceTypeBoardList ResourceType = "board_list"
	ResourceTypeBoard     ResourceType = "board"
	ResourceTypeWorkspace ResourceType = "workspace"
)

type Response struct {
	Authorized bool
}

type AuthzContext struct {
	Facts       map[FactKind]Fact
	PolicySpecs []PolicySpec
}

type FactKind string

const (
	FactActorWorkspaceRole        FactKind = "actor.workspace_role"
	FactWorkspaceSubscriptionPlan FactKind = "workspace.subscription_plan"
	FactBoardRole                 FactKind = "board_role"
	FactBoardListAccessMode       FactKind = "board_list_access_mode"
	FactBoardWorkspaceID          FactKind = "board_workspace_id"
	FactCardEffectiveBoardListID  FactKind = "card.effective_board_list_id"
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
}

func NewWorkspaceRoleFact(role rbac.Role) Fact {
	return Fact{
		WorkspaceRole: &role,
	}
}

func NewBoardRoleFact(role rbac.Role) Fact {
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

// SetFact canonicalizes the provided fact so only the field allowed by factKind is stored.
func SetFact(facts map[FactKind]Fact, factKind FactKind, value Fact) error {
	switch factKind {
	case FactActorWorkspaceRole:
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
		if value.BoardRole == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardRole: value.BoardRole,
		}
		return nil
	case FactBoardListAccessMode:
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
		if value.BoardListID == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			BoardListID: value.BoardListID,
		}
		return nil
	default:
		return domainerr.ErrUnsupportedFact
	}
}
