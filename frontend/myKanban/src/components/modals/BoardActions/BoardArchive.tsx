import { LabeledButtonPresetA } from "@/components/buttons/labeledButton"
import { CustomInput } from "@/components/menuElements/CustomInput"
import { ConfirmDeletionPopover } from "@/components/modals/ConfirmDeletion"
import { useLookUpInterface } from "@/hooks/useLookUpInterface"
import { useArchivedEntitiesStore } from "@/stores/archivedEntitiesStore"
import { useUiStore, type DomainModalData } from "@/stores/uiStore"
import { RotateCcw, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { useShallow } from "zustand/shallow"


type BoardArchiveProps = {
    boardID: string;
}
export const BoardArchive = ({ boardID }: BoardArchiveProps) => {

    const [activeTab, setActiveTab] = useState<"cards" | "lists">("cards")
    const [searchQuery, setSearchQuery] = useState("")

    const fetchArchivedByBoardId = useArchivedEntitiesStore((state) => state.fetchArchivedByBoardId)

    useEffect(() => {
        fetchArchivedByBoardId(boardID)
    }, [boardID, fetchArchivedByBoardId])

    const archivedListCardIds = useArchivedEntitiesStore(useShallow((state) => state.listCardIdsByBoardId[boardID] ?? []))
    const archivedBoardListIds = useArchivedEntitiesStore(useShallow((state) => state.boardListIdsByBoardId[boardID] ?? []))

    const IdsToRender = activeTab === "cards" ? archivedListCardIds : archivedBoardListIds


    const { getLookupForType } = useLookUpInterface(boardID)
    const lookup = getLookupForType(activeTab === "cards" ? "archivedCard" : "archivedList")

    const filteredIds = IdsToRender.filter((id) => {

        const title = lookup.getTitle(id)
        return title.toLowerCase().includes(searchQuery.toLowerCase())
    })





    return (
        <div className="flex flex-col h-[400px] min-h-0 w-full items-stretch px-4 pt-4">
            <div className="flex flex-row h-10 w-full items-center justify-center gap-2">
                <CustomInput
                    onInputChange={(input) => setSearchQuery(input?.current?.value ?? "")}
                    className={"rounded-md !min-h-0 !h-full"} />
                <LabeledButtonPresetA label={activeTab === "cards" ? "Cards" : "Lists"}
                    onClick={() => {
                        if (activeTab !== "cards") {
                            setActiveTab("cards")
                        } else {
                            setActiveTab("lists")
                        }
                    }}
                    className="!h-full !w-24 " />
            </div>
            <div className="flex-1 min-h-0 flex flex-col mt-4 gap-0 w-full overflow-y-auto scrollbar-hidden">
                {IdsToRender.map((id) => {
                    const shouldShow = filteredIds.includes(id)
                    return (<div className={`${shouldShow ? "opacity-100" : "opacity-0 h-0 overflow-hidden"} transition-all duration-200 ease-in-out`}>

                        {activeTab === "cards"
                            ? <ArchivedItemRow key={id} id={id} type="archivedCard" boardID={boardID} />
                            : <ArchivedItemRow key={id} id={id} type="archivedList" boardID={boardID} />}

                    </div>)
                })}
            </div>


        </div>
    )
}

type ArchivedItemRowProps = {
    id: string;
    type: "archivedCard" | "archivedList"
    boardID: string;
}
const ArchivedItemRow = ({ id, type, boardID }: ArchivedItemRowProps) => {

    const { getLookupForType } = useLookUpInterface(boardID)
    const setDomainModalOpen = useUiStore((state) => state.setDomainModalOpen)

    const lookup = getLookupForType(type)
    const title = lookup.getTitle(id)

    const deleteWithConfirm = () => {
        const data: DomainModalData = {
            componentent: (onClose) => (
                <ConfirmDeletionPopover
                    onClose={onClose}
                    onSubmit={async () => {
                        await lookup.delete?.(id)
                        onClose()
                    }}
                    title={`Delete ${type === "archivedCard" ? "card" : "list"}?`}
                    body="This will remove the item from the archive list. This action cannot be undone from this panel."
                    submitLabel="Delete"
                />
            ),
            anchorRef: null,
            renderType: "virtual",
        }
        setDomainModalOpen(true, data)
    }

    return (
        <div className="flex flex-col">
            <div className="flex flex-row   text-gray-300 items-center h-9 justify-between  rounded-md ">

                <span className="text-[14px]">{title}</span>
                <div className="flex flex-row gap-1 ">
                    <LabeledButtonPresetA label="Restore" onClick={() => {
                        lookup.restore?.(id)
                    }} className="!h-full !rounded-[4px] gap-2 
                    transition-all ease-in-out duration-300
                      !px-2" >
                        <RotateCcw className="w-3 h-3 text-white" />
                    </LabeledButtonPresetA>
                    <LabeledButtonPresetA label="" onClick={() => {
                        deleteWithConfirm()
                    }} className="!gap-0 transition-all ease-in-out duration-300
                !h-full !aspect-square !rounded-[4px] !px-2  hover:bg-red-700/50" >
                        <Trash className="w-3 h-3 text-inherit" />
                    </LabeledButtonPresetA>
                </div>

            </div>
            <div className="w-full h-px bg-gray-300/10 my-1.5" />
        </div>
    )


}