import { forwardRef, useEffect } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { useCardMirrorsStore } from "@/stores/cardMirrorsStore";
import { useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { useBoardBackground } from "@/hooks/useBoardBackground";

type CardMirrorsMenuProps = {
    cardId: string;
    listCardId?: string;
    onClose: () => void;
}

export const CardMirrorsMenu = forwardRef<HTMLDivElement, CardMirrorsMenuProps>(({
    cardId, listCardId, onClose }, ref) => {

    const workspaceId = useParams().workspaceId as string
    const fetchMirrorData = useCardMirrorsStore(state => state.fetchCardMirrors)
    useEffect(() => {
        if (cardId && workspaceId) {
            fetchMirrorData(workspaceId, cardId);
        }
    }, [cardId, workspaceId, fetchMirrorData]);

    const mirrorIds = useCardMirrorsStore(useShallow((state) => state.boardListCardIdsByCardId[cardId] ?? []))

    return (
        <CommonMenuWrapper

            onClose={onClose} className="!w-[400px] h-[250px] min-h-0"
            ref={ref}>
            <div className="flex flex-col w-full p-4
             ">
                <div className="">Mirrors</div>
                {mirrorIds.length === 0 &&
                    <div className="text-sm text-neutral-500 mt-2">
                        No mirrors for this card</div>}
                {mirrorIds.map(mirrorId => (
                    <MirrorRow key={mirrorId} mirrorId={mirrorId} />
                ))}
            </div>

        </CommonMenuWrapper>

    )

})

const MirrorRow = ({ mirrorId }: { mirrorId: string }) => {
    const mirrorData = useCardMirrorsStore(useShallow(state => state.getMirrorRenderDataForBoardListCard(mirrorId)))

    if (!mirrorData) return null

    const { backgroundType, backgroundColorClassName, backgroundImageUrl } = useBoardBackground({ board: mirrorData.board })

    return (
        <div className="p-2 rounded hover:bg-neutral-600/20 cursor-pointer">
            <div className="font-medium">{mirrorData.board.Name}</div>
            <div className="text-sm text-neutral-500">{mirrorData.list.Title}</div>
        </div>
    )
}