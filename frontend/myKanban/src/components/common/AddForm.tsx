import { XIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { LabeledButtonPresetBSubmit } from "../buttons/labeledButton"
import { type CustomInputHandle, CustomInput } from "../menuElements/CustomInput"

type AddFormProps = {
    onSubmit: (title: string) => void
    onCancel: () => void
    isAdding: boolean
    setIsAdding: (isAdding: boolean) => void
    disabled?: boolean
    closedHeight?: number
    openedHeight?: number
    textAreaClassName?: string
    label?: string
    placeholder?: string
    placeholderClosed?: string
}

export const AddForm = ({ onSubmit, onCancel, isAdding, setIsAdding, disabled = false, closedHeight = 8, openedHeight = 24, textAreaClassName, label, placeholder, placeholderClosed }: AddFormProps) => {

    // const [isAddingCard, setIsAddingCard] = useState("")
    const [title, setTitle] = useState("")
    const addCardInputRef = useRef<CustomInputHandle | null>(null)

    useEffect(() => {
        if (!isAdding) {
            return
        }

        const id = requestAnimationFrame(() => {
            addCardInputRef.current?.focus()
        })

        return () => cancelAnimationFrame(id)
    }, [isAdding])

    useEffect(() => {
        if (!disabled) return
        if (isAdding) {
            setIsAdding(false)
            onCancel()
        }
    }, [disabled, isAdding, onCancel, setIsAdding])

    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && isAdding) {
                e.preventDefault()
                onSubmit(title)
                setTitle("")
            } else if (e.key === "Escape" && isAdding) {
                e.preventDefault()
                setIsAdding(false)
                onCancel()
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isAdding, title])

    return (

        <>
            <AddFormPlaceholder
                placedholder={placeholderClosed}
                isAdding={isAdding} setIsAdding={setIsAdding} closedHeight={closedHeight} disabled={disabled} />

            <AddFormOnEdit onSubmit={onSubmit}
                onCancel={onCancel}
                isAdding={isAdding}
                setIsAdding={setIsAdding}
                closedHeight={closedHeight}
                openedHeight={openedHeight}
                textAreaClassName={textAreaClassName}
                label={label}
                placeholder={placeholder}
                pendingTitle={title}
                setPendingTitle={setTitle}
            />
        </>
    )
}

type AddFormPlaceholderProps = {
    isAdding: boolean;
    setIsAdding: (isAdding: boolean) => void;
    disabled?: boolean;
    closedHeight?: number;
    placedholder?: string;
}

const AddFormPlaceholder = ({ isAdding, setIsAdding, disabled = false, closedHeight = 8, placedholder }: AddFormPlaceholderProps) => {


    return (
        <div className={`grid grid-cols-6 justify-between 
            ${isAdding
                ? `h-0 opacity-0 pointer-events-none overflow-hidden`
                : `h-${closedHeight} opacity-100`}
             transition-all duration-200 ease-in-out `}>
            <button className={`col-span-5 rounded-md 
                    bg-transparent hover:bg-neutral-500/20 transition-colors duration-200 ease-in-out
                    pb-1 pt-1 justify-text-start text-left ps-3 
                    ${disabled ? "opacity-50" : "opacity-100"}`}
                onClick={() => {
                    if (disabled) return
                    setIsAdding(true)
                }}
                disabled={disabled}
            >{placedholder ?? "+ Add new card"}
            </button>
            <button className=" w-8 justify-self-end rounded-md">...</button>
        </div>
    )

}


type AddFormOnEditProps = {
    onSubmit: (title: string) => void;
    onButtonSubmit?: (title: string) => void;
    onCancel: () => void;
    onBlurCancelEdit?: () => void;
    isAdding: boolean;
    setIsAdding: (isAdding: boolean) => void;
    closedHeight?: number;
    openedHeight?: number;
    textAreaClassName?: string;
    label?: string;
    placeholder?: string;
    pendingTitle?: string;
    setPendingTitle?: (title: string) => void;
}

