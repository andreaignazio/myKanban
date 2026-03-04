import { GlobeAsiaAustraliaIcon, LockClosedIcon, UsersIcon } from "@heroicons/react/24/solid"
import { CustomDropDown, DropDownMenu, type MenuItem } from "../menuElements/CustomDropDown"
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { DropDown } from "../menuElements/DropDown";
import type { MenuItemExtended } from "@/types/uiTypes";
import { forwardRef } from "react";

type VisibilityDropDownProps = {
    selectedVisibility: string
    setSelectedVisibility: (visibility: string) => void;
    onClose?: () => void;


}


export const VisibilityDropDown = forwardRef<HTMLDivElement, VisibilityDropDownProps>(({ selectedVisibility, setSelectedVisibility, onClose }, ref) => {
    const h = 60;
    const visibilityItems: MenuItemExtended[] = [
        {
            id: "private", label: "Private", description: "Only members of this board can see and edit", onClick: () => { setSelectedVisibility("private"); },
            icon: <LockClosedIcon className="h-6 aspect-square" />, height: h, kind: "standard"
        },
        {
            id: "workspace", label: "Workspace", description: "All the members of this workspace can see this board, full access still require authorization",
            onClick: () => { setSelectedVisibility("workspace"); }, icon: <UsersIcon className="h-12 aspect-square" />, height: h, kind: "standard"
        },
        {
            id: "public", label: "Public",
            description: "Anyone can see this board, full access still require authorization",
            onClick: () => { setSelectedVisibility("public"); },
            icon: <GlobeAsiaAustraliaIcon className="h-9 aspect-square" />, height: h, kind: "standard"
        },
    ]


    return (
        <CommonMenuWrapper onClose={onClose}
            ref={ref} className="!w-[360px] !p-0
            !shadow-[0_-8px_18px_rgba(0,0,0,0.28),0_10px_22px_rgba(0,0,0,0.42)]"
        >
            < div className="flex flex-col gap-1" >
                <DropDown
                    items={visibilityItems}
                    onClick={(id) => setSelectedVisibility(id)}
                    activeMenuItem={selectedVisibility}
                />
            </div >
        </CommonMenuWrapper >
    )
})