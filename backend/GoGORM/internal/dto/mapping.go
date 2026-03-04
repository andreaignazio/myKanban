package dto

import (
	"GoGORM/models"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func DeletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
}

func UserToResponse(user *models.User) UserResponse {
	return UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Username:  user.Username,
		AvatarUrl: user.AvatarUrl,
		Props:     userPropsFromJSON(user.Props),
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
		DeletedAt: DeletedAtPtr(user.DeletedAt),
	}
}

func userPropsFromJSON(raw datatypes.JSON) UserProps {
	if len(raw) == 0 {
		return UserProps{}
	}
	var props UserProps
	if err := json.Unmarshal(raw, &props); err != nil {
		return UserProps{}
	}
	return props
}

func UserBoardToResponse(userBoard *models.UserBoard) UserBoardResponse {
	return UserBoardResponse{
		UserID:    userBoard.UserID,
		BoardID:   userBoard.BoardID,
		Role:      userBoard.Role,
		Position:  userBoard.Pos,
		Props:     userBoardPropsFromJSON(userBoard.Props),
		CreatedAt: userBoard.CreatedAt,
		UpdatedAt: userBoard.UpdatedAt,
		DeletedAt: DeletedAtPtr(userBoard.DeletedAt),
	}
}

func userBoardPropsFromJSON(raw datatypes.JSON) UserBoardProps {
	if len(raw) == 0 {
		return UserBoardProps{}
	}
	var props UserBoardProps
	if err := json.Unmarshal(raw, &props); err != nil {
		return UserBoardProps{}
	}
	return props
}

func BoardListToResponse(boardList *models.BoardList) BoardListResponse {
	return BoardListResponse{
		ID:         boardList.ID,
		RootID:     boardList.RootID,
		ListID:     boardList.ListID,
		BoardID:    boardList.BoardID,
		Position:   boardList.Pos,
		AccessMode: boardList.AccessMode,
		CreatedAt:  boardList.CreatedAt,
		UpdatedAt:  boardList.UpdatedAt,
		DeletedAt:  DeletedAtPtr(boardList.DeletedAt),
	}
}

func BoardListsToResponses(boardLists []models.BoardList) []BoardListResponse {
	responses := make([]BoardListResponse, 0, len(boardLists))
	for i := range boardLists {
		responses = append(responses, BoardListToResponse(&boardLists[i]))
	}
	return responses
}

func ListCardToResponse(listCard *models.ListCard) ListCardResponse {
	return ListCardResponse{
		ID:        listCard.ID,
		CardID:    listCard.CardID,
		ListID:    listCard.ListID,
		RootID:    listCard.RootID,
		Position:  listCard.Pos,
		CreatedAt: listCard.CreatedAt,
		UpdatedAt: listCard.UpdatedAt,
		DeletedAt: DeletedAtPtr(listCard.DeletedAt),
	}
}

func BoardToResponse(board *models.Board) BoardResponse {
	return BoardResponse{
		ID:              board.ID,
		Name:            board.Name,
		CreatedByUserID: board.CreatedByUserID,
		WorkspaceID:     board.WorkspaceID,
		Visibility:      board.Visibility.String(),
		PublicToken:     board.PublicToken,
		Props:           board.Props,
		CreatedAt:       board.CreatedAt,
		UpdatedAt:       board.UpdatedAt,
		DeletedAt:       DeletedAtPtr(board.DeletedAt),
	}
}

func ListToResponse(list *models.List) ListResponse {
	return ListResponse{
		ID:               list.ID,
		Title:            list.Title,
		Props:            list.Props,
		CreatedByUserID:  list.CreatedByUserID,
		CreatedInBoardID: list.CreatedInBoardID,
		CreatedAt:        list.CreatedAt,
		UpdatedAt:        list.UpdatedAt,
		DeletedAt:        DeletedAtPtr(list.DeletedAt),
	}
}