export const AddFormOnEdit = ({ onSubmit, onButtonSubmit, onCancel, onBlurCancelEdit, isAdding, setIsAdding, closedHeight = 8, openedHeight = 32, textAreaClassName, label, placeholder, pendingTitle, setPendingTitle }: AddFormOnEditProps) => {
    const addCardInputRef = useRef<CustomInputHandle | null>(null)
    const formContainerRef = useRef<HTMLDivElement | null>(null)
    const suppressBlurCancelRef = useRef(false)

    const suppressNextBlurCancel = () => {
        suppressBlurCancelRef.current = true
        setTimeout(() => {
            suppressBlurCancelRef.current = false
        }, 0)
    }


    useEffect(() => {
        if (!isAdding) {
            return
        }

        const id = requestAnimationFrame(() => {
            addCardInputRef.current?.focus()
        })

        return () => cancelAnimationFrame(id)
    }, [isAdding])

    useEffect(() => {
        if (!isAdding) {
            return
        }

        const handlePointerDownOutside = (e: PointerEvent) => {
            const target = e.target as Node | null
            const isInsideForm = !!target && !!formContainerRef.current?.contains(target)
            if (isInsideForm) {
                return
            }

            setIsAdding(false)
            if (onBlurCancelEdit) {
                onBlurCancelEdit()
                return
            }
            onCancel()
        }

        document.addEventListener("pointerdown", handlePointerDownOutside)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDownOutside)
        }
    }, [isAdding, onBlurCancelEdit, onCancel, setIsAdding])



    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && isAdding) {
                e.preventDefault()
                onSubmit(pendingTitle ?? "")
                setPendingTitle?.("")
            } else if (e.key === "Escape" && isAdding) {
                e.preventDefault()
                setIsAdding(false)
                onCancel()
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isAdding, pendingTitle])

    const handleSubmit = () => {
        (onButtonSubmit ?? onSubmit)(pendingTitle ?? "")
        setPendingTitle?.("")
    }

    return (
        <div
            ref={formContainerRef}
            onBlurCapture={() => {
                if (!isAdding || !onBlurCancelEdit) return;
                if (suppressBlurCancelRef.current) return;
                setTimeout(() => {
                    const active = document.activeElement;
                    const stillInside = !!active && !!formContainerRef.current?.contains(active);
                    if (!stillInside) {
                        onBlurCancelEdit();
                    }
                }, 0);
            }}
            className={`flex flex-col transition-all duration-300 ease-in-out overflow-hidden
                  ${isAdding
                    ? `px-1 mb-1 gap-2 h-${openedHeight} opacity-100 pt-1`
                    : `h-0 min-h-0 opacity-0 pointer-events-none m-0 p-0 gap-0`
                }`}>
            <div className={`${isAdding
                ? "opacity-100 transition-opacity duration-150"
                : "opacity-0 pointer-events-none transition-none"}`}>
                <CustomInput
                    ref={addCardInputRef}
                    placeholder={placeholder ?? "Enter a title for this card..."}
                    value={pendingTitle}
                    onInputChange={(inputRef) => setPendingTitle?.(inputRef?.current?.value ?? "")}
                    useTextArea={true}
                    className={`ps-1 !h-full !mt-0 !border-none  !text-[14px]  ${textAreaClassName ?? "!rounded-xl"}`}
                />
            </div>
            <div className={`flex flex-row h-9 gap-2  
                items-center ${isAdding
                    ? "opacity-100 transition-opacity duration-150"
                    : "opacity-0 pointer-events-none transition-none"}`}
                onPointerDownCapture={suppressNextBlurCancel}>

                <LabeledButtonPresetBSubmit label={label ?? "Add Card"}
                    onClick={handleSubmit}
                    className="!h-full !w-fit !rounded-md !border-none" />

                <div className="group h-full aspect-square bg-transparent cursor-pointer 
                    transition-all duration-200 ease-in-out
                     flex items-center justify-center rounded-md
                      hover:bg-neutral-500/50">
                    <XIcon className="w-6 h-6 text-gray-500 transition-all duration-200 ease-in-out
                         group-hover:text-gray-200 cursor-pointer" onClick={() => {
                            setPendingTitle?.("")
                            setIsAdding(false)
                        }} />
                </div>
            </div>
        </div>
    )

}