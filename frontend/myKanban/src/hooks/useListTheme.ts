import { getListCoverTheme } from "@/domain/colorTokens"
import type { BoardListAccessMode } from "@/stores/types"
import { useListsStore } from "@/stores/listsStore"

const toRgba = (hex: string, alpha: number): string => {
    const normalized = hex.replace("#", "")
    if (normalized.length !== 6) return hex
    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function useListTheme(listID: string | null, accessMode: BoardListAccessMode = "editable") {
    const list = useListsStore((state) => (listID ? state.listsById[listID] : undefined))
    const listColor =
        typeof list?.Props?.Color === "string"
            ? list.Props.Color
            : (typeof list?.Props?.Props === "object" && list?.Props?.Props !== null && typeof (list.Props.Props as Record<string, unknown>).Color === "string"
                ? (list.Props.Props as Record<string, unknown>).Color as string
                : undefined)
    const listTheme = getListCoverTheme(listColor)
    const hasListTheme = !!listID && !!listTheme
    const isReadonly = accessMode === "readonly"
    const listTextColor = isReadonly
        ? toRgba(listTheme?.text ?? "#ffffff", 0.82)
        : (listTheme?.text ?? "#ffffff")
    const resolvedListColor = isReadonly
        ? toRgba(listTheme?.bg ?? listColor ?? "#101204", 0.78)
        : listColor

    return { listColor: resolvedListColor, listTheme, listTextColor, hasListTheme, isReadonly }
}