func CardToResponse(card *models.Card) CardResponse {
	return CardResponse{
		ID:              card.ID,
		Title:           card.Title,
		Done:            card.Done,
		Description:     card.Description,
		Props:           card.Props,
		StartDate:       card.StartDate,
		EndDate:         card.EndDate,
		CreatedByUserID: card.CreatedByUserID,
		CreatedInListID: card.CreatedInListID,
		CreatedAt:       card.CreatedAt,
		UpdatedAt:       card.UpdatedAt,
		DeletedAt:       DeletedAtPtr(card.DeletedAt),
	}
}

func CardsToResponses(cards []models.Card) []CardResponse {
	responses := make([]CardResponse, 0, len(cards))
	for i := range cards {
		responses = append(responses, CardToResponse(&cards[i]))
	}
	return responses
}

func WorkspaceToResponse(workspace *models.Workspace) WorkspaceResponse {
	return WorkspaceResponse{
		ID:              workspace.ID,
		Name:            workspace.Name,
		CreatedByUserID: workspace.CreatedByUserID,
		Visibility:      string(workspace.WorkspaceVisibility),
		PublicToken:     workspace.PublicToken,
		Props:           workspace.Props,
		CreatedAt:       workspace.CreatedAt,
		UpdatedAt:       workspace.UpdatedAt,
		DeletedAt:       DeletedAtPtr(workspace.DeletedAt),
	}
}

func UserWorkspaceToResponse(userWorkspace *models.UserWorkspace) UserWorkspaceResponse {
	return UserWorkspaceResponse{
		ID:          userWorkspace.ID,
		WorkspaceID: userWorkspace.WorkspaceID,
		UserID:      userWorkspace.UserID,
		Position:    userWorkspace.Pos,
		Role:        userWorkspace.Role.String(),
		CreatedAt:   userWorkspace.CreatedAt,
		UpdatedAt:   userWorkspace.UpdatedAt,
		DeletedAt:   DeletedAtPtr(userWorkspace.DeletedAt),
	}
}

func UserWorkspaceRowToResponses(row *models.UserWorkspaceRow) (WorkspaceResponse, UserWorkspaceResponse) {
	workspace := WorkspaceResponse{
		ID:              row.WorkspaceID,
		Name:            row.WorkspaceName,
		CreatedByUserID: row.WorkspaceCreatedByUserID,
		Visibility:      string(row.WorkspaceVisibility),
		PublicToken:     row.WorkspacePublicToken,
		Props:           row.WorkspaceProps,
		CreatedAt:       row.WorkspaceCreatedAt,
		UpdatedAt:       row.WorkspaceUpdatedAt,
		DeletedAt:       DeletedAtPtr(row.WorkspaceDeletedAt),
	}

	userWorkspace := UserWorkspaceResponse{
		ID:          row.UserWorkspaceID,
		WorkspaceID: row.UserWorkspaceWorkspaceID,
		UserID:      row.UserWorkspaceUserID,
		Position:    row.UserWorkspacePos,
		Role:        row.UserWorkspaceRole,
		CreatedAt:   row.UserWorkspaceCreatedAt,
		UpdatedAt:   row.UserWorkspaceUpdatedAt,
		DeletedAt:   DeletedAtPtr(row.UserWorkspaceDeletedAt),
	}

	return workspace, userWorkspace
}

func ShareOfferToResponse(shareOffer *models.ShareOffer) ShareOfferResponse {
	return ShareOfferResponse{
		ID:              shareOffer.ID,
		TargetType:      shareOffer.TargetType,
		TargetID:        shareOffer.TargetID,
		FromUserID:      shareOffer.FromUserID,
		ToUserID:        shareOffer.ToUserID,
		OfferedRole:     shareOffer.OfferedRole.String(),
		Message:         shareOffer.Message,
		Status:          string(shareOffer.Status),
		Kind:            string(shareOffer.Kind),
		DecidedByUserID: shareOffer.DecidedByUserID,
		DecidedAt:       shareOffer.DecidedAt,
		CreatedAt:       shareOffer.CreatedAt,
		UpdatedAt:       shareOffer.UpdatedAt,
		DeletedAt:       DeletedAtPtr(shareOffer.DeletedAt),
	}
}

func ShareOfferEventToResponse(event *models.ShareOfferEvent) ShareOfferEventResponse {
	return ShareOfferEventResponse{
		ID:         event.ID,
		OfferID:    event.OfferID,
		TargetType: event.TargetType,
		TargetID:   event.TargetID,
		EventType:  event.EventType,
		Payload:    event.Payload,
		CreatedAt:  event.CreatedAt,
	}
}

