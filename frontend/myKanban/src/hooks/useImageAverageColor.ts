import { useEffect, useState } from "react";

type RGB = { r: number; g: number; b: number };

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

const rgbToHex = ({ r, g, b }: RGB): string => {
    const toHex = (c: number) => clamp(c).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const sampleAverageColor = (imageUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";

        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = 24;
                canvas.height = 24;

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (!ctx) {
                    resolve(null);
                    return;
                }

                ctx.drawImage(image, 0, 0, 24, 24);
                const data = ctx.getImageData(0, 0, 24, 24).data;

                let r = 0, g = 0, b = 0;
                const pixels = data.length / 4;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }

                resolve(rgbToHex({ r: r / pixels, g: g / pixels, b: b / pixels }));
            } catch {
                resolve(null);
            }
        };

        image.onerror = () => resolve(null);
        image.src = imageUrl;
    });
};

type UseImageAverageColorResult = {
    averageColor: string | null;
    isLoading: boolean;
};

/**
 * Samples a 24x24 downscale of the given image and returns the average color
 * as a hex string (e.g. "#3a7bc8"). Returns null while loading or on error.
 */
export function useImageAverageColor(imageUrl?: string | null): UseImageAverageColorResult {
    const [averageColor, setAverageColor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!imageUrl) {
            setAverageColor(null);
            setIsLoading(false);
            return;
        }

        let active = true;
        setIsLoading(true);

        sampleAverageColor(imageUrl).then((color) => {
            if (!active) return;
            setAverageColor(color);
            setIsLoading(false);
        });

        return () => {
            active = false;
        };
    }, [imageUrl]);

    return { averageColor, isLoading };
}
