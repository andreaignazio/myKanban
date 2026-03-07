import { getListCoverTheme } from "@/domain/colorTokens"
import type { BoardListAccessMode, List } from "@/stores/types"
import { useListsStore } from "@/stores/listsStore"

const toRgba = (hex: string, alpha: number): string => {
    const normalized = hex.replace("#", "")
    if (normalized.length !== 6) return hex
    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.replace("#", "")
    if (normalized.length !== 6) return null

    const r = Number.parseInt(normalized.slice(0, 2), 16)
    const g = Number.parseInt(normalized.slice(2, 4), 16)
    const b = Number.parseInt(normalized.slice(4, 6), 16)

    if ([r, g, b].some((value) => Number.isNaN(value))) return null
    return { r, g, b }
}

const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
    const toHex = (value: number) => clamp(value).toString(16).padStart(2, "0")
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const mixHexColors = (sourceHex: string, targetHex: string, targetWeight: number): string | null => {
    const sourceRgb = hexToRgb(sourceHex)
    const targetRgb = hexToRgb(targetHex)
    if (!sourceRgb || !targetRgb) return null

    const weight = Math.max(0, Math.min(1, targetWeight))
    const invWeight = 1 - weight

    return rgbToHex(
        sourceRgb.r * invWeight + targetRgb.r * weight,
        sourceRgb.g * invWeight + targetRgb.g * weight,
        sourceRgb.b * invWeight + targetRgb.b * weight,
    )
}

const createGradientFromListColor = (baseHex: string): string => {
    const lighter = mixHexColors(baseHex, "#ffffff", 0.14) ?? baseHex
    const darker = mixHexColors(baseHex, "#0f172a", 0.22) ?? baseHex
    return `linear-gradient(135deg, ${lighter} 0%, ${darker} 100%)`
}

type ListThemeSource = string | List | null | undefined

export function useListTheme(listSource: ListThemeSource, accessMode: BoardListAccessMode = "editable") {
    const listID = typeof listSource === "string" ? listSource : null
    const listFromStore = useListsStore((state) => (listID ? state.listsById[listID] : undefined))
    const list = typeof listSource === "string" || listSource == null ? listFromStore : listSource
    const listColor =
        typeof list?.Props?.Color === "string"
            ? list.Props.Color
            : (typeof list?.Props?.Props === "object" && list?.Props?.Props !== null && typeof (list.Props.Props as Record<string, unknown>).Color === "string"
                ? (list.Props.Props as Record<string, unknown>).Color as string
                : undefined)
    const listTheme = getListCoverTheme(listColor)
    const gradientBaseColor = listTheme?.bg ?? (typeof listColor === "string" && listColor.startsWith("#") ? listColor : "#2454A5")
    const listGradient = createGradientFromListColor(gradientBaseColor)
    const hasListTheme = !!list && !!listTheme
    const isReadonly = accessMode === "readonly"
    const listTextColor = isReadonly
        ? toRgba(listTheme?.text ?? "#ffffff", 0.82)
        : (listTheme?.text ?? "#ffffff")
    const resolvedListColor = isReadonly
        ? toRgba(listTheme?.bg ?? listColor ?? "#101204", 0.78)
        : listColor

    return { listColor: resolvedListColor, listTheme, listTextColor, hasListTheme, isReadonly, listGradient }
}
