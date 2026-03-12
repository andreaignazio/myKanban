import { forwardRef } from "react"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";
import { motion } from "framer-motion";
import { menuMotionProps } from "@/components/modals/menuMotion";

// --- MenuStateIndicator ---

type AsyncRequestState = "loading" | "success" | "error";

type MenuStateIndicatorProps = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
    maxWidth?: number;
}

export const MenuStateIndicator = ({ requestKey, minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs, show, maxWidth }: MenuStateIndicatorProps) => {
    const { displayLoading, displaySuccess, displayError, errorMessage } = useAsyncRequestDisplay(requestKey ?? [], { minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs });

    const showLoading = !show || show.includes("loading");
    const showSuccess = !show || show.includes("success");
    const showError = !show || show.includes("error");

    const isActive = (showLoading && displayLoading) || (showSuccess && displaySuccess) || (showError && displayError);
    const colorClass = (showLoading && displayLoading)
        ? "bg-yellow-500" : (showSuccess && displaySuccess)
            ? "bg-green-500" : (showError && displayError) ? "bg-red-500" : "bg-gray-500";

    let offsetClass = isActive ? "-top-5" : "-top-0";
    if (showError && displayError && errorMessage) {
        const length = errorMessage?.length ?? 0
        offsetClass = length > 30 ? "-top-[65px]" : "-top-[40px]"
        if (maxWidth) {
            const charsPerLine = Math.floor(maxWidth / 8); // Approximate character width
            const lines = Math.ceil(length / charsPerLine);
            offsetClass = length > 30 ? `-top-[${40 + (lines - 1) * 25}px]` : "-top-[10px]";
        }
    }


    return (
        <div
            className={`transition-all duration-300 ease-in-out flex flex-col items-center justify-center
            absolute ${colorClass} left-1/2 text-center 
            -translate-x-1/2 ${offsetClass} w-[98%] h-[100px] rounded-2xl`}>
            <div className="absolute top-2">
                {showError && displayError && errorMessage ? (
                    <span className="text-white text-wrap  w-full
                    text-sm  ">
                        {errorMessage}</span>
                ) : (
                    <span></span>
                )}
            </div>
        </div>
    );
}

// --- CommonMenuWrapper ---

type RequestGroup = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
}

type CommonMenuWrapperProps = {
    Title?: string;
    onClose?: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    classNameContainer?: string;
    /** Single key or array of keys — renders one MenuStateIndicator. */
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    /** Multiple independent request groups — each gets its own side-by-side badge. */
    requestGroups?: RequestGroup[];
    stateChildren?: React.ReactNode;
}

export const CommonMenuWrapper = forwardRef<HTMLDivElement, CommonMenuWrapperProps>(({ children, Title, onClose, style, className, classNameContainer, requestKey, minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs, requestGroups, stateChildren }, ref) => {

    const resolvedStateChildren = stateChildren ?? (() => {
        if (requestGroups && requestGroups.length > 0) {
            return requestGroups.map((group, i) => (
                <MenuStateIndicator
                    key={i}
                    requestKey={group.requestKey}
                    minLoadingMs={group.minLoadingMs}
                    minSuccessMs={group.minSuccessMs}
                    maxSuccessMs={group.maxSuccessMs}
                    maxErrorMs={group.maxErrorMs}
                    show={group.show}
                />
            ));
        }
        if (requestKey) {
            return <MenuStateIndicator requestKey={requestKey} minLoadingMs={minLoadingMs} minSuccessMs={minSuccessMs} maxSuccessMs={maxSuccessMs} maxErrorMs={maxErrorMs} />;
        }
        return null;
    })();

    return (
        <motion.div ref={ref} className={`w-fit relative overflow-visible ${classNameContainer}`} {...menuMotionProps}>
            {resolvedStateChildren}
            <div className={` flex justify-start items-start theme-dark bg-menu rounded-xl 
            shadow-lg shadow-black relative
         text-white  overflow-hidden ${className}`} style={style} >
                {children}
            </div>
        </motion.div>
    )

})


