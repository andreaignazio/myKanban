import { forwardRef } from "react"


type InlineEditableTitleProps = {
    title: string;
    setTitle: (title: string) => void;
    setTitleFocused: (focused: boolean) => void;
    titleFocused: boolean;
    handleOnBlurTitle: () => void;
    isDisabled?: boolean;
    className?: string;
    focusDragThreshold?: number;
    onPointerDownCapture?: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
    isReadonly?: boolean
    inputClassName?: string;
}

export const InlineEditableTitle = forwardRef<HTMLInputElement, InlineEditableTitleProps>((props, ref) => {
    const { title, setTitle, handleOnBlurTitle, isDisabled, className, titleFocused, isReadonly = false, inputClassName } = props;

    return (
        <div
            onPointerDownCapture={props.onPointerDownCapture}
            onPointerMove={props.onPointerMove}
            onPointerUp={props.onPointerUp}
            onPointerCancel={props.onPointerCancel}
            className={`inline-grid w-max overflow-hidden font-inter text-inherit  
                        transition-all duration-300 ease-in-out
                        bg-menusec rounded-[4px] h-8 
                        ${isReadonly ? "cursor-default" : "cursor-pointer"}
                        ${className}
                        ${isDisabled
                    ? 'border-none bg-neutral-600/20 text-neutral-400'
                    : titleFocused
                        ? 'border border-blue-500 ring-inset ring-2 ring-opacity-100 ring-[#8fb8f6]'
                        : 'border border-neutral-500 border-opacity-0 bg-transparent'}`}
        >
            {/* mirrors the input text to give the grid cell an intrinsic width */}
            <span aria-hidden style={{ gridArea: '1/1' }} className="invisible whitespace-pre  px-2 self-center">{title || ' '}</span>
            <input
                ref={ref}
                size={1}
                style={{ gridArea: '1/1', pointerEvents: titleFocused ? 'auto' : 'none' }}
                className={`min-w-0 px-2 ${inputClassName}
                transition-all duration-300 ease-in-out
                bg-transparent focus:outline-none text-inherit
                ${!titleFocused ? 'truncate' : ''}`}

                onFocus={() => props.setTitleFocused(true)}
                onBlur={handleOnBlurTitle}
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)} />
        </div>
    )
})