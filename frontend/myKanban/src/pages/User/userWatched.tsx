import { useUserWatched } from "@/hooks/useUserWatched";
import { UserPagesWrapper } from "./userPagesWrapper"
import { useLookUpInterface, type Lookup } from "@/hooks/useLookUpInterface";
import { Eye, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmDeletionPopover } from "@/components/modals/ConfirmDeletion";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { IconButtonAsync } from "@/components/buttons/IconButtonAsync";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import type { Workspace } from "@/stores/types";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { CatalogIcon, type IconId } from "@/icons/iconCatalog";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFilter } from "@/components/common/WorkspaceFilter";
import { AnimatePresence, motion } from "motion/react";


export const UserWatchedPage = () => {

    const { listWatchIds, cardWatchIds, boardWatchIds } = useUserWatched();
    const { getLookupForType } = useLookUpInterface()
    const [filterWorkspaceId, setFilterWorkspaceId] = useState<string | null>(null)
    const workspacesById = useWorkspaceStore(state => state.workspacesById)
    const filterWorkspaceName = filterWorkspaceId ? workspacesById[filterWorkspaceId]?.Name : undefined

    const listLookup = getLookupForType("list")
    const cardLookup = getLookupForType("card")
    const boardLookup = getLookupForType("board")

    const filterByWorkspace = (ids: string[], lookup: ReturnType<typeof getLookupForType>) =>
        filterWorkspaceId
            ? ids.filter(id => lookup.getWorkspace?.(id)?.ID === filterWorkspaceId)
            : ids

    const sectionsRef = useRef<HTMLDivElement>(null)
    const pageRef = useRef<HTMLDivElement>(null)
    const [isColumn, setIsColumn] = useState(false)
    // Adjust threshold based on testing — 3 sections × ~550px + gaps ≈ 1670px
    const COLUMN_THRESHOLD = 1000

    useLayoutEffect(() => {
        const el = pageRef.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            setIsColumn(entry.contentRect.width < COLUMN_THRESHOLD)
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <UserPagesWrapper
            containerClassName="!max-w-[clamp(320px,92vw,1200px)]"
            ref={pageRef}
            Title="Watched"
            iconId="watched"
            description="View and manage your watched items across different workspaces. This includes actions such as monitoring lists, cards, and boards for updates and changes."
        >
            <WorkspaceFilter filterWorkspaceId={filterWorkspaceId} setFilterWorkspaceId={setFilterWorkspaceId} />
            <div ref={sectionsRef} className={`flex ${isColumn ? 'flex-col' : 'flex-row'} w-full gap-2 mt-4`}>
                <WatchedSection title="Lists" iconId="lists" itemIds={filterByWorkspace(listWatchIds, listLookup)} lookup={listLookup}
                    filterWorkspaceName={filterWorkspaceName} isColumn={isColumn}
                    patchAsyncKeyPrefix="watch:patch:list" deleteAsyncKeyPrefix="watch:delete:list" />
                <WatchedSection title="Cards" iconId="cards" itemIds={filterByWorkspace(cardWatchIds, cardLookup)} lookup={cardLookup}
                    filterWorkspaceName={filterWorkspaceName} isColumn={isColumn}
                    patchAsyncKeyPrefix="watch:patch:card" deleteAsyncKeyPrefix="watch:delete:card" />
                <WatchedSection title="Boards" iconId="boards" itemIds={filterByWorkspace(boardWatchIds, boardLookup)} lookup={boardLookup}
                    filterWorkspaceName={filterWorkspaceName} isColumn={isColumn}
                    patchAsyncKeyPrefix="watch:patch:board" deleteAsyncKeyPrefix="watch:delete:board" />
            </div>
        </UserPagesWrapper>
    )
}

type WatchedSectionProps = {
    title: string;
    iconId: IconId;
    itemIds: string[];
    lookup?: Lookup<any>;
    filterWorkspaceName?: string;
    patchAsyncKeyPrefix: AsyncRequestKey;
    deleteAsyncKeyPrefix: AsyncRequestKey;
    isColumn: boolean;
}

type WorkspaceGroup = { workspace: Workspace; ids: string[] }

const groupByWorkspace = (itemIds: string[], lookup?: Lookup<any>): { groups: WorkspaceGroup[]; otherIds: string[] } => {
    const map = new Map<string, WorkspaceGroup>()
    const otherIds: string[] = []

    for (const id of itemIds) {
        const workspace = lookup?.getWorkspace?.(id)
        if (!workspace) {
            otherIds.push(id)
            continue
        }
        if (!map.has(workspace.ID)) {
            map.set(workspace.ID, { workspace, ids: [] })
        }
        map.get(workspace.ID)!.ids.push(id)
    }

    return { groups: Array.from(map.values()), otherIds }
}

const WatchedSection = ({ title, iconId, itemIds, lookup, filterWorkspaceName, patchAsyncKeyPrefix, deleteAsyncKeyPrefix, isColumn }: WatchedSectionProps) => {
    const { groups, otherIds } = useMemo(() => groupByWorkspace(itemIds, lookup), [itemIds, lookup])

    const radius = 28
    const padding = 12
    const radiusInner = radius - padding

    const contentRef = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState<number | undefined>(undefined)
    const canTransition = useRef(false)

    useLayoutEffect(() => {
        const el = contentRef.current
        if (!el) return
        setHeight(el.offsetHeight)
        const raf = requestAnimationFrame(() => { canTransition.current = true })
        const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
        observer.observe(el)
        return () => { observer.disconnect(); cancelAnimationFrame(raf) }
    }, [])

    useLayoutEffect(() => {
        const el = contentRef.current
        if (!el) return
        canTransition.current = false
        setHeight(el.offsetHeight)
        const raf = requestAnimationFrame(() => { canTransition.current = true })
        return () => cancelAnimationFrame(raf)
    }, [isColumn])

    return (
        <div style={{
            borderRadius: radius,
            height,
            overflow: 'hidden',
            transition: canTransition.current ? 'height 0.3s ease-in-out' : 'none',
        }} className={`flex flex-col ${isColumn ? '' : 'flex-1'} min-w-[280px] bg-slate-500/10`}>
            <div ref={contentRef} style={{ padding }} className="flex flex-col gap-3">
                <div className="flex flex-row items-center gap-2 ps-2">
                    <CatalogIcon id={iconId} className="text-neutral-400 w-4 h-4" />
                    <span className="text-md font-bold">{title}</span>
                </div>
                <AnimatePresence mode="popLayout">
                    {groups.map(({ workspace, ids }) => (
                        <WorkspaceGroup
                            key={workspace.ID}
                            workspace={workspace}
                            itemIds={ids}
                            lookup={lookup}
                            patchAsyncKeyPrefix={patchAsyncKeyPrefix}
                            deleteAsyncKeyPrefix={deleteAsyncKeyPrefix}
                            radius={radiusInner}
                        />
                    ))}
                    {otherIds.length > 0 && (
                        <WorkspaceGroup
                            key="__other__"
                            workspace={undefined}
                            itemIds={otherIds}
                            lookup={lookup}
                            patchAsyncKeyPrefix={patchAsyncKeyPrefix}
                            deleteAsyncKeyPrefix={deleteAsyncKeyPrefix}
                            radius={radiusInner}
                        />
                    )}
                    {groups.length === 0 && otherIds.length === 0 && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-xs italic text-neutral-500 px-2 py-1"
                        >
                            {filterWorkspaceName
                                ? `You have no watched ${title.toLowerCase()} in ${filterWorkspaceName}`
                                : `You have no watched ${title.toLowerCase()}`
                            }
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

type WorkspaceGroupProps = {
    workspace: Workspace | undefined;
    itemIds: string[];
    lookup?: Lookup<any>;
    patchAsyncKeyPrefix: AsyncRequestKey;
    deleteAsyncKeyPrefix: AsyncRequestKey;
    radius: number;
}

const WorkspaceGroup = ({ workspace, itemIds, lookup, patchAsyncKeyPrefix, deleteAsyncKeyPrefix, radius: radiusProp }: WorkspaceGroupProps) => {
    const { workspaceName, headerProps } = useWorkspaceDerivedProps(undefined, workspace)
    const { coverType, coverImage, coverColor } = headerProps

    const radius = radiusProp
    const padding = 6
    const gap = 4
    const radiusInner = radius - padding

    return (
        <motion.div
            layout
            layoutCrossfade
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ borderRadius: radius, padding: padding, gap: gap }}
            className="flex flex-col gap-1 bg-black/10 rounded-md p-2">
            <div className="flex flex-row items-center gap-2 px-1 py-0.5">
                <ImageColorRenderer
                    style={{ borderRadius: radiusInner * 0.5 }}
                    overrideClassName={true}
                    className="w-4 h-4 shrink-0 overflow-hidden"
                    bgImage={coverImage}
                    bgColor={coverColor}
                    backgroundType={coverType as "color" | "image" | null | undefined}
                    fallbackGradient={{ className: "bg-slate-600/60" }}
                />
                <span className="text-xs font-semibold text-neutral-400 truncate">
                    {workspace ? workspaceName : "Other"}
                </span>
            </div>
            <AnimatePresence mode="popLayout">
                {itemIds.map((id) => (
                    <WatchedItem key={id} id={id} lookup={lookup}
                        radius={radiusInner}
                        patchAsyncKey={`${patchAsyncKeyPrefix}:${id}` as AsyncRequestKey}
                        deleteAsyncKey={`${deleteAsyncKeyPrefix}:${id}` as AsyncRequestKey}
                    />
                ))}
            </AnimatePresence>
        </motion.div>
    )
}

type WatchedItemProps = {
    id: string;
    lookup?: Lookup<any>;
    patchAsyncKey: AsyncRequestKey;
    deleteAsyncKey: AsyncRequestKey;
    radius: number;
}

const WatchedItem = ({ id, lookup, patchAsyncKey, deleteAsyncKey, radius }: WatchedItemProps) => {

    const navigate = useNavigate()
    const isActive = lookup?.isActive(id) ?? false
    const context = lookup?.getContext?.(id)
    const contextLink = lookup?.getContextLink?.(id)

    const handleToggleActive = async () => {
        if (lookup?.patchActive) {
            await lookup.patchActive(id, !isActive)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        const data: DomainModalData = {
            componentent: (onClose) => (
                <ConfirmDeletionPopover
                    title="Remove watch"
                    body={`Are you sure you want to stop watching "${lookup?.getTitle(id) ?? id}"?`}
                    submitLabel="Remove"
                    onClose={onClose}
                    onSubmit={() => {
                        lookup?.delete?.(id)
                        onClose()
                    }}
                />
            ),
            anchorRef: null,
        }
        useUiStore.getState().setDomainModalOpen(true, data)
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ borderRadius: radius }}
            onClick={handleToggleActive}
            className={`
            ${isActive ? "bg-slate-500/20" : "bg-slate-500/10"}
            group flex flex-row rounded-md p-2 pr-4 gap-2 items-center
        hover:bg-slate-500/20 transition-colors duration-200 ease-in-out cursor-pointer`}>

            <IconButtonAsync
                asyncKey={patchAsyncKey}
                icon={Eye}
                size={20}
                idleColorClass={isActive ? "text-neutral-300" : "text-neutral-500"}
                successColorClass="text-emerald-400"
                errorColorClass="text-red-400"
                className="p-1 pointer-events-none"
            />
            <div className="flex flex-col flex-1 min-w-0">
                <div className={`text-sm font-plex font-semibold ${isActive ? "text-neutral-300" : "text-neutral-500"}`}>
                    {lookup ? lookup.getTitle(id) ?? id : id}
                </div>
                {context && (
                    <div className={`text-xs truncate font-mono ${isActive ? "text-neutral-500" : "text-neutral-600"}`}>{context}</div>
                )}
            </div>
            {contextLink && (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(contextLink) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded
                        text-neutral-500 hover:text-neutral-300 hover:bg-slate-500/20"
                >
                    <ExternalLink size={14} />
                </button>
            )}
            <IconButtonAsync
                asyncKey={deleteAsyncKey}
                icon={Trash2}
                size={14}
                onClick={handleDeleteClick}
                idleColorClass="text-neutral-500 opacity-0 group-hover:opacity-100"
                successColorClass="text-emerald-400"
                errorColorClass="text-red-400"
                className="transition-opacity duration-150 p-1 rounded hover:bg-red-500/20 hover:!text-red-400"
            />
        </motion.div>
    )
}
