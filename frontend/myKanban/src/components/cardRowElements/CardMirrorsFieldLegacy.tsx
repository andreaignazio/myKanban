import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import type { CardRouteState } from "../CardRow"
import { useExternalRefStore } from "@/stores/externaRefStore"
import { useUserInboxStore } from "@/stores/userInboxStore"
import { useListsStore } from "@/stores/listsStore"
import type { ExternalRootRef } from "@/stores/types"



type CardMirrorsFieldProps = {
    listcardID: string
    mode: "board" | "inbox-mirror" | "inbox"
    mirrors?: string[]
}

export const MirrorsLegacy = ({ listcardID, mode, mirrors }: CardMirrorsFieldProps) => {
    const buildPublicURL = useBuildPublicURL()
    const getInboxCardByRootCardID = useUserInboxStore((state) => state.getInboxCardByRootCardID)
    const listcardById = useBoardDetailStore((state) => state.listCardById)
    const isListCardInBoard = useBoardDetailStore((state) => state.isListCardInBoard)
    const rootsByRootId = useExternalRefStore((state) => state.rootsByRootId)
    const listsById = useListsStore((state) => state.listsById)

    const inboxCardMirrors = (listcardID: string) => {
        const inboxCard = getInboxCardByRootCardID(listcardID)
        return mirrors ? mirrors : inboxCard ? inboxCard.Mirrors || [] : []
    }

    const boardListcardMirrors = listcardById[listcardID]?.Mirrors || []

    const mirrorIds = mode === "board" ? boardListcardMirrors : inboxCardMirrors(listcardID)
    const Navigate = useNavigate()
    const location = useLocation()
    const workspaceID = useParams().workspaceId as string
    const boardID = useParams().boardId as string

    const listcard = listcardById[listcardID]
    const effectiveRootID = mode === "inbox-mirror" ? listcardID : listcard?.RootID
    const externalRoot: ExternalRootRef | undefined = effectiveRootID ? rootsByRootId[effectiveRootID] : undefined
    const isRootInCurrentBoard = mode === "board" && effectiveRootID
        ? isListCardInBoard(effectiveRootID, boardID)
        : false
    const isExternal = mode === "inbox-mirror" ? true : Boolean(effectiveRootID && !isRootInCurrentBoard)

    const externalRootBoardName = () => {
        if (!isExternal) return "Unknown Board"
        return externalRoot?.BoardName || "Unknown Board"
    }



    const internalRootListTitle = () => {
        if (isExternal) return "Unknown List"
        if (!listcard) return "Unknown List"
        if (!listcard.RootID) return "Unknown List"
        const rootListCard = listcardById[listcard.RootID ?? ""]
        if (!rootListCard) return "Unknown List"
        const rootList = listsById[rootListCard.ListID]
        return rootList ? rootList.Title : "Unknown List"
    }

    const label = isExternal ? externalRootBoardName() : internalRootListTitle()



    //const boardUrl = useBuildPublicURL().buildPublicURLFromBoardID(externalRoot?.WorkspaceID || "", externalRoot?.BoardID || "")

    //const listcardUrl = useBuildPublicURL().buildPublicURLFromCardID(workspaceID, boardID, listcard.CardID)

    const boardURL = () => {
        if (isExternal) {
            if (!externalRoot) return "#"
            return buildPublicURL.buildPublicURLFromBoardID(externalRoot.WorkspaceID, externalRoot.BoardID)
        } else {
            return "#"
        }
    }

    const cardURL = () => {
        if (!isExternal) {
            if (!listcard) return "#"

            return buildPublicURL.buildPublicURLFromCardID(workspaceID, boardID, listcard.CardID)
        } else {
            return "#"
        }
    }


    const sourceListID = () => {
        if (!isExternal) {
            if (!listcard) return null
            return listcard.ListID
        } else {
            return null
        }
    }

    const handleMirrorClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isExternal) {
            const nextState: CardRouteState = {
                backgroundLocation: location,
                sourceListId: sourceListID() ?? "",
                openedFrom: "card-row"
            }
            Navigate(cardURL(), { state: nextState })
        } else {
            Navigate(boardURL())
        }
    }

    const isRoot = () => {
        if (mode === "inbox-mirror") {
            return false
        } else if (mode === "board") {
            if (!listcard) return false
            return listcard.RootID === listcardID
        }
        return false
    }



    if (mirrorIds.length === 0) return null

    if (mode === "inbox") {
        return null
    }
    return (
        <>

            <div className="bg-transparent text-white pt-3 px-3">

                {true && (
                    <div
                        onClickCapture={handleMirrorClick}
                        className={`flex flex-row justify-start items-center w-fit gap-0 rounded-md
                text-xs border ${isRoot() ? "border-red-500" : "border-transparent"}
                 bg-neutral-500/50 px-1 py-0.5 me-1 cursor-pointer`}>
                        {isExternal && <div className="bg-black h-full w-6 items-center justify-center flex rounded-full me-2">
                            <span >R</span>
                        </div>}
                        <div className="flex flex-col">
                            {isExternal ? "IsExternal" : "IsInternal"}
                            <span className="text-[10px] font-extralight">{label}</span>

                        </div>
                    </div>

                )}
            </div>
        </>

    )
}