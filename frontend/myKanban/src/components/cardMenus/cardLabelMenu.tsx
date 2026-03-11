import { forwardRef, useEffect, useState } from "react";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CustomInput } from "../menuElements/CustomInput";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import type { MenuItemExtended } from "@/types/uiTypes";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useParams } from "react-router";
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { useLabelsStore } from "@/stores/labelsStore";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";

type CardLabelsMenuProps = {
    onClose: () => void;
    cardID?: string;
    headless?: boolean;
}
const EMPTY_LABEL_IDS: string[] = [];
const PADDING_X = "14px";
export const CardLabelMenu = forwardRef<HTMLDivElement, CardLabelsMenuProps>(({ onClose, cardID, headless = false }, ref) => {
    const [activeTab, setActiveTab] = useState<"select" | "create" | "edit">("select");
    const [activeLabelId, setActiveLabelId] = useState<string | undefined>(undefined);

    const Title = activeTab === "select" ? "Select Label" : activeTab === "create" ? "Create Label" : "Edit Label";

    const content = (
        <>
            <div className="relative w-full h-full mb-3" />
            {activeTab === "select" ? <SelectCardLabelMenu onClose={onClose} setActiveTab={setActiveTab} setActiveLabelId={setActiveLabelId} cardID={cardID} />
                : activeTab === "create" ? <CreateBoardLabelMenu onClose={onClose} onSelect={() => setActiveTab("select")} />
                    : <CreateBoardLabelMenu onClose={onClose} mode="edit" labelId={activeLabelId}
                        onSelect={() => setActiveTab("select")} />}
        </>
    );

    if (headless) {
        return <div style={{ paddingTop: "10px", paddingInline: "0px" }}>{content}</div>;
    }

    const requestKeys: AsyncRequestKey[] = ["board:label:create", "board:label:edit", "board:label:delete", "card:label:add", "card:label:remove"];

    return (
        <ActionMenuWrapper Title={Title}
            requestGroups={[{
                requestKey: requestKeys,
                minLoadingMs: 0,
                minSuccessMs: 800,
                maxErrorMs: 3000,
                show: ["loading", "error", "success"]
            }]}
            onClose={onClose}
            onBack={activeTab != "select" ? () => setActiveTab("select") : undefined}
            width={300}
            style={{ paddingTop: "10px", paddingInline: "0px", }}
            titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
            {content}

        </ActionMenuWrapper>

    )
});

type SelectCardLabelMenuProps = {
    onClose: () => void;
    setActiveTab: (tab: "select" | "create" | "edit") => void;
    setActiveLabelId: (id: string | undefined) => void;
    cardID?: string;
}


export const SelectCardLabelMenu = forwardRef<HTMLDivElement, SelectCardLabelMenuProps>(({ onClose, setActiveTab, setActiveLabelId, cardID }, ref) => {
    const [searchInput, setSearchInput] = useState("");

    const input = () => {
        return (
            <div className=" py-2 text-gray-500">
                <CustomInput className={"h-[35px] mb-0"}
                    onInputChange={(inputRef) => {
                        setSearchInput(inputRef?.current?.value ?? "")
                    }} />
            </div>
        )
    }

    const createNewLabel = (label: string, onClick: () => void) => {
        return (
            <div className=" py-1">
                <LabeledButtonCustom label={label} onClick={onClick}
                    className="bg-menubtn rounded-md h-8 justify-center
                               font-medium text-[14px] tracking-wide" />
            </div>
        )
    }
    const menuItems: MenuItemExtended[] = [

        { id: "search", label: "Search Labels", kind: "custom", customElement: input },
        {
            id: "labels", label: "Labels", kind: "custom",
            customElement: () =>
                <CardLabelsSelector
                    cardID={cardID}
                    showCheckboxes={true}
                    searchQuery={searchInput}
                    onEditLabel={(id) => {
                        setActiveLabelId(id);
                        setActiveTab("edit");
                    }}
                />
        },
        {
            id: "create", label: "Create new label", kind: "custom",
            customElement: () => createNewLabel("Create new label",
                () => setActiveTab && setActiveTab("create"))
        },
        { id: "divider", label: "", kind: "divider", height: 5 },
        {
            id: "enableBlind", label: "Enable Color Blind", kind: "custom",
            customElement: () => createNewLabel("Enable Color Blind",
                () => console.log("Enable Color Blind mode"))
        },

    ]
    return (
        <>
            <div style={{ paddingInline: PADDING_X }}>
                <DropDown items={menuItems} onClick={onClose} />

            </div>
        </>

    )
});

type CardLabelSelectorProps = {
    onEditLabel?: (id: string) => void;
    cardID?: string;
    showCheckboxes?: boolean;
    searchQuery?: string;
}

