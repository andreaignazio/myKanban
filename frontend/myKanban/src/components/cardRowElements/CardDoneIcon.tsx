import { CheckIcon } from "lucide-react";

type CardDoneIconProps = {
    done: boolean;
    handleDoneToggle?: () => void;
    showWhenNotDone?: boolean;
    disabled?: boolean;
    disabledColorClasses?: colorClasses;
}

type colorClasses = {
    borderColorClass?: string;
    bgColorClass?: string;
    textColorClass?: string;
}

export const CardDoneIcon = ({ done, handleDoneToggle, showWhenNotDone, disabled, disabledColorClasses }: CardDoneIconProps) => {
    if (!done && !showWhenNotDone) return null;
    return (
        <div className={`${done ? "w-5" : "w-0 opacity-0 group-hover:w-5 group-hover:opacity-100"} 
         transition-all duration-300 h-5 p-[0.2px] 
         aspect-square rounded-full border-2 
         ${done ? "border-done bg-done" : "border-gray-500"} 
         ${disabled ? `${disabledColorClasses?.borderColorClass ?? "border-gray-500"} 
         ${disabledColorClasses?.bgColorClass ?? "bg-gray-500"}
          ${disabledColorClasses?.textColorClass ?? "text-gray-500"}` : "cursor-pointer"}`}
            onClickCapture={(e) => {
                e.stopPropagation();
                disabled ? undefined : handleDoneToggle?.()
            }

            }>
            {done && <CheckIcon className="w-full h-full text-menu" />}
        </div>
    )
}