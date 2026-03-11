import { useWorkspaceStore } from "@/stores/workspaceStore"
import { type IconId, iconCatalog } from "@/icons/iconCatalog"
import { getClassNamesForColorToken } from "@/domain/colorTokens"
import type { Workspace } from "@/stores/types"



export const useWorkspaceDerivedProps = (workspaceID?: string, workspaceOverride?: Workspace) => {
    const workspacesById = useWorkspaceStore((state) => state.workspacesById)

    const workspace = workspaceOverride ?? (workspaceID ? workspacesById[workspaceID] : null)

    const isValidIconId = (iconId?: string): iconId is IconId => {
        if (!iconId) return false
        return iconId in iconCatalog
    }

    const iconId = isValidIconId(workspace?.Props?.IconID) ? workspace.Props.IconID : undefined
    const iconBgToken = (workspace?.Props?.IconBg as string | undefined) ?? "ws_flat_slate"
    const iconBorderToken = (workspace?.Props?.IconBorderColor as string | undefined) ?? "ws_border_none"
    const iconBgTokenClass = getClassNamesForColorToken(iconBgToken)
    const iconBgInlineStyle = iconBgTokenClass ? undefined : (iconBgToken?.startsWith("#") ? { backgroundColor: iconBgToken } : undefined)

    const resolveColorValue = (tokenOrHex?: string) => {
        if (!tokenOrHex) return undefined
        if (tokenOrHex.startsWith("#")) return tokenOrHex

        const className = getClassNamesForColorToken(tokenOrHex)
        const hexMatches = className.match(/#[0-9a-fA-F]{3,8}/g)
        return hexMatches?.[0]
    }

    const iconBorderColor = resolveColorValue(iconBorderToken)
    const hasBorder = iconBorderToken !== "ws_border_none" && !!iconBorderColor

    const coverType = workspace?.Props?.Cover?.Type
    const coverImage = coverType === "image"
        ? (workspace?.Props?.Cover?.ImageUrl ?? undefined)
        : (coverType ? undefined : (workspace?.Props?.Cover?.ImageUrl ?? undefined))
    const coverColor = coverType === "color"
        ? (workspace?.Props?.Cover?.Color ?? undefined)
        : (coverType ? undefined : (workspace?.Props?.Cover?.Color ?? undefined))

    let footerBackgroundColorOverride = resolveColorValue(workspace?.Props?.FooterColor as string | undefined)
    footerBackgroundColorOverride = "rgba(0,0,0,0.3)"

    return {
        workspace,
        workspaceName: workspace?.Name || "Unknown Workspace",
        avatarProps: {
            iconId,
            hasBorder,
            iconBgTokenClass,
            iconBgInlineStyle,
            iconBorderColor,
        },
        headerProps: {
            coverType,
            coverImage,
            coverColor,
            footerBackgroundColorOverride,
        },
    }
}
