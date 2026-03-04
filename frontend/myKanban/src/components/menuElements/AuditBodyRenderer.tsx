import type { FeedBodyChunk } from "@/hooks/useFeedFromAudit";
import { UserHoverCard } from "@/components/modals/UserHoverCard";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";

type AuditBodyRendererProps = {
    Body: FeedBodyChunk[]

    ActorAsLink?: boolean

    TextClasses?: TextClasses
}

export type TextClasses = {
    ActorClassName?: string
    TextClassName?: string
    LinkClassName?: string
}


export const AuditBodyRenderer = ({ Body, ActorAsLink = true, TextClasses }: AuditBodyRendererProps) => {
    const navigate = useNavigate();
    const openOverlay = useOverlayStore((state) => state.open)
    const userHoverRef = useRef<HTMLDivElement>(null)

    let { ActorClassName, TextClassName, LinkClassName } = TextClasses || {};
    ActorClassName = ActorClassName || "font-semibold text-gray-800 dark:text-gray-200"
    TextClassName = TextClassName || "text-gray-800 dark:text-gray-400"
    LinkClassName = LinkClassName || "text-[#6195e4] hover:underline"

    const getUserIdFromHref = (href: string): string | undefined => {
        const workspaceMatch = href.match(/^\/workspaces\/[^/]+\/users\/([^/]+)\/activities\/?$/)
        if (workspaceMatch?.[1]) return workspaceMatch[1]

        const userMatch = href.match(/^\/users\/([^/]+)\/activities\/?$/)
        if (userMatch?.[1]) return userMatch[1]

        return undefined
    }

    const getWorkspaceIdFromHref = (href: string): string | undefined => {
        const workspaceMatch = href.match(/^\/workspaces\/([^/]+)\/users\/[^/]+\/activities\/?$/)
        return workspaceMatch?.[1]
    }

    const openUserHoverCard = (userID: string, workspaceID?: string) => {
        const descriptor: OverlayDescriptor = {
            id: `feed-user-hover-${userID}`,
            render: () => <UserHoverCard ref={userHoverRef} userID={userID} workspaceID={workspaceID} />,
            panelRef: userHoverRef,
            type: "popover",
            renderType: "virtual",
            exclusiveGroup: "user-card-hover",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openOverlay(descriptor)
    }

    const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string, chunk: FeedBodyChunk) => {
        if (!href || !href.startsWith("/")) return;

        event.preventDefault();
        if (chunk.kind === "link" && (chunk.entityType === "user" || chunk.entityType === "actor" || chunk.entityType === "target_user")) {
            const userID = chunk.entityID ?? getUserIdFromHref(href)
            const workspaceID = getWorkspaceIdFromHref(href)
            if (userID) {
                openUserHoverCard(userID, workspaceID)
                return
            }
        }

        const isUserActivityRoute = /^\/workspaces\/[^/]+\/users\/[^/]+\/activities\/?$/.test(href) || /^\/users\/[^/]+\/activities\/?$/.test(href)
        if (isUserActivityRoute) {
            return;
        }

        navigate(href);
    };

    return (
        <div className="flex-1 min-w-0 whitespace-pre-wrap break-words text-sm">
            {Body.map((chunk: FeedBodyChunk, index: number) => {
                if (chunk.kind === "text") {
                    return <span key={index} className={TextClassName}>{chunk.text}</span>;
                } else if (chunk.kind === "link") {
                    if (chunk.entityType === "actor" && !ActorAsLink) {
                        return <span key={index} className={ActorClassName}>{chunk.text}</span>;
                    }
                    return <a key={index} href={chunk.href} onClick={(event) => handleLinkClick(event, chunk.href, chunk)} className={` ${LinkClassName}`}>{chunk.text}</a>;
                }
            })}
        </div>
    )
}