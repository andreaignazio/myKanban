import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { RequestGroup } from "../modals/ActionMenuWrapper";

type AsyncRequestState = "loading" | "success" | "error";

type AsyncRequestOverlayAProps = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    variant?: "overlay" | "banner" | "strip";
    show?: AsyncRequestState[];
    loadingStyle?: "spinner" | "pulse";
    easeIn?: boolean;
    className?: string;
    coloredBackground?: boolean;
}

type AsyncRequestOverlayGroupProps = {
    requestGroups: RequestGroup[];
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    maxErrorMs?: number;
    show?: AsyncRequestState[];
    variant?: "overlay" | "banner" | "strip";
    easeIn?: boolean;
    className?: string;
    coloredBackground?: boolean;
}

export const AsyncRequestOverlayGroups = ({ requestGroups, requestKey, minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs, show, variant, easeIn, className, coloredBackground }: AsyncRequestOverlayGroupProps) => {

    const indicators = requestGroups && requestGroups.length > 0
        ? requestGroups.map((g, i) => (
            <AsyncRequestOverlayA key={i} requestKey={g.requestKey} minLoadingMs={g.minLoadingMs} minSuccessMs={g.minSuccessMs} maxSuccessMs={g.maxSuccessMs} maxErrorMs={g.maxErrorMs} show={g.show} variant={variant} easeIn={easeIn} className={className} coloredBackground={coloredBackground} />
        ))
        : requestKey
            ? <AsyncRequestOverlayA requestKey={requestKey} minLoadingMs={minLoadingMs} minSuccessMs={minSuccessMs} maxSuccessMs={maxSuccessMs} maxErrorMs={maxErrorMs} show={show} variant={variant} easeIn={easeIn} className={className} coloredBackground={coloredBackground} />
            : null;

    return (
        <>
            {indicators}
        </>
    )
}


