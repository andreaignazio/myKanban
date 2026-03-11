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
}

export const InlineEditableTitle = forwardRef<HTMLInputElement, InlineEditableTitleProps>((props, ref) => {
    const { title, setTitle, handleOnBlurTitle, isDisabled, className, titleFocused, isReadonly = false } = props;

    return (
        <div
            onPointerDownCapture={props.onPointerDownCapture}
            onPointerMove={props.onPointerMove}
            onPointerUp={props.onPointerUp}
            onPointerCancel={props.onPointerCancel}
            className={`flex flex-row overflow-hidden font-inter 
                        bg-menusec w-full text-inherit  rounded-[4px] h-8 
                        ${isReadonly ? "cursor-default" : "cursor-pointer"}
                        ${className}
                        ${isDisabled
                    ? 'border-none bg-neutral-600/20 text-neutral-400'
                    : titleFocused
                        ? 'border border-blue-500 ring-inset ring-2 ring-opacity-100 ring-[#8fb8f6]'
                        : 'border border-neutral-500 border-opacity-0 bg-transparent'}`}
        >
            <input
                ref={ref}
                className={` ${titleFocused ? "pointer-events-auto" : "pointer-events-none cursor-pointer"}
                ps-2 bg-transparent focus:outline-none text-inherit`}
                /*onPointerDown={(e) => {
                    e.preventDefault()
                    pointerStartRef.current = { x: e.clientX, y: e.clientY }
                    suppressNextFocusRef.current = false
                }}
                onPointerMove={(e) => {
                    const start = pointerStartRef.current
                    if (!start) return
                    const deltaX = Math.abs(e.clientX - start.x)
                    const deltaY = Math.abs(e.clientY - start.y)
                    if (deltaX > focusDragThreshold || deltaY > focusDragThreshold) {
                        suppressNextFocusRef.current = true
                    }
                }}
                onPointerUp={clearPointerStart}
                onPointerCancel={clearPointerStart}
                onFocus={(e) => {
                    if (suppressNextFocusRef.current) {
                        suppressNextFocusRef.current = false
                        e.currentTarget.blur()
                        return
                    }
                    //setTitleFocused(true)
                }}*/
                onBlur={handleOnBlurTitle}
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)} />
        </div>
    )
})