import { XMarkIcon } from "@heroicons/react/24/solid";
import { useRef } from "react";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CustomInput, type CustomInputHandle } from "../menuElements/CustomInput";

type ShareOfferRespondHeadlessProps = {
    onClose: () => void;
    onAccept: () => void;
    onReject: () => void;
    theme?: "light" | "dark";
    mode?: "respond" | "revoke";
}

const themeStyles = {
    danger: {
        bg: "bg-rose-500/50",
        text: "text-rose-200/80",
        hoverBg: "hover:bg-rose-500/30",
        border: "border-rose-500/50",
        ring: "ring-2 ring-inset ring-rose-500/50",
    },
    accept: {
        bg: "bg-teal-600/80",
        text: "text-teal-100",
        hoverBg: "hover:bg-teal-500/90",
        border: "border-teal-600/80",
    }
}


export function ShareOfferRespondHeadless({ onClose, onAccept, onReject, theme = "dark", mode = "respond" }: ShareOfferRespondHeadlessProps) {
    const msgRef = useRef<CustomInputHandle>(null)
    const isLight = theme === "light"
    const isRevoke = mode === "revoke"

    const buttonClass = `items-center justify-center w-full px-[32px] py-4 !rounded-lg transition-all ease-in-out duration-300`
    const title = isRevoke ? "Revoke Share Invite" : "Respond to Share Offer"

    return (
        <div className="w-[520px] relative flex flex-col items-center justify-center gap-2 p-6 pb-6 !pt-4 ">
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
                className={`${isLight ? "!bg-zinc-100 !text-zinc-900" : "!bg-zinc-900"}`}
            />

            <div className="w-full font-inter font-normal
             flex flex-row items-center justify-between mt-2 gap-4">
                {!isRevoke && (
                    <LabeledButtonCustom label={"Reject"} onClick={onReject}
                        className={`theme-dark ${buttonClass}  ${themeStyles.danger.ring} ${themeStyles.danger.hoverBg}
                         text-rose-400/80`}>
                    </LabeledButtonCustom>
                )}
                <LabeledButtonCustom
                    label={isRevoke ? "Revoke" : "Accept"}
                    onClick={isRevoke ? onReject : onAccept}
                    className={isRevoke
                        ? `theme-dark ${buttonClass} ${themeStyles.danger.ring} ${themeStyles.danger.hoverBg} text-rose-400/80`
                        : `theme-dark ${buttonClass} bg-teal-600/80 text-teal-100 ${themeStyles.accept.hoverBg}`}
                />
            </div>
        </div>
    )
}

