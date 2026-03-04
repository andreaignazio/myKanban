
import { Grid2X2Plus } from "lucide-react"
import { CatalogIcon } from "@/icons/iconCatalog"
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps"
import type { Workspace } from "@/stores/types"

type WorkspaceAvatarProps = {
    workspaceID?: string
    workspaceOverride?: Workspace
    size?: number
    radius?: number | string
    padding?: number | string
    showWireFrame?: boolean
}


export const WorkspaceAvatar = ({ workspaceID, workspaceOverride, size = 48, radius = 24, padding = 20, showWireFrame = false }: WorkspaceAvatarProps) => {
    const { avatarProps } = useWorkspaceDerivedProps(workspaceID, workspaceOverride)
    const { iconId, hasBorder, iconBgTokenClass, iconBgInlineStyle, iconBorderColor } = avatarProps


    return (

        <div

            className={` 
                 ${hasBorder ? "border-[2px]" : "border-0"} ${iconBgTokenClass}`}
            style={hasBorder ? {
                ...iconBgInlineStyle,
                borderColor: iconBorderColor,
                borderRadius: radius, padding: padding
            } : { ...iconBgInlineStyle, borderRadius: radius, padding: padding }}>
            {iconId ? (
                <CatalogIcon id={iconId} className="text-neutral-300" width={size} height={size} />
            ) : (
                <Grid2X2Plus className="text-neutral-300" size={size} strokeWidth={1} />
            )}
        </div>

    )

}