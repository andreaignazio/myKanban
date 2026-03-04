import { forwardRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry";
import { listCover } from "@/domain/colorTokens";

type ListColorSelectorProps = {
    boardID?: string;
    listID?: string;
    disabled?: boolean;
}

export const ListColorSelector = forwardRef<HTMLDivElement, ListColorSelectorProps>(({ boardID, listID, disabled = false }, ref) => {
    const listActions = useListActionRegistry();

    const handleSetColor = (color: string | null) => {
        if (disabled) {
            return
        }
        if (!boardID || !listID) {
            return
        }
        listActions.setListColor(boardID, listID, color)
    }

    return (
        <>
            <div className={`px-3 ${disabled ? "opacity-50" : ""}`}>
                <div className="w-full h-px bg-border my-2" />
                <div className="text-xs font-normal ">Select a color for this list</div>

                <div className="grid grid-cols-5 gap-2 my-2 ">
                    {listCover.map((theme) => (
                        <div
                            key={theme.bg}
                            className={` h-6 rounded-sm ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                            style={{ backgroundColor: theme.bg }}
                            onClick={() => handleSetColor(theme.bg)}
                        ></div>
                    ))}
                </div>

                <LabeledButtonCustom label="Remove Color" onClick={() => handleSetColor(null)}
                    className="text-xs my-3 bg-menubtn rounded-md h-8 justify-center font-inter
                            font-normal tracking-wider" >
                    <XMarkIcon className="w-4 h-4 text-white" />
                </LabeledButtonCustom>
                <div className="w-full h-px bg-border my-2" />
            </div>
        </>
    )
})
