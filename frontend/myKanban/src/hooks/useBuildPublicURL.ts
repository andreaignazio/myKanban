export function useBuildPublicURL() {
    const buildPublicURL = (path: string) => {
        return path.startsWith("/") ? path : `/${path}`
    }
    const buildPublicURLFromBoardID = (workspaceID: string, boardID: string) => {
        return buildPublicURL(`/workspaces/${workspaceID}/boards/${boardID}`)
    }

    const buildPublicURLFromCardID = (workspaceID: string, boardID: string, cardID: string) => {
        return buildPublicURL(`/workspaces/${workspaceID}/boards/${boardID}/cards/${cardID}`)
    }

    const buildPublicURLFromWorkspaceID = (workspaceID: string) => {
        return buildPublicURL(`/workspaces/${workspaceID}/boards`)
    }

    const buildPublicURLFromUserID = (userID: string, workspaceID?: string) => {
        if (workspaceID) {
            return buildPublicURL(`/workspaces/${workspaceID}/users/${userID}/activities`)
        }
        return buildPublicURL(`/users/${userID}/activities`)
    }


    return { buildPublicURL, buildPublicURLFromBoardID, buildPublicURLFromCardID, buildPublicURLFromWorkspaceID, buildPublicURLFromUserID }
}