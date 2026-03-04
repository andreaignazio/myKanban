import { useEffect, useMemo, useState } from "react";

const HEX_RE = /#([0-9a-fA-F]{6})/g;

type RGB = { r: number; g: number; b: number };

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string): RGB => {
    const cleanHex = hex.replace("#", "");
    const parsed = Number.parseInt(cleanHex, 16);

    return {
        r: (parsed >> 16) & 255,
        g: (parsed >> 8) & 255,
        b: parsed & 255,
    };
};

const rgbToHex = ({ r, g, b }: RGB): string => {
    const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixChannel = (base: number, target: number, factor: number): number =>
    base + (target - base) * factor;

const mixRgb = (base: RGB, target: RGB, factor: number): RGB => ({
    r: mixChannel(base.r, target.r, factor),
    g: mixChannel(base.g, target.g, factor),
    b: mixChannel(base.b, target.b, factor),
});

const srgbToLinear = (value: number): number => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
};

const luminance = ({ r, g, b }: RGB): number =>
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

const extractCoverBaseColor = (coverClassName?: string | null): RGB | null => {
    if (!coverClassName) return null;

    const hexValues = [...coverClassName.matchAll(HEX_RE)].map((match) => `#${match[1]}`);
    if (hexValues.length === 0) return null;

    const rgbValues = hexValues.map(hexToRgb);
    const total = rgbValues.reduce(
        (acc, color) => ({
            r: acc.r + color.r,
            g: acc.g + color.g,
            b: acc.b + color.b,
        }),
        { r: 0, g: 0, b: 0 }
    );

    return {
        r: total.r / rgbValues.length,
        g: total.g / rgbValues.length,
        b: total.b / rgbValues.length,
    };
};

const sampleImageAverageColor = (imageUrl: string): Promise<RGB | null> => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";

        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const width = 24;
                const height = 24;
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d", { willReadFrequently: true });
                if (!context) {
                    resolve(null);
                    return;
                }

                context.drawImage(image, 0, 0, width, height);
                const pixelData = context.getImageData(0, 0, width, height).data;

                let r = 0;
                let g = 0;
                let b = 0;
                const pixels = pixelData.length / 4;

                for (let index = 0; index < pixelData.length; index += 4) {
                    r += pixelData[index];
                    g += pixelData[index + 1];
                    b += pixelData[index + 2];
                }

                resolve({ r: r / pixels, g: g / pixels, b: b / pixels });
            } catch {
                resolve(null);
            }
        };

        image.onerror = () => resolve(null);
        image.src = imageUrl;
    });
};

const clampFactor = (value: number): number => Math.max(0, Math.min(1, value));

const deriveContrastColors = (base: RGB, contrast: number): UseCoverDerivedColorsResult => {
    const normalizedContrast = clampFactor(contrast);
    const lightness = luminance(base);
    const darkTarget = { r: 20, g: 20, b: 20 };
    const lightTarget = { r: 236, g: 236, b: 236 };

    const target = lightness > 0.5 ? darkTarget : lightTarget;
    const baseFactor = 0.18 + normalizedContrast * 0.48;
    const ringFactor = clampFactor(baseFactor + 0.12);

    return {
        footerBackgroundColor: rgbToHex(mixRgb(base, target, baseFactor)),
        avatarRingColor: rgbToHex(mixRgb(base, target, ringFactor)),
    };
};

type UseCoverDerivedColorsResult = {
    footerBackgroundColor: string;
    avatarRingColor: string;
};

type UseCoverDerivedColorsOptions = {
    coverClassName?: string | null;
    coverImageUrl?: string | null;
    contrast?: number;
    fallbackColor?: string;
};

export const useCoverDerivedColors = ({
    coverClassName,
    coverImageUrl,
    contrast = 0.5,
    fallbackColor = "#262626",
}: UseCoverDerivedColorsOptions): UseCoverDerivedColorsResult => {
    const fallbackResult = useMemo(
        () => ({
            footerBackgroundColor: fallbackColor,
            avatarRingColor: fallbackColor,
        }),
        [fallbackColor]
    );

    const classBasedResult = useMemo(() => {
        const classBase = extractCoverBaseColor(coverClassName);
        return classBase ? deriveContrastColors(classBase, contrast) : fallbackResult;
    }, [coverClassName, contrast, fallbackResult]);

    const [derivedColors, setDerivedColors] = useState<UseCoverDerivedColorsResult>(classBasedResult);

    useEffect(() => {
        let active = true;

        const derive = async () => {
            if (coverImageUrl) {
                const imageBase = await sampleImageAverageColor(coverImageUrl);
                if (active && imageBase) {
                    setDerivedColors(deriveContrastColors(imageBase, contrast));
                    return;
                }
            }

            if (active) {
                setDerivedColors(classBasedResult);
            }
        };

        derive();

        return () => {
            active = false;
        };
    }, [coverImageUrl, contrast, classBasedResult]);

    return derivedColors;
};
