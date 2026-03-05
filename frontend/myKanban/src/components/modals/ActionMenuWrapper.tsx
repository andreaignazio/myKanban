import { forwardRef } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { MenuStateIndicator } from "@/components/menuElements/menuWrapper";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";

type AsyncRequestState = "loading" | "success" | "error";
type RequestGroup = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
}

type ActionMenuWrapperProps = {
    children?: React.ReactNode
    Title: string
    onClose: () => void
    onBack?: () => void
    width?: number
    titleStyle?: React.CSSProperties
    style?: React.CSSProperties
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
    requestGroups?: RequestGroup[];
}

export const ActionMenuWrapper = forwardRef<HTMLDivElement, ActionMenuWrapperProps>(({ children, Title, onClose, onBack, width, titleStyle, style, requestKey, minLoadingMs, minSuccessMs, maxErrorMs, show, requestGroups }, ref) => {

    const resolvedStyle: React.CSSProperties = {
        ...style,
        width: style?.width ?? (width ? `${width}px` : "250px"),
        transition: style?.transition ?? "width 220ms ease",
    }

    const indicators = requestGroups && requestGroups.length > 0
        ? requestGroups.map((g, i) => (
            <MenuStateIndicator key={i} requestKey={g.requestKey} minLoadingMs={g.minLoadingMs} minSuccessMs={g.minSuccessMs} maxErrorMs={g.maxErrorMs} show={g.show} />
        ))
        : requestKey
            ? <MenuStateIndicator requestKey={requestKey} minLoadingMs={minLoadingMs} minSuccessMs={minSuccessMs} maxErrorMs={maxErrorMs} show={show} />
            : null;

    const menu = (
        <div ref={ref} className={`theme-dark bg-menu rounded-xl 
            shadow-lg shadow-black relative
         text-white  py-2 pb-4`} style={resolvedStyle}>
            <div onClick={onClose} className="absolute top-3 right-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <XMarkIcon className="w-5 h-5 text-white" />
            </div>
            {onBack && <div onClick={onBack} className="absolute top-3 left-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <ChevronLeftIcon className="w-5 h-5 text-white" />
            </div>}
            <div className="text-center flex-row w-full mb-1 mt-1">
                <span className="text-xs font-inter text-neutral-300 " style={titleStyle}>{Title}</span>
            </div>
            {children}
        </div>
    );

    if (!indicators) return menu;

    return (
        <div className="relative overflow-visible w-fit">
            {indicators}
            {menu}
        </div>
    );

})