export const CardLabelsSelector = ({ onEditLabel, cardID, showCheckboxes = true, searchQuery = "" }: CardLabelSelectorProps) => {
    const boardId = useParams().boardId as string;
    const cardId = cardID ?? (useParams().cardId as string);
    //const getBoardLabelsIds = useLabelsStore((state) => state.getLabelsIdsForBoard);
    //const getCardLabelsIds = useLabelsStore((state) => state.getLabelsIdsForCard);
    //const [boardLabelsIds, setBoardLabelsIds] = useState<string[]>([]);
    //const [cardLabelsIds, setCardLabelsIds] = useState<string[]>([]);
    const boardLabelsIds = useLabelsStore((state) => state.labelsIdsByBoardId[boardId] ?? EMPTY_LABEL_IDS);
    const cardLabelsIds = useLabelsStore((state) => {
        if (!cardId) return EMPTY_LABEL_IDS;
        return state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardId] ?? EMPTY_LABEL_IDS;
    });
    const boardLabelsById = useLabelsStore((state) => state.BoardLabelsById);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredBoardLabelsIds = normalizedQuery
        ? boardLabelsIds.filter((id) => {
            const title = boardLabelsById[id]?.Title ?? "";
            return title.toLowerCase().includes(normalizedQuery);
        })
        : boardLabelsIds;



    return (
        <>

            <div className="flex flex-col gap-1 py-1 pb-2">
                <span className="text-sm font-semibold text-gray-500 mb-2">Labels</span>
                {filteredBoardLabelsIds.map((id) => (
                    <CardLabelItem
                        key={id}
                        id={id}
                        onEditLabel={onEditLabel}
                        showCheckboxes={showCheckboxes}
                        cardLabelIds={cardLabelsIds}
                        cardID={cardID}
                    />
                ))}
            </div>
        </>
    )
}

type CardLabelItemProps = {
    id: string;
    onEditLabel?: (id: string) => void;
    showCheckboxes?: boolean;
    cardLabelIds?: string[];
    cardID?: string;
}
export const CardLabelItem = ({ id, onEditLabel, showCheckboxes = true, cardLabelIds, cardID }: CardLabelItemProps) => {
    const label = useLabelsStore((state) => state.BoardLabelsById[id]);
    const isCardLabelActive = cardLabelIds ? cardLabelIds.includes(id) : false;
    const addLabelToCard = useBoardActionRegistry().addCardLabel;
    const removeLabelFromCard = useBoardActionRegistry().removeCardLabel;
    const boardId = useParams().boardId as string;
    const cardId = cardID ?? (useParams().cardId as string);
    if (!label) return null;
    function handleAddOrRemoveLabel() {
        if (!showCheckboxes || !cardId) return;
        if (isCardLabelActive) {
            removeLabelFromCard(boardId, cardId, id);
        } else {
            addLabelToCard(boardId, cardId, id);
        }
    }


    return (
        <div className="flex flex-row items-center gap-2">
            {showCheckboxes && (
                <div
                    onClick={handleAddOrRemoveLabel}
                    className={`" flex items-center mx-1 justify-center bg-menusec h-[18px]
                    cursor-pointer
                 aspect-square border border-gray-300/30 rounded-sm ${isCardLabelActive ? "bg-blue-500" : ""}`}>
                    <CheckIcon className={`w-3 h-3 text-white ${isCardLabelActive ? "block" : "hidden"}`} />
                </div>
            )}
            <div className="flex items-center justify-center 
                     h-[32px] w-full border border-gray-500/30 rounded-md" style={{ backgroundColor: label.Color }} >
                <span className="font-medium tracking-wider text-sm"> {label.Title ?? ""}</span>
            </div>
            <div className="flex items-center justify-center mx-2 ">
                <PencilIcon onClick={() => onEditLabel?.(id)} className="w-4 h-4 text-white cursor-pointer" />
            </div>
        </div >
    )
}

type CreateBoardLabelMenuProps = {
    onSelect?: () => void;
    onClose: () => void;
    mode?: "create" | "edit";
    labelId?: string;
}

