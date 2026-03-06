import { forwardRef } from "react"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";

// --- MenuStateIndicator ---

type AsyncRequestState = "loading" | "success" | "error";

type MenuStateIndicatorProps = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
}

export const MenuStateIndicator = ({ requestKey, minLoadingMs, minSuccessMs, maxErrorMs, show }: MenuStateIndicatorProps) => {
    const { displayLoading, displaySuccess, displayError, errorMessage } = useAsyncRequestDisplay(requestKey ?? [], { minLoadingMs, minSuccessMs, maxErrorMs });

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
    maxErrorMs?: number;
    show?: AsyncRequestState[];
}

type CommonMenuWrapperProps = {
    Title?: string;
    onClose?: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    /** Single key or array of keys — renders one MenuStateIndicator. */
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxErrorMs?: number;
    /** Multiple independent request groups — each gets its own side-by-side badge. */
    requestGroups?: RequestGroup[];
    stateChildren?: React.ReactNode;
}

export const CommonMenuWrapper = forwardRef<HTMLDivElement, CommonMenuWrapperProps>(({ children, Title, onClose, style, className, requestKey, minLoadingMs, minSuccessMs, maxErrorMs, requestGroups, stateChildren }, ref) => {

    const resolvedStateChildren = stateChildren ?? (() => {
        if (requestGroups && requestGroups.length > 0) {
            return requestGroups.map((group, i) => (
                <MenuStateIndicator
                    key={i}
                    requestKey={group.requestKey}
                    minLoadingMs={group.minLoadingMs}
                    minSuccessMs={group.minSuccessMs}
                    maxErrorMs={group.maxErrorMs}
                    show={group.show}
                />
            ));
        }
        if (requestKey) {
            return <MenuStateIndicator requestKey={requestKey} minLoadingMs={minLoadingMs} minSuccessMs={minSuccessMs} maxErrorMs={maxErrorMs} />;
        }
        return null;
    })();

    return (
        <div ref={ref} className="w-fit relative overflow-visible">
            {resolvedStateChildren}
            <div className={` flex justify-start items-start theme-dark bg-menu rounded-xl 
            shadow-lg shadow-black relative
         text-white  overflow-hidden ${className}`} style={style} >
                {children}
            </div>
        </div>
    )

})