func PublicShareLinkToResponse(shareLink *models.PublicShareLink) PublicShareLinkResponse {
	return PublicShareLinkResponse{
		ID:              shareLink.ID,
		Token:           shareLink.Token,
		TargetType:      shareLink.TargetType,
		TargetID:        shareLink.TargetID,
		Mode:            string(shareLink.Mode),
		Role:            shareLink.Role.String(),
		ExpiresAt:       shareLink.ExpiresAt,
		RevokedAt:       shareLink.RevokedAt,
		CreatedByUserID: shareLink.CreatedByUserID,
		CreatedAt:       shareLink.CreatedAt,
		UpdatedAt:       shareLink.UpdatedAt,
		DeletedAt:       DeletedAtPtr(shareLink.DeletedAt),
	}
}

func ShareOffersToResponses(shareOffers []models.ShareOffer) []ShareOfferResponse {
	responses := make([]ShareOfferResponse, 0, len(shareOffers))
	for i := range shareOffers {
		responses = append(responses, ShareOfferToResponse(&shareOffers[i]))
	}
	return responses
}

func ShareOfferEventsToResponses(events []models.ShareOfferEvent) []ShareOfferEventResponse {
	responses := make([]ShareOfferEventResponse, 0, len(events))
	for i := range events {
		responses = append(responses, ShareOfferEventToResponse(&events[i]))
	}
	return responses
}

func UsersToResponses(users []models.User) []UserResponse {
	responses := make([]UserResponse, 0, len(users))
	for i := range users {
		responses = append(responses, UserToResponse(&users[i]))
	}
	return responses
}

func UserLiteToResponse(user *models.UserLite) UserLiteRespone {
	resp := UserLiteRespone{
		ID:        user.ID,
		Name:      user.Name,
		Username:  user.Username,
		AvatarUrl: user.AvatarUrl,
		Props:     userPropsFromJSON(user.Props),
		Role:      "",
	}
	if user.Role != nil {
		resp.Role = user.Role.String()
	}
	if user.WorkspaceRole != nil {
		wsRole := user.WorkspaceRole.String()
		resp.WorkspaceRole = &wsRole
	}
	return resp
}

func ParseAuditFeedPayload(payloadJSON []byte, actionType string) AuditRenderPayloadResponse {
	var payload AuditRenderPayloadResponse
	if len(payloadJSON) > 0 {
		if err := json.Unmarshal(payloadJSON, &payload); err == nil {
			fmt.Printf("Parsed payload JSON: %+v\n", payload)
			if payload.Params == nil {
				payload.Params = map[string]interface{}{}
			}
			if payload.Links == nil {
				payload.Links = map[string]AuditEntityLinkResponse{}
			}
			if payload.TemplateKey == "" {
				payload.TemplateKey = "audit.legacy.event"
				payload.Params["actionType"] = actionType
			}
			return payload
		}
	}

	return AuditRenderPayloadResponse{
		TemplateKey: "audit.legacy.event",
		Params: map[string]interface{}{
			"actionType": actionType,
		},
		Links: map[string]AuditEntityLinkResponse{},
	}
}

func BoardAuditEventToResponse(event *models.BoardAuditEvent) BoardAuditLogEventResponse {
	return BoardAuditLogEventResponse{
		ID:             event.ID,
		BoardID:        event.BoardID,
		WorkspaceID:    event.WorkspaceID,
		ActorUserID:    event.ActorUserID,
		ActionType:     event.ActionType,
		MainEntityID:   event.MainEntityID,
		MainEntityType: event.MainEntityType,
		//Payload:     ParseAuditFeedPayload(event.Payload, event.ActionType),
		Payload:   event.Payload, // Keep as raw JSON for now, frontend can parse it when needed
		CreatedAt: event.CreatedAt,
	}
}

func BoardAuditEventsToResponses(events []models.BoardAuditEvent) []BoardAuditLogEventResponse {
	responses := make([]BoardAuditLogEventResponse, 0, len(events))
	for i := range events {
		responses = append(responses, BoardAuditEventToResponse(&events[i]))
	}
	return responses
}

