import { forwardRef } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import { MenuStateIndicator } from "@/components/menuElements/menuWrapper";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { menuMotionProps } from "./menuMotion";

type AsyncRequestState = "loading" | "success" | "error";
export type RequestGroup = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
    maxWidth?: number;
}

type ActionMenuWrapperProps = {
    children?: React.ReactNode
    Title: string
    onClose: () => void
    onBack?: () => void
    width?: number
    titleStyle?: React.CSSProperties
    titleClassName?: string;
    style?: React.CSSProperties
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
    maxWidth?: number;
    requestGroups?: RequestGroup[];
    hideX?: boolean;
    isLoading?: boolean;
}

export const ActionMenuWrapper = forwardRef<HTMLDivElement, ActionMenuWrapperProps>(({ children, Title, onClose, onBack, width, titleStyle, titleClassName, style, requestKey, minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs, show, maxWidth, requestGroups, hideX = false, isLoading = false }, ref) => {

    const resolvedStyle: React.CSSProperties = {
        ...style,
        width: style?.width ?? (width ? `${width}px` : "250px"),
        transition: style?.transition ?? "width 220ms ease",
    }

    const indicators = requestGroups && requestGroups.length > 0
        ? requestGroups.map((g, i) => (
            <MenuStateIndicator key={i} requestKey={g.requestKey} minLoadingMs={g.minLoadingMs} minSuccessMs={g.minSuccessMs} maxSuccessMs={g.maxSuccessMs} maxErrorMs={g.maxErrorMs} show={g.show} maxWidth={g.maxWidth ?? maxWidth} />
        ))
        : requestKey
            ? <MenuStateIndicator requestKey={requestKey} minLoadingMs={minLoadingMs} minSuccessMs={minSuccessMs} maxSuccessMs={maxSuccessMs} maxErrorMs={maxErrorMs} show={show} maxWidth={maxWidth} />
            : null;

    const loadingOverlay = isLoading ? (
        <div
            style={{ zIndex: 3000, cursor: "url('/cursors/loading.svg') 14 14, wait" }}
            className="absolute inset-0 rounded-xl bg-black/30 pointer-events-auto" />
    ) : null;

    const menuInner = (
        <>
            {loadingOverlay}
            {!hideX && <div onClick={onClose} className="absolute top-3 right-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <XMarkIcon className="w-5 h-5 text-white" />
            </div>}
            {onBack && <div onClick={onBack} className="absolute top-3 left-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <ChevronLeftIcon className="w-5 h-5 text-white" />
            </div>}
            <div className="text-center flex-row w-full mb-1 mt-1">
                <span className={`text-xs font-inter text-neutral-300 ${titleClassName}`} style={titleStyle}>{Title}</span>
            </div>
            {children}
        </>
    );

    if (!indicators) return (
        <motion.div
            ref={ref}
            className={`theme-dark bg-menu rounded-xl shadow-lg scrollbar-hidden
                 shadow-black relative text-white py-2 pb-4`}
            style={resolvedStyle}
            {...menuMotionProps}
        >
            {menuInner}
        </motion.div>
    );

    return (
        <motion.div className="relative overflow-visible w-fit" {...menuMotionProps}>
            {indicators}
            <div
                ref={ref}
                className={`theme-dark bg-menu rounded-xl shadow-lg shadow-black relative text-white py-2 pb-4`}
                style={resolvedStyle}
            >
                {menuInner}
            </div>
        </motion.div>
    );

})
