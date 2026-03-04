export type UserID = string;

export type ImageProps = {
    Type?: "color" | "image";
    Color?: string;
    Url?: string | null;
};

export type UserProps = {
    Avatar?: ImageProps;
    Initials?: string;
    Cover?: ImageProps;
    Bio?: string;
};

export type UserIdentity = {
    ID: UserID;
    Name: string;
    Username: string;
    AvatarUrl: string;
    Props?: UserProps;
};

export type UserRoleContext = {
    Role?: string | null;
    WorkspaceRole?: string | null;
};

export type UserLite = UserIdentity & UserRoleContext;

export type User = UserIdentity & {
    Email: string;
    Props: UserProps;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type AuditActor = Omit<UserLite, "Role"> & {
    Role: string;
};

export type AnyUser = User | UserLite | AuditActor;
