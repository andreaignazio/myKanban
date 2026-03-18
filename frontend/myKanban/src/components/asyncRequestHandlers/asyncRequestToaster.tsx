import { forwardRef, useEffect, useRef } from "react"
import { AsyncRequestOverlayGroups } from "./asyncRequestOverlayA"
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore"
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"
import { motion } from "motion/react"
import { useAsyncRequestStore, type AsyncRequestState } from "@/stores/asyncRequestStore"
import type { RequestGroup } from "../modals/ActionMenuWrapper"


type AsyncRequestToasterProps = {
    requestGroups: RequestGroup[];
}



const AsyncRequestToaster = forwardRef<HTMLDivElement, AsyncRequestToasterProps>((props, ref) => {




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
                    requestGroups={props.requestGroups}
                    variant="banner"
                    className="w-full justify-center"
                    coloredBackground={true}
                    easeIn={false}
                />
            </>
        </motion.div>

    )
})

export const AsyncRequestToasterController = () => {
    const keysLSE: AsyncRequestKey[] = [
        "card:copy", "card:move", "card:mirror", "card:create", "card:edit:title:inline", "card:edit:dates:add:editmodal",
        "card:delete", "list:detach", "board:archive:list:purge", "board:archive:card:purge",
        "list:create", "board:sharelink:revoke", "workspace:sharelink:revoke", "workspace:member:role:update", "list:move:crossboard"
    ]
    const keysLS: AsyncRequestKey[] = ["list:detach", "card:move:bulk", "card:edit:dates:editmodal"]
    const keysLE: AsyncRequestKey[] = ["card:create", "workspace:create", "list:move:dnd", "card:move:dnd"]
    const keysL: AsyncRequestKey[] = ["list:move:dnd", "card:move:dnd"]
    const keysS: AsyncRequestKey[] = ["list:copy:bulk", "list:mirror", "list:edit:props", "list:edit:access"]
    const keysE: AsyncRequestKey[] = ["board:archive:list:restore", "board:archive:card:restore", "board:archive:list:purge", "board:archive:card:purge"]

    const toasterGroups: RequestGroup[] = [
        { requestKey: keysLSE, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["loading", "success", "error"] },
        { requestKey: keysLS, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["loading", "success"] },
        { requestKey: keysLE, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["loading", "error"] },
        { requestKey: keysL, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["loading"] },
        { requestKey: keysS, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["success"] },
        { requestKey: keysE, minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000, show: ["error"] },
    ]




    const openOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)

    const stateLSE = useAsyncRequestGroup(keysLSE)
    const stateLS = useAsyncRequestGroup(keysLS)
    const stateLE = useAsyncRequestGroup(keysLE)
    const stateL = useAsyncRequestGroup(keysL)
    const stateS = useAsyncRequestGroup(keysS)
    const stateE = useAsyncRequestGroup(keysE)




    const asycRequestToastRef = useRef<HTMLDivElement>(null)
    const asyncToasId = "async-toast-menu";
    function handleOpenToastNotification(groups: RequestGroup[]) {

        const descriptor: OverlayDescriptor = {
            id: asyncToasId,
            render: () => <AsyncRequestToaster ref={asycRequestToastRef} requestGroups={groups} />,
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
    const lastOpenSignatureRef = useRef<string>("")

    const isGroupActive = (group: RequestGroup, state: AsyncRequestState) => {
        const show = group.show ?? ["loading", "success", "error"]
        return (show.includes("loading") && state.isLoading)
            || (show.includes("success") && state.isSuccessful === true)
            || (show.includes("error") && !!state.errorMessage)
    }

    const hasTerminalState = (group: RequestGroup, state: AsyncRequestState) => {
        const show = group.show ?? ["loading", "success", "error"]
        return (show.includes("success") && state.isSuccessful === true)
            || (show.includes("error") && !!state.errorMessage)
    }

    useEffect(() => {
        const entries: Array<{ group: RequestGroup, state: AsyncRequestState }> = [
            { group: toasterGroups[0], state: stateLSE },
            { group: toasterGroups[1], state: stateLS },
            { group: toasterGroups[2], state: stateLE },
            { group: toasterGroups[3], state: stateL },
            { group: toasterGroups[4], state: stateS },
            { group: toasterGroups[5], state: stateE },
        ]

        const activeEntries = entries.filter(({ group, state }) => isGroupActive(group, state))
        if (activeEntries.length === 0) {
            lastOpenSignatureRef.current = ""
            return
        }

        const signature = activeEntries
            .map(({ group, state }) => {
                const keys = Array.isArray(group.requestKey) ? group.requestKey : [group.requestKey]
                const show = (group.show ?? ["loading", "success", "error"]).join("|")
                return `${keys.join(",")}:${show}:${state.updatedAt ?? 0}`
            })
            .join(";;")

        if (lastOpenSignatureRef.current !== signature) {
            handleOpenToastNotification(activeEntries.map(({ group }) => group))
            lastOpenSignatureRef.current = signature
        }

        const shouldScheduleClose = activeEntries.some(({ group, state }) => hasTerminalState(group, state))
        if (shouldScheduleClose) {
            scheduleCloseOverlay()
        }
    }, [
        stateLSE.isLoading, stateLSE.isSuccessful, stateLSE.errorMessage, stateLSE.updatedAt,
        stateLS.isLoading, stateLS.isSuccessful, stateLS.errorMessage, stateLS.updatedAt,
        stateLE.isLoading, stateLE.isSuccessful, stateLE.errorMessage, stateLE.updatedAt,
        stateL.isLoading, stateL.isSuccessful, stateL.errorMessage, stateL.updatedAt,
        stateS.isLoading, stateS.isSuccessful, stateS.errorMessage, stateS.updatedAt,
        stateE.isLoading, stateE.isSuccessful, stateE.errorMessage, stateE.updatedAt,
    ])

    useEffect(() => {
        const allMonitoredKeys = Array.from(new Set(toasterGroups.flatMap((g) => Array.isArray(g.requestKey) ? g.requestKey : [g.requestKey])))
        return () => {
            if (timeOutRef.current) {
                clearTimeout(timeOutRef.current)
                timeOutRef.current = null
            }
            closeOverlay(asyncToasId)
            const resetRequest = useAsyncRequestStore.getState().resetRequest
            for (const key of allMonitoredKeys) {
                resetRequest(key)
            }
        }
    }, [closeOverlay])

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