func ListWatchToResponse(watch *models.ListWatch) ListWatchResponse {
	return ListWatchResponse{
		ID:          watch.ID,
		UserID:      watch.UserID,
		WorkspaceID: watch.WorkspaceID,
		ListID:      watch.ListID,
		BoardID:     watch.BoardID,
		Position:    watch.Pos,
		Active:      watch.Active,
		CreatedAt:   watch.CreatedAt,
		UpdatedAt:   watch.UpdatedAt,
		DeletedAt:   DeletedAtPtr(watch.DeletedAt),
	}
}

func CardWatchToResponse(watch *models.CardWatch) CardWatchResponse {
	return CardWatchResponse{
		ID:          watch.ID,
		UserID:      watch.UserID,
		WorkspaceID: watch.WorkspaceID,
		CardID:      watch.CardID,
		BoardID:     watch.BoardID,
		Position:    watch.Pos,
		Active:      watch.Active,
		CreatedAt:   watch.CreatedAt,
		UpdatedAt:   watch.UpdatedAt,
		DeletedAt:   DeletedAtPtr(watch.DeletedAt),
	}
}

func BoardWatchToResponse(watch *models.BoardWatch) BoardWatchResponse {
	return BoardWatchResponse{
		ID:          watch.ID,
		UserID:      watch.UserID,
		WorkspaceID: watch.WorkspaceID,
		BoardID:     watch.BoardID,
		Position:    watch.Pos,
		Active:      watch.Active,
		CreatedAt:   watch.CreatedAt,
		UpdatedAt:   watch.UpdatedAt,
		DeletedAt:   DeletedAtPtr(watch.DeletedAt),
	}
}

func ListWatchesToResponses(watches []models.ListWatch) []ListWatchResponse {
	responses := make([]ListWatchResponse, 0, len(watches))
	for i := range watches {
		responses = append(responses, ListWatchToResponse(&watches[i]))
	}
	return responses
}

func CardWatchesToResponses(watches []models.CardWatch) []CardWatchResponse {
	responses := make([]CardWatchResponse, 0, len(watches))
	for i := range watches {
		responses = append(responses, CardWatchToResponse(&watches[i]))
	}
	return responses
}

func BoardWatchesToResponses(watches []models.BoardWatch) []BoardWatchResponse {
	responses := make([]BoardWatchResponse, 0, len(watches))
	for i := range watches {
		responses = append(responses, BoardWatchToResponse(&watches[i]))
	}
	return responses
}

func BoardLabelToResponse(label *models.BoardLabel) BoardLabelResponse {
	return BoardLabelResponse{
		ID:              label.ID,
		BoardID:         label.BoardID,
		Title:           label.Title,
		Color:           label.Color,
		CreatedByUserID: label.CreatedByUserID,
		CreatedAt:       label.CreatedAt,
		UpdatedAt:       label.UpdatedAt,
		DeletedAt:       DeletedAtPtr(label.DeletedAt),
	}
}

func BoardLabelsToResponses(labels []models.BoardLabel) []BoardLabelResponse {
	responses := make([]BoardLabelResponse, 0, len(labels))
	for i := range labels {
		responses = append(responses, BoardLabelToResponse(&labels[i]))
	}
	return responses
}

func CardLabelLinkToResponse(link *models.CardLabelLink) CardLabelLinkResponse {
	return CardLabelLinkResponse{
		ID:           link.ID,
		CardID:       link.CardID,
		BoardID:      link.BoardID,
		BoardLabelID: link.BoardLabelID,
		CreatedAt:    link.CreatedAt,
		UpdatedAt:    link.UpdatedAt,
		DeletedAt:    DeletedAtPtr(link.DeletedAt),
	}
}

func CardLabelLinksToResponses(links []models.CardLabelLink) []CardLabelLinkResponse {
	responses := make([]CardLabelLinkResponse, 0, len(links))
	for i := range links {
		responses = append(responses, CardLabelLinkToResponse(&links[i]))
	}
	return responses
}

