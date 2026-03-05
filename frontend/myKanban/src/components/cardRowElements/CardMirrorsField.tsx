import { api } from "@/api/api"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import { ActionMenuWrapper } from "@/components/modals/ActionMenuWrapper"
import { getClassNamesForColorToken, gradientColorTokens } from "@/domain/colorTokens"
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useBoardsStore } from "@/stores/boardsStore"
import { useExternalRefStore } from "@/stores/externaRefStore"
import { useUserInboxStore } from "@/stores/userInboxStore"
import type { ExternalRootRef } from "@/stores/types"
import { useEffect, useState, type RefObject } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { MirrorDetailsMenu } from "@/components/cardRowElements/MirrorDetailsMenu"



type CardMirrorsFieldProps = {
    listcardID: string
    mode: "board" | "inbox-mirror" | "inbox"
    mirrors?: string[]
    placement?: "default" | "cover"
}

type ListCardMirrorReference = {
    BoardListID: string
    BoardID: string
    WorkspaceID: string
    BoardName: string
    IsRootList: boolean
    ListCardID: string
    RootListCardID: string
    ListID: string
    ListTitle: string
    CardID: string
    CardTitle: string
    IsRoot: boolean
    IsCurrent: boolean
}

type ListCardMirrorsResponse = {
    RootListCardID: string
    CurrentListCardID: string
    Items: ListCardMirrorReference[]
}

type MirrorDetailsMenuProps = {
    ref: RefObject<HTMLDivElement | null>
    boardID: string
    listCardID: string
    onClose: () => void
}

function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0

    let hash = 0
    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0
    }

    return hash % length
}



