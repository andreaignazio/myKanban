import type { Board, User, UserBoard, Workspace, WorkspaceSubscription } from "./types";
import type { WorkspaceMemberData } from "./wsMembersStore";

export type ShareOffer = {
    ID: string;
    TargetType: string;
    TargetID: string;
    FromUserID: string;
    ToUserID: string;
    OfferedRole: "owner" | "admin" | "member" | "viewer";
    Status: "pending" | "accepted" | "rejected" | "revoked";
    Kind?: string;
    Message: string;
    DecidedByUserID?: string | null;
    DecidedAt?: string | null;
    CreatedAt: string;
    UpdatedAt?: string;
    DeletedAt?: string | null;
};

export type WorkspaceDetailResponse = {
    Workspace: Workspace;
    WorkspaceMembers: WorkspaceMemberData[];
    WorkspaceSubscription: WorkspaceSubscription;
};

export type ShareOfferDetailsResponse = {
    ShareOffer: ShareOffer;
    TargetWorkspaceDetails: WorkspaceDetailResponse;
};

export type WorkspaceOutgoingShareOfferResponse = {
    ShareOffer: ShareOffer;
    Users: User[];
};

export type BoardMemberResponse = {
    User: User;
    UserBoardRelation: UserBoard;
};

export type BoardOfferDetailResponse = {
    Board: Board;
    BoardMembers: BoardMemberResponse[];
};

export type UserBoardShareOffersDetails = {
    ShareOffer: ShareOffer;
    TargetBoardDetails: BoardOfferDetailResponse;
    TargetWorkspaceDetails: WorkspaceDetailResponse;
};

export type ShareOfferDetailsByIDResponse = {
    InvolvedUsers: User[];
} & Pick<ShareOfferDetailsResponse, "ShareOffer"> &
    Partial<Pick<ShareOfferDetailsResponse, "TargetWorkspaceDetails">> &
    Partial<Pick<UserBoardShareOffersDetails, "TargetBoardDetails">>;

export type BoardShareOfferWithUserDetails = {
    ShareOffer: ShareOffer;
    User: User[];
}