func CardMemberToResponse(member *models.CardMember) CardMemberResponse {
	return CardMemberResponse{
		ID:              member.ID,
		CardID:          member.CardID,
		UserID:          member.UserID,
		CreatedByUserID: member.CreatedByUserID,
		CreatedAt:       member.CreatedAt,
		UpdatedAt:       member.UpdatedAt,
		DeletedAt:       DeletedAtPtr(member.DeletedAt),
	}
}

func CardMembersToResponses(members []models.CardMember) []CardMemberResponse {
	responses := make([]CardMemberResponse, 0, len(members))
	for i := range members {
		responses = append(responses, CardMemberToResponse(&members[i]))
	}
	return responses
}

func ChecklistToResponse(checklist *models.Checklist) ChecklistResponse {
	return ChecklistResponse{
		ID:              checklist.ID,
		Title:           checklist.Title,
		CreatedByUserID: checklist.CreatedByUserID,
		CreatedInCardID: checklist.CreatedInCardID,
		CreatedAt:       checklist.CreatedAt,
		UpdatedAt:       checklist.UpdatedAt,
		DeletedAt:       DeletedAtPtr(checklist.DeletedAt),
	}
}

func ChecklistsToResponses(checklists []models.Checklist) []ChecklistResponse {
	responses := make([]ChecklistResponse, 0, len(checklists))
	for i := range checklists {
		responses = append(responses, ChecklistToResponse(&checklists[i]))
	}
	return responses
}

func EntryToResponse(entry *models.Entry) EntryResponse {
	return EntryResponse{
		ID:              entry.ID,
		Title:           entry.Title,
		Done:            entry.Done,
		DueDate:         entry.DueDate,
		CreatedByUserID: entry.CreatedByUserID,
		CreatedAt:       entry.CreatedAt,
		UpdatedAt:       entry.UpdatedAt,
		DeletedAt:       DeletedAtPtr(entry.DeletedAt),
	}
}

func EntriesToResponses(entries []models.Entry) []EntryResponse {
	responses := make([]EntryResponse, 0, len(entries))
	for i := range entries {
		responses = append(responses, EntryToResponse(&entries[i]))
	}
	return responses
}

func ChecklistEntryToResponse(checklistEntry *models.ChecklistEntry) ChecklistEntryResponse {
	return ChecklistEntryResponse{
		ID:          checklistEntry.ID,
		ChecklistID: checklistEntry.ChecklistID,
		EntryID:     checklistEntry.EntryID,
		Position:    checklistEntry.Pos,
		CreatedAt:   checklistEntry.CreatedAt,
		UpdatedAt:   checklistEntry.UpdatedAt,
		DeletedAt:   DeletedAtPtr(checklistEntry.DeletedAt),
	}
}

func ChecklistEntriesToResponses(checklistEntries []models.ChecklistEntry) []ChecklistEntryResponse {
	responses := make([]ChecklistEntryResponse, 0, len(checklistEntries))
	for i := range checklistEntries {
		responses = append(responses, ChecklistEntryToResponse(&checklistEntries[i]))
	}
	return responses
}

func CardChecklistToResponse(cardChecklist *models.CardChecklist) CardChecklistResponse {
	return CardChecklistResponse{
		ID:          cardChecklist.ID,
		CardID:      cardChecklist.CardID,
		ChecklistID: cardChecklist.ChecklistID,
		Position:    cardChecklist.Pos,
		CreatedAt:   cardChecklist.CreatedAt,
		UpdatedAt:   cardChecklist.UpdatedAt,
		DeletedAt:   DeletedAtPtr(cardChecklist.DeletedAt),
	}
}

func CardChecklistsToResponses(cardChecklists []models.CardChecklist) []CardChecklistResponse {
	responses := make([]CardChecklistResponse, 0, len(cardChecklists))
	for i := range cardChecklists {
		responses = append(responses, CardChecklistToResponse(&cardChecklists[i]))
	}
	return responses
}

func EntryMemberToResponse(entryMember *models.EntryMember) EntryMemberResponse {
	return EntryMemberResponse{
		ID:        entryMember.ID,
		EntryID:   entryMember.EntryID,
		UserID:    entryMember.UserID,
		CreatedAt: entryMember.CreatedAt,
		UpdatedAt: entryMember.UpdatedAt,
		DeletedAt: DeletedAtPtr(entryMember.DeletedAt),
	}
}