export const AsyncRequestOverlayA = ({ requestKey, minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs, variant = "overlay",
    show, loadingStyle = "spinner", easeIn = true, className = "", coloredBackground = false }: AsyncRequestOverlayAProps) => {

    const { displayLoading, displaySuccess, displayError, errorMessage } = useAsyncRequestDisplay(requestKey ?? [], { minLoadingMs, minSuccessMs, maxSuccessMs, maxErrorMs });

    const showLoading = !show || show.includes("loading");
    const showSuccess = !show || show.includes("success");
    const showError = !show || show.includes("error");

    const isVisible = (showLoading && displayLoading) || (showSuccess && displaySuccess) || (showError && displayError);
    const fadeClass = `transition-opacity transition-colors duration-500 ${easeIn ? "ease-in-out" : "ease-out"}`;





    if (variant === "banner") {
        return (
            <div className={` w-full
            absolute inset-0 flex items-center px-3 gap-2 bg-menusec z-10 ${fadeClass} ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className={`${className}  ${coloredBackground ? "bg-yellow-400/40" : ""}
                    absolute inset-0 flex items-center gap-2 px-3 text-yellow-500 ${fadeClass} ${showLoading && displayLoading ? "opacity-100" : "opacity-0"}`}>
                    {loadingStyle === "pulse"
                        ? <div className="absolute inset-0 bg-menusec animate-pulse" />
                        : <><LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /><span className="text-sm font-semibold truncate">Loading...</span></>
                    }
                </div>
                <div className={`${className} ${coloredBackground ? "bg-green-400/40" : ""}
                    absolute inset-0 flex items-center gap-2 px-3 text-green-500 ${fadeClass} ${showSuccess && displaySuccess ? "opacity-100" : "opacity-0"}`}>
                    <CircleCheck className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold truncate">Done</span>
                </div>
                <div className={`${className} ${coloredBackground ? "bg-red-400/40" : ""}
                    absolute inset-0 flex items-center gap-2 px-3 text-red-500 ${fadeClass} ${showError && displayError ? "opacity-100" : "opacity-0"}`}>
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold truncate">{errorMessage}</span>
                </div>
            </div>
        );
    }

    if (variant === "strip") {
        const stripBg = showLoading && displayLoading ? (loadingStyle === "pulse" ? "bg-menusec animate-pulse" : "bg-yellow-500/20") : showSuccess && displaySuccess ? "bg-green-500/20" : "bg-red-500/20";
        const stripText = showLoading && displayLoading ? "text-yellow-500" : showSuccess && displaySuccess ? "text-green-500" : "text-red-500";
        return (
            <div className={`absolute inset-x-0 bottom-0 h-6 flex items-center gap-2 px-2 z-10 ${fadeClass} ${stripBg} ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className={`absolute inset-0 flex items-center gap-1.5 px-2 ${fadeClass} ${stripText} ${showLoading && displayLoading ? "opacity-100" : "opacity-0"}`}>
                    {loadingStyle !== "pulse" && <><LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" /><span className="text-xs font-semibold truncate">Loading...</span></>}
                </div>
                <div className={`absolute inset-0 flex items-center gap-1.5 px-2 ${fadeClass} ${stripText} ${showSuccess && displaySuccess ? "opacity-100" : "opacity-0"}`}>
                    <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold truncate">Done</span>
                </div>
                <div className={`absolute inset-0 flex items-center gap-1.5 px-2 ${fadeClass} ${stripText} ${showError && displayError ? "opacity-100" : "opacity-0"}`}>
                    <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold truncate">{errorMessage}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`absolute inset-0 flex flex-col gap-8 items-center justify-center bg-menusec z-10 ${fadeClass} ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className={`absolute flex flex-col gap-8 items-center justify-center ${fadeClass} ${showLoading && displayLoading ? "opacity-100" : "opacity-0"}`}>
                {loadingStyle === "pulse"
                    ? <div className="absolute inset-0 bg-menusec animate-pulse" />
                    : <>
                        <LoaderCircle className="h-[105px] w-[105px] text-yellow-500 animate-spin" />
                        <div className="text-sm font-semibold text-yellow-500">Loading...</div>
                    </>
                }
            </div>
            <div className={`absolute flex flex-col gap-8 items-center justify-center ${fadeClass} ${showSuccess && displaySuccess ? "opacity-100" : "opacity-0"}`}>
                <CircleCheck className="h-24 w-24 text-green-500 animate-pulse" />
                <div className="text-sm font-semibold opacity-0 select-none" aria-hidden>placeholder</div>
            </div>
            <div className={`absolute flex flex-col gap-8 items-center justify-center ${fadeClass} ${showError && displayError ? "opacity-100" : "opacity-0"}`}>
                <CircleAlert className="h-24 w-24 text-red-500 animate-pulse" />
                <div className="text-sm font-semibold text-red-500">
                    {errorMessage}
                </div>
            </div>
        </div>
    )

}




type FetchOverlayProps = {
    requestKey: AsyncRequestKey | AsyncRequestKey[];
    maxErrorMs?: number;
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxSuccessMs?: number;
    variant?: "overlay" | "banner" | "strip";
    easeIn?: boolean;
    show?: AsyncRequestState[];
}

/**
 * Pre-configured overlay for fetch/query operations:
 * - loading: full-cover grey pulse (no spinner)
 * - success: hidden
 * - error: shown for maxErrorMs (default 4s)
 * - easeIn: true by default (appears instantly, fades out smoothly)
 */
export const FetchOverlay = ({ requestKey, minLoadingMs = 0, minSuccessMs = 0, maxSuccessMs, maxErrorMs, variant = "overlay", easeIn = true, show = ["loading", "error"] }: FetchOverlayProps) => (
    <AsyncRequestOverlayA
        requestKey={requestKey}
        loadingStyle="pulse"
        show={show}
        minLoadingMs={minLoadingMs}
        minSuccessMs={minSuccessMs}
        maxSuccessMs={maxSuccessMs}
        maxErrorMs={maxErrorMs}
        variant={variant}
        easeIn={easeIn}
    />
)