import { forwardRef } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ActionMenuWrapperProps = {
    children?: React.ReactNode
    Title: string
    onClose: () => void
    onBack?: () => void
    width?: number
    titleStyle?: React.CSSProperties
    style?: React.CSSProperties
}

export const ActionMenuWrapper = forwardRef<HTMLDivElement, ActionMenuWrapperProps>(({ children, Title, onClose, onBack, width, titleStyle, style }, ref) => {

    const resolvedStyle: React.CSSProperties = {
        ...style,
        width: style?.width ?? (width ? `${width}px` : "250px"),
        transition: style?.transition ?? "width 220ms ease",
    }

    return (
        <div ref={ref} className={`theme-dark bg-menu rounded-xl 
            shadow-lg shadow-black relative
         text-white  py-2 pb-4`} style={resolvedStyle}>
            <div onClick={onClose} className="absolute top-3 right-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <XMarkIcon className="w-5 h-5 text-white" />
            </div>
            {onBack && <div onClick={onBack} className="absolute top-3 left-3 rounded-md p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                <ChevronLeftIcon className="w-5 h-5 text-white" />
            </div>}
            <div className="text-center flex-row w-full mb-1 mt-1">
                <span className="text-xs font-inter text-neutral-300 " style={titleStyle}>{Title}</span>
            </div>
            {children}
        </div>
    )

})
