import { forwardRef, useState } from "react";
import { MembersList } from "../common/MemberList"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"

import type { UserBoard, UserWorkspace } from "@/stores/types";
import { motion } from "framer-motion";
import { menuMotionProps } from "./menuMotion";
type BoardMembersDropProps = {
    onClose: () => void;
    members?: UserWorkspace[] | UserBoard[];
    presenceByUserId?: Record<string, boolean>;
    initialFilter?: "online" | "all";
}

export const BoardMembersDrop = forwardRef<HTMLDivElement, BoardMembersDropProps>(({ onClose, members, presenceByUserId, initialFilter }, ref) => {
    const [filterOnline, setFilterOnline] = useState(initialFilter === "online")

    const filterFn = filterOnline
        ? (m: UserWorkspace | UserBoard) => presenceByUserId?.[m.UserID] === true
        : undefined

    return (
        <motion.div
            {...menuMotionProps}
            ref={ref} className="flex flex-col w-fit">
            {/* Filter bar — sits behind (z-0, rendered first), peeks above the menu */}

            <div
                style={{ borderRadius: 30 }}
                className="z-0  gap-1 justify-center  pt-2  bg-neutral-900/80 
            backdrop-blur-sm flex flex-col ring-white/20 ring
           ">
                <div className="flex flex-row gap-2 justify-center">
                    <button
                        onClick={() => setFilterOnline(false)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors cursor-pointer
                        ${!filterOnline ? "bg-neutral-700 text-neutral-100" : "text-neutral-500 hover:bg-neutral-700/50 hover:text-neutral-300"}`}
                    >All</button>
                    <button
                        onClick={() => setFilterOnline(true)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-colors cursor-pointer
                        ${filterOnline ? "bg-neutral-700 text-neutral-100" : "text-neutral-500 hover:bg-neutral-700/50 hover:text-neutral-300"}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0" />
                        Online
                    </button>
                </div>

                {/* Main menu — z-10, overlaps filter bar with -mt-3 */}
                <div className="relative z-10 ">
                    <CommonMenuWrapper
                        style={{ borderRadius: 30 }}
                        className="!p-[2px]
                        !shadow-none
                        "
                    >
                        <div className="flex flex-col gap-1">
                            <MembersList members={members} showPresence={true} presenceByUserId={presenceByUserId} filterFn={filterFn} />
                        </div>
                    </CommonMenuWrapper>
                </div>
            </div>
        </motion.div>
    )
})