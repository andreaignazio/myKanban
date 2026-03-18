import { useWorkspaceStore } from "@/stores/workspaceStore";
import { WorkspaceVisibility } from "@/components/workspaceView/WorkspaceVisibility";
import { ArrowDown, UsersRoundIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useLayoutEffect, useRef, useState } from "react";

type WorkspaceFilterProps = {
    filterWorkspaceId: string | null;
    setFilterWorkspaceId: (id: string | null) => void;
}

export const WorkspaceFilter = ({ filterWorkspaceId, setFilterWorkspaceId }: WorkspaceFilterProps) => {
    const workspaceIds = useWorkspaceStore(useShallow((state) => state.workspaceIds));
    const workspacesById = useWorkspaceStore(useShallow((state) => state.workspacesById));

    const scrollRef = useRef<HTMLDivElement>(null)
    const [showArrow, setShowArrow] = useState(false)

    useLayoutEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const update = () => {
            const overflowing = el.scrollHeight > el.clientHeight
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4
            setShowArrow(overflowing && !atBottom)
        }

        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        el.addEventListener('scroll', update)
        return () => {
            observer.disconnect()
            el.removeEventListener('scroll', update)
        }
    }, [])

    const handleToggle = (id: string) => {
        setFilterWorkspaceId(filterWorkspaceId === id ? null : id);
    }

    return (
        <div className="ps-0 relative group">
            <div className="flex flex-row items-center gap-2 mt-5 ps-4 text-neutral-300">
                <UsersRoundIcon size={16} />
                <span className="text-md font-semibold">Workspaces</span>
            </div>
            <div ref={scrollRef} className="relative flex flex-col mt-2 mb-4 w-full ps-10 pe-5 max-h-[200px] overflow-y-auto scrollbar-hidden">
                {workspaceIds.map((id) => {
                    const workspace = workspacesById[id];
                    const isActive = filterWorkspaceId === id;
                    return (
                        <div key={id} className="flex flex-col items-start gap-0 mt-1">
                            <div
                                onClick={() => handleToggle(id)}
                                className={`flex flex-row items-center gap-2 ${isActive ? "bg-neutral-400/10" : ""}
                                text-neutral-300 hover:bg-neutral-400/10 rounded h-9 px-2 py-1 cursor-pointer`}
                            >
                                <span className="text-sm">{workspace?.Name}</span>
                                <WorkspaceVisibility
                                    showColor={true}
                                    mode="compact"
                                    visibility={workspace?.Visibility || "private"}
                                />
                            </div>
                            <div className="bg-neutral-700/50 mt-1 h-px w-full" />
                        </div>
                    )
                })}
            </div>
            {showArrow && (
                <div className="absolute place-self-center bottom-2 rounded-full bg-black/50 p-1
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <ArrowDown size={16} className="text-neutral-400" />
                </div>
            )}
        </div>
    )
}
