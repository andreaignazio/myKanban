import { forwardRef, useEffect, useRef } from "react"
import { AsyncRequestOverlayGroups } from "./asyncRequestOverlayA"
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore"
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"
import { motion } from "motion/react"
import type { AsyncRequestState } from "@/stores/asyncRequestStore"
import type { RequestGroup } from "../modals/ActionMenuWrapper"


type AsyncRequestToasterProps = {
    keys: AsyncRequestKey[];
    show?: AsyncRequestState[];
    // You can add props here if needed, such as a list of request keys to monitor
}



const AsyncRequestToaster = forwardRef<HTMLDivElement, AsyncRequestToasterProps>((props, ref) => {

    const requestGroup: RequestGroup[] = [
        {
            requestKey: props.keys,
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["success"],
        },
        {
            requestKey: ["card:copy", "card:move", "card:mirror", "card:create", "card:edit:title:inline", "card:edit:dates:add:editmodal"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"],
        },
        {
            requestKey: ["card:create", "workspace:create", "list:create", "list:move:dnd", "card:move:dnd"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error"],
        },
        {
            requestKey: ["card:delete", "list:detach", "board:archive:list:purge", "board:archive:card:purge"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"],
        },
        {
            requestKey: ["watch:add:board", "watch:add:list", "watch:patch:board", "watch:patch:list"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"],
        },
        {
            requestKey: ["board:sharelink:revoke", "workspace:sharelink:revoke", "workspace:member:role:update"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"],
        }
    ]




    const motionProps = {
        initial: { opacity: 0, scale: 0.95, y: -50 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -50 },
        transition: { duration: 0.25, ease: "linear" },
    } as const;

    return (
        <motion.div {...motionProps} ref={ref}
            className=" relative pointer-events-none theme-dark w-[400px] overflow-hidden
        min-h-[90px] bg-transparent text-white px-4 py-4 rounded-2xl flex items-center justify-center
        shadow-lg shadow-black/20">
            <>
                <AsyncRequestOverlayGroups
                    requestGroups={requestGroup}
                    variant="banner"
                    className="w-full justify-center"
                    coloredBackground={true}
                    easeIn={false}
                />

                {/*<AsyncRequestOverlayA
                requestKey={props.keys}
                show={["success"]}
                minLoadingMs={0}
                minSuccessMs={3000}
                maxErrorMs={3000}
                variant="banner"
                className="w-full justify-center"
                coloredBackground={true}
            />
            <AsyncRequestOverlayA
                requestKey={["card:copy", "card:move", "card:mirror"]}
                show={["success"]}
                minLoadingMs={0}
                minSuccessMs={3000}
                maxErrorMs={3000}
                variant="banner"
                className="w-full justify-center"
                coloredBackground={true}
            />*/}
            </>
        </motion.div>

    )
})

export const AsyncRequestToasterController = () => {
    const keys: AsyncRequestKey[] = ["list:detach", "list:move", "card:move:bulk",
        "card:edit:dates:editmodal"]

    const keysCard: AsyncRequestKey[] = ["card:copy", "card:move", "card:mirror", "card:create", "card:edit:title:inline", "card:edit:dates:add:editmodal"]
    const keysCardB: AsyncRequestKey[] = ["card:create", "workspace:create", "list:create", "list:move:dnd", "card:move:dnd"]
    const keysArchive: AsyncRequestKey[] = ["card:delete", "list:detach", "board:archive:list:purge", "board:archive:card:purge"]
    const keysWatchBoardList: AsyncRequestKey[] = ["watch:add:board", "watch:add:list", "watch:patch:board", "watch:patch:list"]
    const keysShareLink: AsyncRequestKey[] = ["board:sharelink:revoke", "workspace:sharelink:revoke", "workspace:member:role:update"]




    const openOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)

    const { isLoading, isSuccessful, errorMessage } = useAsyncRequestGroup(keys)
    const { isLoading: isLoadingCard, isSuccessful: isSuccessfulCard, errorMessage: errorMessageCard } = useAsyncRequestGroup(keysCard)
    const { isLoading: isLoadingCardB, isSuccessful: isSuccessfulCardB, errorMessage: errorMessageCardB } = useAsyncRequestGroup(keysCardB)
    const { isLoading: isLoadingArchive, isSuccessful: isSuccessfulArchive, errorMessage: errorMessageArchive } = useAsyncRequestGroup(keysArchive)
    const { isLoading: isLoadingWatchBoardList, isSuccessful: isSuccessfulWatchBoardList, errorMessage: errorMessageWatchBoardList } = useAsyncRequestGroup(keysWatchBoardList)
    const { isLoading: isLoadingShareLink, isSuccessful: isSuccessfulShareLink, errorMessage: errorMessageShareLink } = useAsyncRequestGroup(keysShareLink)




    const asycRequestToastRef = useRef<HTMLDivElement>(null)
    const asyncToasId = "async-toast-menu";
    function handleOpenToastNotification(keysA?: AsyncRequestKey[]) {

        console.log("Opening async request toast notification with state:", { isLoading, isSuccessful, errorMessage });

        const descriptor: OverlayDescriptor = {
            id: asyncToasId,
            render: () => <AsyncRequestToaster ref={asycRequestToastRef} keys={keys} />,
            panelRef: asycRequestToastRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "async-toaster",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: false,
                closeOnEscape: false,
                lockBackdrop: false,
                passthrough: true,
            },
            position: {
                virtual: "viewport-top-center",
                offset: [0, -20],
            }
        }
        openOverlay(descriptor);

    }

    const timeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isSuccessful) {
            handleOpenToastNotification();
            if (isSuccessful || errorMessage) {
                scheduleCloseOverlay();
            }
        }
        // Do NOT close on idle — state resets to idle before scheduleCloseOverlay fires,
        // so closing here would prematurely dismiss the toast.
    }, [isSuccessful, isLoading, errorMessage])

    useEffect(() => {
        if (isLoadingCard || isSuccessfulCard || errorMessageCard) {
            handleOpenToastNotification(keysCard);
            if (isSuccessfulCard || errorMessageCard) {
                scheduleCloseOverlay();
            }
        }
    }, [isLoadingCard, isSuccessfulCard, errorMessageCard]);

    useEffect(() => {
        if (errorMessageCardB) {
            handleOpenToastNotification(keysCardB);
            if (isSuccessfulCardB || errorMessageCardB) {
                scheduleCloseOverlay();
            }
        }
    }, [isLoadingCardB, isSuccessfulCardB, errorMessageCardB]);

    useEffect(() => {
        if (isLoadingArchive || isSuccessfulArchive || errorMessageArchive) {
            handleOpenToastNotification(keysArchive);
            if (isSuccessfulArchive || errorMessageArchive) {
                scheduleCloseOverlay();
            }
        }
    }, [isLoadingArchive, isSuccessfulArchive, errorMessageArchive]);

    useEffect(() => {
        if (isLoadingWatchBoardList || isSuccessfulWatchBoardList || errorMessageWatchBoardList) {
            handleOpenToastNotification(keysWatchBoardList);
            if (isSuccessfulWatchBoardList || errorMessageWatchBoardList) {
                scheduleCloseOverlay();
            }
        }
    }, [isLoadingWatchBoardList, isSuccessfulWatchBoardList, errorMessageWatchBoardList]);

    useEffect(() => {
        if (isLoadingShareLink || isSuccessfulShareLink || errorMessageShareLink) {
            handleOpenToastNotification(keysShareLink);
            if (isSuccessfulShareLink || errorMessageShareLink) {
                scheduleCloseOverlay();
            }
        }
    }, [isLoadingShareLink, isSuccessfulShareLink, errorMessageShareLink]);

    const scheduleCloseOverlay = () => {
        if (timeOutRef.current) {
            clearTimeout(timeOutRef.current);
        }
        timeOutRef.current = setTimeout(() => {
            closeOverlay(asyncToasId);
        }, 3000)
    }


    return null;
}