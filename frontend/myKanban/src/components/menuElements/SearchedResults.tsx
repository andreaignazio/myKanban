import type { User } from "@/stores/types"

import { UserRowData } from "../UserRow"
import { forwardRef } from "react"

type SerchedResultsProps = {
    searchResults: User[]
    onSelect: (user: User) => void
    anchorRef?: React.RefObject<HTMLElement | null>
}

export const SerchedResults = forwardRef<HTMLDivElement, SerchedResultsProps>(({ searchResults, onSelect, anchorRef }, ref) => {

    // const panelRef = useRef<HTMLDivElement | null>(null)
    const rect = anchorRef?.current?.getBoundingClientRect();
    const style: React.CSSProperties = {
        width: rect?.width,
    }


    if (searchResults.length > 0) {
        //open(overlayId)
    }

    return (
        <div ref={ref}
            className={`w-full px-0 ${searchResults.length > 0 ? 'block' : 'hidden'}`} style={style}>
            <div className="theme-dark w-full bg-menusec text-white 
                shadow-lg max-h-72 overflow-y-auto scrollbar-hidden
                rounded-lg mt-4 py-4 px-2 flex flex-col gap-3 ">
                {searchResults && (searchResults?.map((user) => (
                    <UserRowData key={user.ID} user={user} onClick={() => onSelect(user)} />
                )))}
            </div>
        </div>
    )
})