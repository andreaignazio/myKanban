import { useImageAverageColor } from "./useImageAverageColor";

type RGB = { r: number; g: number; b: number };

const srgbToLinear = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const luminance = ({ r, g, b }: RGB): number =>
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

const parseCssColor = (color: string): RGB | null => {
    const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };

    const hex = color.match(/^#([0-9a-fA-F]{3,8})/);
    if (hex) {
        let h = hex[1];
        if (h.length === 3) h = h.split("").map(c => c + c).join("");
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }

    return null;
};

const hexToRgb = (hex: string): RGB | null => parseCssColor(hex);

type UseIsDarkBackgroundResult = {
    isDark: boolean;
    isLoading: boolean;
}

/**
 * Detects whether a background (solid color or image) is perceptually dark.
 * - color: any CSS color string (rgb, rgba, hex)
 * - imageUrl: sampled via canvas at 24x24, async
 * Falls back to isDark=true while loading or on error.
 */
export function useIsDarkBackground({ color, imageUrl }: { color?: string; imageUrl?: string }): UseIsDarkBackgroundResult {
    const { averageColor, isLoading } = useImageAverageColor(imageUrl ?? null);

    if (imageUrl) {
        if (isLoading || !averageColor) return { isDark: true, isLoading: true };
        const rgb = hexToRgb(averageColor);
        return { isDark: !rgb || luminance(rgb) < 0.179, isLoading: false };
    }

    if (color) {
        const rgb = parseCssColor(color);
        return { isDark: !rgb || luminance(rgb) < 0.179, isLoading: false };
    }

    return { isDark: true, isLoading: false };
}
