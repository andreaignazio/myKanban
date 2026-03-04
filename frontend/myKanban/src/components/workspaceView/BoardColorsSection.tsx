import { flatColorTokens, gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { ButtonHoverInset } from "../menuElements/buttonHoverInset";

type BoardColorsSectionProps = {
    onSelectColor: (color: ColorToken) => void;
    showHeaders?: boolean;
    className?: string;
};

const gridClass = "grid grid-cols-3 gap-2";
const objClass = "relative h-14 w-full rounded-md cursor-pointer overflow-hidden";

export const BoardColorsSection = ({ onSelectColor, showHeaders = true, className }: BoardColorsSectionProps) => {
    return (
        <div className={`flex flex-col gap-2 ${className ?? ""}`.trim()}>
            {showHeaders && <span className="text-left text-sm font-medium text-neutral-200">Gradients</span>}
            <div className={gridClass}>
                {gradientColorTokens.map((color) => {
                    return (
                        <div
                            key={color.token}
                            className={`${objClass} ${color.className}`}
                            onClick={() => onSelectColor(color)}
                        >
                            <ButtonHoverInset onClick={() => onSelectColor(color)} />
                        </div>
                    );
                })}
            </div>

            {showHeaders && <span className="text-left text-sm font-medium text-neutral-200">Colors</span>}
            <div className={gridClass}>
                {flatColorTokens.map((color) => {
                    return (
                        <div
                            key={color.token}
                            className={`${objClass} ${color.className}`}
                            onClick={() => onSelectColor(color)}
                        >
                            <ButtonHoverInset onClick={() => onSelectColor(color)} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
