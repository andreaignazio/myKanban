import { forwardRef, useEffect, useState } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { RequestAccessHeadless } from "./RequestAccessHeadless"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useAsyncKey } from "@/stores/asyncRequestStore"
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay"
import type { MenuItem } from "../menuElements/CustomDropDown"

type RequestAccessModalProps = {
    targetType: "board" | "workspace"
    targetID: string
    onClose?: () => void
    onSuccess?: () => void
}

export const RequestAccessModal = forwardRef<HTMLDivElement, RequestAccessModalProps>(
    ({ targetType, targetID, onClose, onSuccess }, ref) => {
        const createBoardAccessRequest = useShareOffersStore((state) => state.createBoardAccessRequest)
        const createWorkspaceAccessRequest = useShareOffersStore((state) => state.createWorkspaceAccessRequest)

        const requestKey = useAsyncKey(
            targetType === "board" ? "board:access:request" : "workspace:access:request",
            targetID
        )

        const { displaySuccess } = useAsyncRequestDisplay(requestKey, { minSuccessMs: 1200 })
        const [submitted, setSubmitted] = useState(false)

        useEffect(() => {
            if (submitted && displaySuccess) {
                onSuccess?.()
                onClose?.()
            }
        }, [submitted, displaySuccess])

        // Backend accepts only "viewer" | "member" for both board and workspace access requests
        const availableRoles: MenuItem[] = [
            { id: "member", label: "Member" },
            { id: "viewer", label: "Viewer" },
        ]

        async function handleSubmit(message: string, role: string) {
            setSubmitted(true)
            if (targetType === "board") {
                await createBoardAccessRequest(targetID, message, role as "member" | "viewer")
            } else {
                await createWorkspaceAccessRequest(targetID, message, role as "member" | "viewer")
            }
        }

        return (
            <CommonMenuWrapper
                className="!bg-zinc-800"
                ref={ref}
                onClose={onClose}
                requestKey={requestKey}
            >
                <RequestAccessHeadless
                    targetType={targetType}
                    availableRoles={availableRoles}
                    onClose={() => onClose?.()}
                    onSubmit={handleSubmit}
                />
            </CommonMenuWrapper>
        )
    }
)
