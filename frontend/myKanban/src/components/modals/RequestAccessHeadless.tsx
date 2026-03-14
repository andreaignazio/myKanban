import { useRef, useState } from "react"
import { XMarkIcon } from "@heroicons/react/24/solid"
import { LabeledButtonCustom } from "../buttons/labeledButton"
import { CustomDropDown, type MenuItem } from "../menuElements/CustomDropDown"
import { CustomInput, type CustomInputHandle } from "../menuElements/CustomInput"

type RequestAccessHeadlessProps = {
    onClose: () => void
    onSubmit: (message: string, role: string) => void
    availableRoles: MenuItem[]
    targetType: "board" | "workspace"
    theme?: "light" | "dark"
}

export function RequestAccessHeadless({ onClose, onSubmit, availableRoles, targetType, theme = "dark" }: RequestAccessHeadlessProps) {
    const msgRef = useRef<CustomInputHandle>(null)
    const [role, setRole] = useState(availableRoles[0]?.id ?? "viewer")

    const isLight = theme === "light"
    const title = targetType === "board" ? "Request Board Access" : "Request Workspace Access"
    const buttonClass = "items-center justify-center w-full px-[32px] py-4 !rounded-lg transition-all ease-in-out duration-300"

    const roleItems: MenuItem[] = availableRoles.map((r) => ({
        ...r,
        onClick: () => { r.onClick?.(); setRole(r.id) },
    }))

    return (
        <div className="w-[520px] relative flex flex-col items-center justify-center gap-2 p-6 pb-6 !pt-4">
            <div className="justify-between items-center flex flex-row w-full mb-3 mt-2">
                <span className={`text-lg font-medium ${isLight ? "text-neutral-800" : "text-white"}`}>{title}</span>
                <div onClick={onClose} className="rounded-md p-1.5 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                    <XMarkIcon className={`w-6 aspect-square ${isLight ? "text-neutral-700" : "text-white"}`} />
                </div>
            </div>

            <CustomInput
                ref={msgRef}
                useTextArea
                placeholder="Add a message (optional)"
                textAreaClassName="min-h-[96px]"
                className={`${isLight ? "!bg-zinc-100 !text-zinc-900" : "!bg-zinc-900/50"}`}
            />

            <div className="w-full flex flex-row items-center h-11 justify-between gap-4 mt-2">
                <div className="h-full w-40">
                    <CustomDropDown
                        className="!rounded !h-11"
                        items={roleItems}
                        btnId="access-request-role-selector"
                        activeId={role}
                        placeholderCustom="Select role"
                    />
                </div>
                <LabeledButtonCustom
                    label="Request Access"
                    onClick={() => onSubmit(msgRef.current?.getElement()?.value ?? "", role)}
                    className={`h-11
                        theme-dark ${buttonClass} bg-teal-600/80 text-teal-100 hover:bg-teal-500/90`}
                />
            </div>
        </div>
    )
}