func EntryMembersToResponses(entryMembers []models.EntryMember) []EntryMemberResponse {
	responses := make([]EntryMemberResponse, 0, len(entryMembers))
	for i := range entryMembers {
		responses = append(responses, EntryMemberToResponse(&entryMembers[i]))
	}
	return responses
}

func CardCommentToResponse(comment *models.CardComment) CardCommentResponse {
	return CardCommentResponse{
		ID:              comment.ID,
		CardID:          comment.CardID,
		CommentMentions: CommentMentionsToResponses(comment.CommentMentions),
		Content:         comment.Content,
		CreatedByUserID: comment.CreatedByUserID,
		CreatedAt:       comment.CreatedAt,
		UpdatedAt:       comment.UpdatedAt,
		DeletedAt:       DeletedAtPtr(comment.DeletedAt),
	}
}

func CardCommentsToResponses(comments []models.CardComment) []CardCommentResponse {
	responses := make([]CardCommentResponse, 0, len(comments))
	for i := range comments {
		responses = append(responses, CardCommentToResponse(&comments[i]))
	}
	return responses
}

func CommentMentionsToResponses(mentions []models.CommentMention) []CommentMentionResponse {
	responses := make([]CommentMentionResponse, 0, len(mentions))
	for i := range mentions {
		responses = append(responses, CommentMentionToResponse(&mentions[i]))
	}
	return responses
}

func CommentMentionToResponse(mention *models.CommentMention) CommentMentionResponse {
	return CommentMentionResponse{
		CardCommentID:   mention.CardCommentID,
		MentionedUserID: mention.MentionedUserID,
		CreatedByUserID: mention.CreatedByUserID,
		CreatedAt:       mention.CreatedAt,
		UpdatedAt:       mention.UpdatedAt,
		DeletedAt:       DeletedAtPtr(mention.DeletedAt),
	}
}

func ListCardsToResponses(listCards []models.ListCard) []ListCardResponse {
	responses := make([]ListCardResponse, 0, len(listCards))
	for i := range listCards {
		responses = append(responses, ListCardToResponse(&listCards[i]))
	}
	return responses
}

func InboxCardsToResponses(inboxCards []models.UserInboxCard) []InboxCardResponse {
	responses := make([]InboxCardResponse, 0, len(inboxCards))
	for i := range inboxCards {
		responses = append(responses, InboxCardToResponse(&inboxCards[i]))
	}
	return responses
}

func InboxCardToResponse(inboxCard *models.UserInboxCard) InboxCardResponse {
	return InboxCardResponse{
		ID:             inboxCard.ID,
		UserID:         inboxCard.UserID,
		CardID:         inboxCard.CardID,
		Pos:            inboxCard.Pos,
		SourceBoardID:  inboxCard.SourceBoardID,
		RootListCardID: inboxCard.RootListCardID,
		CreatedAt:      inboxCard.CreatedAt,
		UpdatedAt:      inboxCard.UpdatedAt,
		DeletedAt:      DeletedAtPtr(inboxCard.DeletedAt),
	}
}

func ExternalRootRefToResponse(ref *models.ExternalRootRefRow) ExternalRootRefResponse {
	return ExternalRootRefResponse{
		RootListCardID: ref.RootListCardID,
		CardID:         ref.CardID,
		BoardID:        ref.BoardID,
		WorkspaceID:    ref.WorkspaceID,
		WorkspaceName:  ref.WorkspaceName,
		ListID:         ref.ListID,
		BoardName:      ref.BoardName,
		ListTitle:      ref.ListTitle,
		CardTitle:      ref.CardTitle,
		UpdatedAt:      ref.UpdatedAt,
	}
}

func ExternalRootRefsToResponses(refs []models.ExternalRootRefRow) []ExternalRootRefResponse {
	responses := make([]ExternalRootRefResponse, 0, len(refs))
	for i := range refs {
		responses = append(responses, ExternalRootRefToResponse(&refs[i]))
	}
	return responses
}