export const CreateBoardLabelMenu = forwardRef<HTMLDivElement, CreateBoardLabelMenuProps>(({ onSelect, onClose, mode = "create", labelId }, ref) => {

    const boardLabels = useLabelsStore((state) => state.BoardLabelsById);
    const [titleInput, setTitleInput] = useState("");
    const [activeColor, setActiveColor] = useState("");
    const createBoardLabel = useBoardActionRegistry().createBoardLabel;
    const updateBoardLabel = useBoardActionRegistry().updateBoardLabel;
    const deleteBoardLabel = useBoardActionRegistry().deleteBoardLabel;
    const boardId = useParams().boardId as string;

    useEffect(() => {
        if (mode === "edit" && labelId) {
            const label = boardLabels[labelId];
            if (label) {
                setTitleInput(label.Title ?? "");
                setActiveColor(label.Color);
            }
        }
    }, [mode, labelId, boardLabels]);

    const input = () => {

        return (
            <div className=" py-2 text-gray-500">
                <span className="text-sm text-gray-300 mb-4">Title</span>
                <CustomInput
                    value={titleInput}
                    className={"h-[35px] mb-0 mt-2"}
                    placeholder="Enter label title..."
                    onInputChange={(labelTitleRef) => {
                        labelTitleRef?.current &&
                            setTitleInput(labelTitleRef?.current.value)
                    }} />
            </div>
        )
    }
    const removeColorBtn = (label: string, onClick: () => void) => {
        return (
            <div className=" py-1 flex flex-col gap-0 mt-2">

                <LabeledButtonCustom label={label} onClick={onClick}
                    disabled={!activeColor}
                    iconAtLeft={true}
                    className={`bg-menubtn rounded-md h-8 justify-center
                    ${!activeColor ? " opacity-50 " : "hover:bg-gray-500/30"}
                               font-medium text-[14px] tracking-wide`} >
                    <XMarkIcon className="w-4 h-4 text-neutral-300" />
                </LabeledButtonCustom>
            </div>
        )
    }

    const footerBtnRow = (label: string, onClick: () => void) => {
        return (
            <div className=" py-1 flex flex-col gap-0 mt-0">
                <div className="flex flex-row justify-between items-center gap-2">

                    <LabeledButtonCustom label={`${mode === "create" ? "Create" : "Save"}`}
                        onClick={mode === "create" ? handleCreateLabel : handleUpdateLabel}
                        className=" relative grid-cols-1 rounded-md h-8 px-4
                         bg-blue-400 text-neutral-900  justify-center
                               font-medium text-[14px] tracking-wide" />
                    {mode === "edit" && <LabeledButtonCustom label={"Delete"} onClick={handleDeleteLabel}
                        className=" relative grid-cols-1 rounded-md h-8 px-4
                         bg-rose-400 text-neutral-900  justify-center
                               font-medium text-[14px] tracking-wide" />}

                </div>
            </div>
        )
    }

    const handleCreateLabel = () => {
        createBoardLabel(boardId, titleInput, activeColor)
            .then(() => {
                // console.log("Label created successfully");
                onSelect?.();
            })
    }

    const handleUpdateLabel = () => {
        if (labelId) {
            updateBoardLabel(boardId, labelId, titleInput, activeColor)
                .then(() => {
                    // console.log("Label updated successfully");
                    onSelect?.();
                })
        }
    }

    const handleDeleteLabel = () => {
        if (labelId) {
            deleteBoardLabel(boardId, labelId).then(() => {
                // console.log("Label deleted successfully");
                onSelect?.();
            })
        }
    }

    const colors = [
        "#0B5E3A", "#6A5200", "#7A3F00", "#7D261E", "#4D2765",
        "#1E7A4F", "#8A6A00", "#A35500", "#B62E24", "#7C3FA8",
        "#56C78E", "#E0B80F", "#FFB000", "#F26F63", "#B26DDD",
        "#184183", "#15576E", "#3A5B1F", "#5A294A", "#52565C",
        "#245FBF", "#2A7F9E", "#567E1F", "#97417F", "#6A6E75",
        "#6997DF", "#69B9D3", "#93C548", "#D16AAE", "#9FA3A9"
    ];
    const menuItems: MenuItemExtended[] = [

        {
            id: "labelPreviw", label: "Label preview", kind: "custom", customElement: () =>
                <LabelPreview title={titleInput || ""} color={activeColor} />
        },
        { id: "titleInput", label: "TitleInput", kind: "custom", customElement: input },
        {
            id: "colors", label: "Colors", kind: "custom",
            customElement: () => <ColorSelector colors={colors}
                activeColor={activeColor} setActiveColor={setActiveColor} />
        },
        {
            id: "remove", label: "Remove Color", kind: "custom",
            customElement: () => removeColorBtn("Remove Color", () => { setActiveColor("") })
        },
        { id: "divider", label: "", kind: "custom", customElement: () => <div className="w-full h-[1px] bg-gray-500/30 my-2" /> },
        {
            id: "createExex", label: "Create new label", kind: "custom",
            customElement: () => footerBtnRow("Create", handleCreateLabel)
        },

    ]
    return (
        <div style={{ paddingInline: PADDING_X }}>

            <DropDown items={menuItems} onClick={() => { }} />
        </div>
    )
});

export const LabelPreview = ({ title, color }: { title: string, color: string }) => {
    return (
        <div style={{ width: `calc(100% + ${PADDING_X} * 2)`, marginLeft: `-${PADDING_X}` }}
            className=" flex items-center justify-center h-[86px] w-full bg-[rgba(24,25,26,1)] gap-2 py-1">
            <div className="h-[32px] w-[220px] rounded-md flex items-center justify-center"
                style={color ? { backgroundColor: color } : { border: "1px solid #ccc" }} >
                <span className="font-medium tracking-wider"> {title}</span>
            </div>

        </div>)
}

type ColorSelectorProps = {
    colors: string[],
    activeColor: string,
    setActiveColor: (color: string) => void
}

export const ColorSelector = ({ colors, activeColor, setActiveColor }: ColorSelectorProps) => {
    return (
        <div className="flex flex-col gap-1 pt-1">
            <span className="text-sm text-gray-300 mb-2">Select a color</span>
            <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                    <div key={color} className={`h-[32px] w-full rounded-[4px] cursor-pointer ${activeColor === color ? "ring-2 ring-offset-2 ring-gray-300" : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setActiveColor(color)}
                    />
                ))}
            </div>
        </div>
    )
}
