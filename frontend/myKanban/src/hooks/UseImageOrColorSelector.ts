import type { ColorToken } from "@/domain/colorTokens";
import { useState } from "react";

export function useImageOrColorSelector() {

    const [selectedColor, setSelectedColor] = useState<ColorToken | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleSetColor = (color: ColorToken) => {
        setSelectedColor(color);
        setSelectedImage(null);
    }

    const handleSetImage = (image: string) => {
        setSelectedImage(image);
        setSelectedColor(null);
    }

    return {
        selectedColor,
        selectedImage,
        handleSetColor,
        handleSetImage
    }

}