export const Mirrors = ({ listcardID, mode, mirrors, placement = "default" }: CardMirrorsFieldProps) => {
    const getInboxCardByRootCardID = useUserInboxStore((state) => state.getInboxCardByRootCardID)
    const listcardById = useBoardDetailStore((state) => state.listCardById)
    const isListCardInBoard = useBoardDetailStore((state) => state.isListCardInBoard)
    const rootsByRootId = useExternalRefStore((state) => state.rootsByRootId)

    const inboxCardMirrors = (listcardID: string) => {
        const inboxCard = getInboxCardByRootCardID(listcardID)
        return mirrors ? mirrors : inboxCard ? inboxCard.Mirrors || [] : []
    }

    const boardListcardMirrors = listcardById[listcardID]?.Mirrors || []

    const mirrorIds = mode === "board" ? boardListcardMirrors : inboxCardMirrors(listcardID)
    const { boardId } = useParams<{ workspaceId?: string; boardId?: string }>()
    const boardID = boardId ?? ""
    const currentBoardName = useBoardsStore((state) => boardID ? state.boardsById[boardID]?.Name : undefined)

    const listcard = listcardById[listcardID]
    const rootListCardID = mode === "inbox-mirror"
        ? listcardID
        : (listcard?.RootID || listcardID)

    const externalRoot: ExternalRootRef | undefined = rootListCardID ? rootsByRootId[rootListCardID] : undefined
    const isRoot = rootListCardID === listcardID
    const isRootInCurrentBoard = rootListCardID && boardID
        ? isListCardInBoard(rootListCardID, boardID)
        : false

    const badgeCode = mode === "inbox-mirror" ? "I" : isRoot ? "R" : isRootInCurrentBoard ? "M" : "E"
    const isMirrorBadge = badgeCode !== "R"
    const externalRootBoardName = externalRoot?.BoardName?.trim() ? externalRoot.BoardName : undefined
    const rootBoardID = badgeCode === "M" ? boardID : (externalRoot?.BoardID ?? "")
    const rootBoard = useBoardsStore((state) => rootBoardID ? state.boardsById[rootBoardID] : undefined)
    const rootBoardNameFromStore = rootBoard?.Name?.trim() ? rootBoard.Name : undefined
    const resolvedRootBoardName = badgeCode === "M"
        ? currentBoardName
        : (externalRootBoardName ?? rootBoardNameFromStore)
    const hoverBoardName = isMirrorBadge ? resolvedRootBoardName : undefined
    const showMirrorBoardVisuals = isMirrorBadge && (!!rootBoardID || !!resolvedRootBoardName)
    const rootBoardBackgroundType = rootBoard?.Props?.Background?.Type
    const rootBoardBgImage = rootBoardBackgroundType === "image" ? rootBoard?.Props?.Background?.Image?.Url : undefined
    const rootBoardBgColorToken = rootBoardBackgroundType === "color" ? rootBoard?.Props?.Background?.Color?.Token : undefined
    const rootBoardBgColorClass = rootBoardBgColorToken ? getClassNamesForColorToken(rootBoardBgColorToken) : undefined
    const fallbackGradient = gradientColorTokens[getStableIndexFromString(rootBoard?.ID ?? rootBoardID ?? "fallback", gradientColorTokens.length)]
    const fetchBoardID = boardID || externalRoot?.BoardID || ""
    const fetchListCardID = mode === "board" ? listcardID : rootListCardID
    const menuId = `card-mirror-menu-${mode}-${fetchBoardID}-${fetchListCardID}`
    const wrapperClassName = placement === "cover"
        ? "absolute top-1 left-2 z-20 text-white"
        : "bg-transparent text-white pt-3 px-3"

    if (mirrorIds.length === 0) return null

    if (mode === "inbox") {
        return null
    }

    if (!fetchBoardID || !fetchListCardID) {
        return (
            <div className={wrapperClassName}>
                <div
                    title={hoverBoardName}
                    className={`${showMirrorBoardVisuals
                        ? "h-6 max-w-[170px] px-2 gap-1"
                        : "w-6 h-6"
                        } flex items-center justify-center rounded-md  bg-neutral-700/45 text-[11px] font-semibold`}
                >
                    {showMirrorBoardVisuals && (
                        <ImageColorRenderer
                            overrideClassName
                            className="h-3.5 w-3.5 rounded-[3px] overflow-hidden shrink-0"
                            bgImage={rootBoardBgImage}
                            bgColor={rootBoardBgColorClass}
                            fallbackGradient={fallbackGradient}
                            backgroundType={rootBoardBackgroundType ?? null}
                        />
                    )}
                    <span>{badgeCode}</span>
                    {resolvedRootBoardName && (
                        <span className="truncate text-[10px] font-medium">{resolvedRootBoardName}</span>
                    )}
                </div>
            </div>
        )
    }

    const size = "26px"
    return (
        <div className={wrapperClassName}>
            <CardRowMenuBtn
                wrapperClassName="w-fit"
                customId={menuId}
                desiredBackdropOpacity={0}
                placement="bottom-start"
                exclusiveGroup="card-detail-modal"
                menuComponent={({ ref, onClose }) => (
                    <MirrorDetailsMenu
                        ref={ref}
                        boardID={fetchBoardID}
                        listCardID={fetchListCardID}
                        onClose={onClose}
                    />
                )}
            >
                <div
                    title={hoverBoardName}
                    className={`${showMirrorBoardVisuals
                        ? `h-[30px] max-w-[170px] p-0  gap-1 w-fit pe-2`
                        : "w-6 h-6"
                        } flex items-center justify-start rounded-[7px] 400/70 p-0.5
                         bg-neutral-700/45 text-[11px] 
                         font-semibold cursor-pointer hover:bg-neutral-700/70`}
                >
                    {showMirrorBoardVisuals && (
                        <ImageColorRenderer
                            style={{ width: size, height: size }}
                            overrideClassName
                            className={` rounded-[6px] overflow-hidden shrink-0`}
                            bgImage={rootBoardBgImage}
                            bgColor={rootBoardBgColorClass}
                            fallbackGradient={fallbackGradient}
                            backgroundType={rootBoardBackgroundType ?? null}
                        />
                    )}
                    {!resolvedRootBoardName && <div className="flex flex-col ms-1.5 items-center justify-center">
                        {badgeCode}
                    </div>}
                    {resolvedRootBoardName && (
                        <div className="flex flex-col items-start">
                            <span className="truncate text-[10px] font-medium">{resolvedRootBoardName}</span>
                            <span className="text-[10px] font-extralight">{isRoot ? "Root Card" : "Mirror Card"}</span>
                        </div>
                    )}
                </div>
            </CardRowMenuBtn>
        </div>

    )
}