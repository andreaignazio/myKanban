import { Filter } from "lucide-react";
import { LabeledButtonPresetA } from "../buttons/labeledButton";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { CustomInput } from "../menuElements/CustomInput";
import { CardFilterMenu, type CardFilterShowCategory, type CardFilterState } from "../cardMenus/cardFilterMenu";

type FilterBarProps = {
    filterState: Partial<Pick<CardFilterState, "statusFilter">>;
    setFilterState: React.Dispatch<React.SetStateAction<Partial<Pick<CardFilterState, "statusFilter">>>>;
}

export function FilterBar({ filterState, setFilterState }: FilterBarProps) {

    const filterCategories: CardFilterShowCategory = {
        search: false,
        cardStatus: false,
        dueDate: false,
        board: false,
        activity: false,
        status: true,
    }

    return (
        <div className="flex flex-row h-9 gap-2">
            <CustomInput className="!h-full" />
            <CardRowMenuBtn
                menuComponent={({ onClose, ref }) => <CardFilterMenu onClose={onClose}
                    filterState={filterState} setFilterState={setFilterState}
                    boardMenuItems={[]} showCategory={filterCategories} />}

            >
                <LabeledButtonPresetA className="!h-full !px-2 items-center justify-center" label="" onClick={() => { }} >
                    <Filter size={18} className="translate-x-0.5" />
                </LabeledButtonPresetA>
            </CardRowMenuBtn>
        </div>
    )
}