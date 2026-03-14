package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ExternalRootRefResponse struct {
	RootListCardID uuid.UUID `json:"RootListCardID"`
	CardID         uuid.UUID `json:"CardID"`
	BoardID        uuid.UUID `json:"BoardID"`
	WorkspaceID    uuid.UUID `json:"WorkspaceID"`
	WorkspaceName  string    `json:"WorkspaceName"`
	ListID         uuid.UUID `json:"ListID"`
	BoardName      string    `json:"BoardName"`
	ListTitle      string    `json:"ListTitle"`
	CardTitle      string    `json:"CardTitle"`
	UpdatedAt      time.Time `json:"UpdatedAt"`
}

func MergeNestedProps(primary any, fallback any) (map[string]any, error) {
	primaryMap, err := ToMap(primary)
	if err != nil {
		return nil, err
	}
	fallbackMap, err := ToMap(fallback)
	if err != nil {
		return nil, err
	}

	merged := deepMerge(fallbackMap, primaryMap)
	if mergedMap, ok := merged.(map[string]any); ok {
		return mergedMap, nil
	}

	return map[string]any{}, nil
}

func ToMap(data any) (map[string]any, error) {
	if data == nil {
		return map[string]any{}, nil
	}

	b, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	result := map[string]any{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, err
	}

	return result, nil
}

func deepMerge(dest any, patch any) any {
	patchMap, patchIsMap := patch.(map[string]any)
	destMap, destIsMap := dest.(map[string]any)
	if !patchIsMap || !destIsMap {
		return patch
	}

	out := make(map[string]any, len(destMap))
	for k, v := range destMap {
		out[k] = v
	}
	for k, pv := range patchMap {
		if dv, ok := out[k]; ok {
			out[k] = deepMerge(dv, pv)
		} else {
			out[k] = deepMerge(nil, pv)
		}
	}

	return out
}

type BoardProps struct {
	Description *string               `json:"Description,omitempty"`
	Background  *BoardBackgroundProps `json:"Background,omitempty"`
}

type BoardBackgroundProps struct {
	Type  string                     `json:"Type"`
	Image *BoardBackgroundImageProps `json:"Image,omitempty"`
	Color *BoardBackgroundColorProps `json:"Color,omitempty"`
}

type BoardBackgroundImageProps struct {
	Url string `json:"Url,omitempty"`
}

type BoardBackgroundColorProps struct {
	Token string `json:"Token,omitempty"`
}

type BoardDetailResponse struct {
	VisibilityRole                     string                                 `json:"VisibilityRole"`
	Board                              BoardResponse                          `json:"Board"`
	Workspace                          *WorkspaceResponse                     `json:"Workspace,omitempty"`
	UserBoardRelation                  UserBoardResponse                      `json:"UserBoardRelation"`
	Lists                              map[uuid.UUID]ListResponse             `json:"Lists"`
	Cards                              map[uuid.UUID]CardResponse             `json:"Cards"`
	Checklists                         map[uuid.UUID]ChecklistResponse        `json:"Checklists"`
	Entries                            map[uuid.UUID]EntryResponse            `json:"Entries"`
	Users                              map[uuid.UUID]UserResponse             `json:"Users"`
	Boards                             map[uuid.UUID]BoardResponse            `json:"Boards"`
	BoardListRelations                 []BoardListResponse                    `json:"BoardListRelations"`
	BoardListIdsByBoardID              map[uuid.UUID][]uuid.UUID              `json:"BoardListIdsByBoardID"`
	ListCardRelations                  []ListCardResponse                     `json:"ListCardRelations"`
	CardChecklistRelations             []CardChecklistResponse                `json:"CardChecklistRelations"`
	ChecklistEntryRelations            []ChecklistEntryResponse               `json:"ChecklistEntryRelations"`
	BoardLabels                        []BoardLabelResponse                   `json:"BoardLabels"`
	CardLabelLinks                     []CardLabelLinkResponse                `json:"CardLabelLinks"`
	CardMembers                        []CardMemberResponse                   `json:"CardMembers"`
	EntryMembers                       []EntryMemberResponse                  `json:"EntryMembers"`
	UserBoardRelations                 []UserBoardResponse                    `json:"UserBoardRelations"`
	ExternalRootsByID                  map[uuid.UUID]ExternalRootRefResponse  `json:"ExternalRootsByID"`
	MovedChecklistEntriesByChecklistID map[uuid.UUID][]ChecklistEntryResponse `json:"MovedChecklistEntriesByChecklistID"`
	CardComments                       []CardCommentResponse                  `json:"CardComments"`
	UserWorkspaceRelations             []UserWorkspaceResponse                `json:"UserWorkspaceRelations"`
	ShareOffers                        []ShareOfferResponse                   `json:"ShareOffers"`
	ShareLinks                         []PublicShareLinkResponse              `json:"ShareLinks"`
}

type BoardsAccrossWorkspacesResponse struct {
	Workspaces             []WorkspaceResponse       `json:"Workspaces"`
	UserWorkspaces         []UserWorkspaceResponse   `json:"UserWorkspaces"`
	WorkspaceSubscriptions []SubscriptionResponse    `json:"Subscriptions"`
	Boards                 []BoardResponse           `json:"Boards"`
	UserBoards             []UserBoardResponse       `json:"UserBoards"`
	BoardIDsByWorkspaceID  map[uuid.UUID][]uuid.UUID `json:"BoardIDsByWorkspaceID"`
}

type MoveCardEventPayload struct {
	ListCardPatch      ListCardResponse
	ToListCards        []ListCardResponse
	FromListCards      []ListCardResponse
	Cards              map[uuid.UUID]CardResponse
	FromListID         string
	ToListID           string
	MoveAllCardsInList bool
	MovedCount         int
}

type BoardPatchedEventPayload struct {
	ChangedFields []string
}

type BoardListEventPayload struct {
	BoardListPatch BoardListResponse
	ToBoardLists   []BoardListResponse
	FromBoardLists []BoardListResponse
}

type UserInboxCardResponse struct {
	InboxCards        []InboxCardResponse                   `json:"InboxCards"`
	Cards             map[uuid.UUID]CardResponse            `json:"Cards"`
	ExternalRootsByID map[uuid.UUID]ExternalRootRefResponse `json:"ExternalRootsByID"`
}

type RootBoardListResponse struct {
	Board                     *BoardResponse     `json:"Board,omitempty"`
	List                      *ListResponse      `json:"List,omitempty"`
	BoardList                 *BoardListResponse `json:"BoardList,omitempty"`
	UserBoard                 *UserBoardResponse `json:"UserBoard"`
	IsUserBoardPurged         *bool              `json:"IsUserBoardPurged,omitempty"`
	IsUserBoardSoftDeleted    *bool              `json:"IsUserBoardSoftDeleted,omitempty"`
	IsMainListCardPurged      *bool              `json:"IsMainListCardPurged,omitempty"`
	IsMainListCardSoftDeleted *bool              `json:"IsMainListCardSoftDeleted,omitempty"`
	IsRootPurged              *bool              `json:"IsRootPurged,omitempty"`
	IsRootSoftDeleted         *bool              `json:"IsRootSoftDeleted,omitempty"`
}
