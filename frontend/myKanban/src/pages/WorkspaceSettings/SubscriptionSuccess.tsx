import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

export const SubscriptionSuccessPage = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const navigate = useNavigate()

    useEffect(() => {
        if (!workspaceId) return
        navigate(`/workspaces/${workspaceId}/settings/subscription/upgrade`, {
            replace: true,
            state: { subscriptionSuccess: true },
        })
    }, [workspaceId, navigate])

    return null
}
