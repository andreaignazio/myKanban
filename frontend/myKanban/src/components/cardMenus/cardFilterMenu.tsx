import type { MenuItemExtended } from "@/types/uiTypes"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { CustomInput } from "../menuElements/CustomInput"
import { DropDown } from "../menuElements/DropDown"
import { forwardRef, type SetStateAction } from "react"
import { CustomDropDown, type MenuItem } from "../menuElements/CustomDropDown"
import { headerStyle } from "./cardMenuStyle"
import { useOverlayStore } from "@/overlays/overlayStore"
import { FunnelX } from "lucide-react"



export type AsDoneFilter = "markedAsDone" | "notMarkedAsDone" | null;
export type DueDateFilter = "overdue" | "dueInNextDay" | "dueInNextWeek" | "dueInNextMonth" | null;
export type ActivityFilter = "activeInLastDay" | "activeInLastWeek" | "activeInLastMonth" | "activeInLastYear" | null;
export type StatusFilter = "accessible" | "offered" | "requested" | null;

export type CardFilterState = {
    asDoneFilter: AsDoneFilter;
    dueDateFilter: DueDateFilter;
    activityFilter: ActivityFilter;
    statusFilter: StatusFilter;
    searchQuery: string;
    selectedBoardId: string | null;
}

export type ToggleFilterKey = "asDoneFilter" | "dueDateFilter" | "activityFilter" | "statusFilter";
export type ToggleFilterValue = AsDoneFilter | DueDateFilter | ActivityFilter | StatusFilter;

export type CardFilterShowCategory = {
    search: boolean;
    cardStatus: boolean;
    dueDate: boolean;
    board: boolean;
    activity: boolean;
    status: boolean;
}

type CardFilterMenuProps = {
    onClose: () => void;
    filterState: Partial<CardFilterState>;
    setFilterState: (updater: SetStateAction<Partial<CardFilterState>>) => void;
    boardMenuItems: MenuItem[];
    showCategory?: Partial<CardFilterShowCategory>;
}

