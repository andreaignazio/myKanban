export const ASYNC_REQUEST_BASE_KEYS = [
    "board:member:edit:role",
    "board:member:delete",
    "board:shareoffer:create",
    "board:sharelink:create",
    "board:sharelink:revoke",
    "board:member:fetch",
    "board:edit:visibility",
    "board:edit:background:color",
    "board:edit:background:image",
    "userboard:edit:starred",
    "board:close",
    "board:label:create",
    "board:label:edit",
    "board:label:delete",
    "card:label:add",
    "card:label:remove",
    "board:archive:fetch",
    "board:archive:list:restore",
    "board:archive:card:restore",
    "board:archive:list:purge",
    "board:archive:card:purge",
] as const;

export type AsyncRequestBaseKey = typeof ASYNC_REQUEST_BASE_KEYS[number];

/** A known base key, or a composite key starting with a known base: "base:instanceID" */
export type AsyncRequestKey =
    | AsyncRequestBaseKey
    | `${AsyncRequestBaseKey}:${string}`