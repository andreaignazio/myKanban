import { forwardRef, useImperativeHandle, useRef, useState } from "react";

type CustomInputProps = {
    children?: React.ReactNode;
    onInputChange?: (ref?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => void;
    onBlur?: () => void;
    className?: String;
    placeholder?: string;
    value?: string;
    isDisabled?: boolean;
    paddingLeft?: number;
    useTextArea?: boolean;
    textAreaClassName?: string;
    onFocus?: () => void;
    danger?: boolean;
    focusColorClass?: string;
}

export type CustomInputHandle = {
    focus: () => void;
    blur: () => void;
    getElement: () => HTMLInputElement | HTMLTextAreaElement | null;
}

export const CustomInput = forwardRef<CustomInputHandle, CustomInputProps>(({ danger, children, onInputChange, className, placeholder, value, onBlur, isDisabled, paddingLeft, useTextArea, textAreaClassName, onFocus, focusColorClass }, ref) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        getElement: () => inputRef.current,
    }), []);

    const handleFocus = () => {
        setIsFocused(true);
        if (inputRef.current) {
            inputRef.current.classList.add("outline-none");
        }
        onFocus?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputRef.current) {
            inputRef.current.classList.remove("outline-none");
        }
    };

    const maxH = "90px";

    const handleChange = () => {
        onInputChange?.(inputRef as React.RefObject<HTMLTextAreaElement>);
        const el = inputRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            if (el.scrollHeight > parseInt(maxH)) {
                el.style.height = maxH;
                el.style.overflowY = "scroll";
            } else {
                el.style.overflowY = "hidden";
            }
        }
    };



    return (
        <div className={`flex flex-row overflow-hidden font-inter trnasition-all duration-200
                        ${danger ? "ring-red-500 ring-1 ring-inset !border-red-500/50" : ""} 
                        bg-menusec w-full text-white  rounded-[4px] ${useTextArea ? " " : "h-11"} ${className}
                        ${isDisabled ? 'border-none bg-neutral-600/20 text-neutral-400' : isFocused ?
                `border  ring-inset ring-2 ring-opacity-75 ring-blue-500 border-blue-500 ${focusColorClass}`
                : 'border border-neutral-500 border-opacity-85'}`}
        >
            <div
                style={{ paddingLeft: paddingLeft ?? 8 }}
                className=" flex flex-row gap-2 items-center justify-items-start">
                {children}
            </div>
            {!useTextArea && <input ref={inputRef as React.RefObject<HTMLInputElement>} onChange={() => onInputChange?.(inputRef as React.RefObject<HTMLInputElement>)} value={value}
                className={`w-full min-h-8 bg-transparent cursor-text ${textAreaClassName ?? ""} text-sm font-inter font-medium`}
                onFocus={handleFocus}
                onBlur={() => { handleBlur(); onBlur?.(); }}
                placeholder={placeholder ?? "Search..."}

                disabled={isDisabled}
                style={{ display: useTextArea ? "none" : "block", }}
            />}
            {useTextArea && <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                onChange={handleChange}
                value={value}
                className={`w-full bg-transparent resize-none scrollbar-hidden py-2 cursor-text ${textAreaClassName ?? ""} 
                text-sm font-inter font-medium`}
                onFocus={handleFocus}
                onBlur={() => { handleBlur(); onBlur?.(); }}
                placeholder={placeholder ?? "Search..."}
                disabled={isDisabled} style={{ display: useTextArea ? "block" : "none" }} />}


        </div>
    )


})