export const CardFilterMenu = forwardRef<HTMLDivElement, CardFilterMenuProps>(({ onClose, filterState, setFilterState, boardMenuItems, showCategory }, ref) => {
    const triggerOverlayUpdate = useOverlayStore((state) => state.triggerUpdate)

    const updateFilterState = (updater: SetStateAction<Partial<CardFilterState>>) => {
        setFilterState(updater);
        requestAnimationFrame(() => triggerOverlayUpdate());
    };

    const handleCheckboxChange = (filterType: ToggleFilterKey, value: ToggleFilterValue) => {
        updateFilterState((prevState) => {
            if (prevState[filterType] === value) {
                return { ...prevState, [filterType]: null };
            }

            return { ...prevState, [filterType]: value?.toString() || null };
        });
    };

    const handleInputChange = (value: string) => {
        updateFilterState((prevState) => ({ ...prevState, searchQuery: value }));
    };

    const handleBoardSelect = (boardId: string) => {
        if (boardId === "all") {
            updateFilterState((prevState) => ({ ...prevState, selectedBoardId: null }));
            return;
        }
        updateFilterState((prevState) => ({ ...prevState, selectedBoardId: boardId }));
    }

    const hasActiveFilters = !!filterState.asDoneFilter
        || !!filterState.dueDateFilter
        || !!filterState.activityFilter
        || !!filterState.statusFilter
        || !!filterState.searchQuery?.trim()
        || !!filterState.selectedBoardId

    const resetFilters = () => {
        updateFilterState(() => ({
            asDoneFilter: null,
            dueDateFilter: null,
            activityFilter: null,
            statusFilter: null,
            searchQuery: "",
            selectedBoardId: null,
        }))
    }

    const PADDING_S = 16
    const customStyle: React.CSSProperties = {
        padding: `4px ${'3'}px`,
        fontSize: "13px",
        marginTop: 12
    }
    const entiresClassName = `!font-medium !text-neutral-300`
    const entriesStyle: React.CSSProperties = {
        color: "rgb(183,183,183)",
        fontWeight: 450,
        fontSize: "15px",
        marginLeft: -10
    }
    const resolvedShowCategory: CardFilterShowCategory = {
        search: true,
        cardStatus: false,
        dueDate: true,
        board: true,
        activity: true,
        status: true,
        ...showCategory,
    }

    const menuItems: MenuItemExtended[] = [
        { id: "headerCard", label: "Card", kind: "header", style: { ...headerStyle, ...customStyle } },
    ]

    if (resolvedShowCategory.search) {
        menuItems.push({
            id: "search", label: "Search cards", kind: "custom",
            customElement: () => {
                return (
                    <div style={{
                        width: `calc(100% - ${PADDING_S * 2}px)`
                    }}
                        className="relative flex flex-row w-full items-center justify-center"
                    >
                        <CustomInput paddingLeft={8}
                            className={` !w-[300px] !max-w-none  !h-9`}
                            value={filterState.searchQuery ?? ""}
                            onInputChange={(ref) => handleInputChange(ref?.current?.value || "")} placeholder="Search..."
                        />
                    </div>)
            }

        })
    }

    if (resolvedShowCategory.cardStatus) {
        menuItems.push(
            { id: "CardStatus", label: "Card Status", kind: "header", style: { ...headerStyle, ...customStyle } },
            {
                id: "MarkedAsDone", label: "Marked as done", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.asDoneFilter === "markedAsDone",
                onChange: () => { handleCheckboxChange("asDoneFilter", "markedAsDone"); }
            },
            {
                id: "NotMarkedAsDone", label: "Not marked as done", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.asDoneFilter === "notMarkedAsDone",
                onChange: () => { handleCheckboxChange("asDoneFilter", "notMarkedAsDone"); }
            }
        )
    }

    if (resolvedShowCategory.dueDate) {
        menuItems.push(
            { id: "DueDate", label: "Due Date", kind: "header", style: { ...headerStyle, ...customStyle } },
            {
                id: "Overdue", label: "Overdue", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.dueDateFilter === "overdue",
                onChange: () => { handleCheckboxChange("dueDateFilter", "overdue"); }
            },
            {
                id: "DueInNextDays", label: "Due in the next day", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.dueDateFilter === "dueInNextDay",
                onChange: () => { handleCheckboxChange("dueDateFilter", "dueInNextDay"); }
            },
            {
                id: "DueInNextWeek", label: "Due in the next week", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.dueDateFilter === "dueInNextWeek",
                onChange: () => { handleCheckboxChange("dueDateFilter", "dueInNextWeek"); }
            },
            {
                id: "DueInNextMonth", label: "Due in the next month", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.dueDateFilter === "dueInNextMonth",
                onChange: () => { handleCheckboxChange("dueDateFilter", "dueInNextMonth"); }
            }
        )
    }

    if (resolvedShowCategory.board) {
        menuItems.push(
            { id: "board", label: "Board", kind: "header", style: { ...headerStyle, ...customStyle } },
            {
                id: "boardDropdown", label: "Select board", kind: "custom",
                customElement: () => {
                    return (
                        <div style={{
                            width: `calc(100% - ${PADDING_S * 2}px)`
                        }}>
                            <CustomDropDown
                                className="!text-sm font-semibold !text-neutral-400 !h-9"
                                btnId="boardFilterSelector" items={boardMenuItems} onClick={(id) => handleBoardSelect(id)} />
                        </div>
                    )
                }
            }
        )
    }

    if (resolvedShowCategory.activity) {
        menuItems.push(
            { id: "activity", label: "Activity", kind: "header", style: { ...headerStyle, ...customStyle } },
            {
                id: "ActiveInLastDay", label: "Active in the last day", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.activityFilter === "activeInLastDay",
                onChange: () => { handleCheckboxChange("activityFilter", "activeInLastDay"); }
            },
            {
                id: "ActiveInLastWeek", label: "Active in the last week", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.activityFilter === "activeInLastWeek",
                onChange: () => { handleCheckboxChange("activityFilter", "activeInLastWeek"); }
            },
            {
                id: "ActiveInLastMonth", label: "Active in the last month", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.activityFilter === "activeInLastMonth",
                onChange: () => { handleCheckboxChange("activityFilter", "activeInLastMonth"); }
            },
            {
                id: "ActiveInLastYear", label: "Active in the last year", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.activityFilter === "activeInLastYear",
                onChange: () => { handleCheckboxChange("activityFilter", "activeInLastYear"); }
            },
        )
    }

    if (resolvedShowCategory.status) {
        menuItems.push(
            { id: "status", label: "Status", kind: "header", style: { ...headerStyle, ...customStyle } },
            {
                id: "StatusAccessible", label: "Accessible", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.statusFilter === "accessible",
                onChange: () => { handleCheckboxChange("statusFilter", "accessible"); }
            },
            {
                id: "StatusOffered", label: "Offered", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.statusFilter === "offered",
                onChange: () => { handleCheckboxChange("statusFilter", "offered"); }
            },
            {
                id: "StatusRequested", label: "Requested", kind: "checkbox",
                style: entriesStyle,
                checked: filterState.statusFilter === "requested",
                onChange: () => { handleCheckboxChange("statusFilter", "requested"); }
            },
        )
    }




    return (
        <CommonMenuWrapper>
            <div className="flex flex-col  w-full pt-4">
                <div className="mb-2 px-3 flex items-center justify-between">
                    <span className="text-sm text-neutral-400 font-bold flex justify-center text-center">Filter cards</span>
                    <button
                        type="button"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${hasActiveFilters ? "text-neutral-300 hover:text-neutral-100 hover:bg-white/10" : "text-neutral-500/50 cursor-default"}`}
                        aria-label="Reset filters"
                        title="Reset filters"
                    >
                        <FunnelX className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-2 py-2">
                    <div className={`flex flex-row w-[300px] items-center
             justify-between px-[${PADDING_S}px] py-4 `}>
                        <DropDown items={menuItems} />
                    </div>
                </div>
            </div>

        </CommonMenuWrapper>
    )
})