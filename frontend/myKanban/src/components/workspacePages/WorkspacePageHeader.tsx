import { CatalogIcon, type IconId } from "@/icons/iconCatalog"

type Props = {
    title: string
    description: string
    iconId?: IconId
}

export const WorkspacePageHeader = ({ title, description, iconId }: Props) => {
    return (
        <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
            <div className="flex flex-row items-center gap-2">
                <p className="text-2xl font-bold font-grotesk tracking-tight text-zinc-200">{title}</p>
                {iconId && <CatalogIcon id={iconId} className="w-6 h-6 text-zinc-500" />}
            </div>
            <p className="text-sm font-grotesk text-zinc-400 max-w-xl">{description}</p>

        </div>
    )
}