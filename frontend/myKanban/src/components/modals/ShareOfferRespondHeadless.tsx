import { XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { LabeledButtonCustom } from "../buttons/labeledButton";

type ShareOfferRespondHeadlessProps = {
    onClose: () => void;
    onAccept: () => void;
    onReject: () => void;
    theme?: "light" | "dark";
}

export function ShareOfferRespondHeadless({ onClose, onAccept, onReject, theme = "dark" }: ShareOfferRespondHeadlessProps) {
    const [isFocusedMsg, setIsFocusedMsg] = useState(false)

    const handleFocusMsg = () => {
        setIsFocusedMsg(true)
    }

    const handleBlurMsg = () => {
        setIsFocusedMsg(false)
    }

    const isLight = theme === "light"

    return (
        <div className="w-[420px] relative flex flex-col items-center justify-center gap-2 p-4">
            <div className="justify-between items-center flex flex-row w-full mb-3 mt-2">
                <span className={`text-lg font-medium ${isLight ? "text-neutral-800" : "text-white"}`}>Respond to Workspace Share Offer</span>

                <div onClick={onClose} className="rounded-md p-1.5 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                    <XMarkIcon className={`w-6 aspect-square ${isLight ? "text-neutral-700" : "text-white"}`} />
                </div>
            </div>

            <div className={`flex w-full h-24 overflow-hidden rounded-md ${isFocusedMsg
                ? 'border border-blue-500 ring-inset ring-4 ring-opacity-100 ring-blue-500'
                : isLight
                    ? 'border border-neutral-400'
                    : 'border border-neutral-500 border-opacity-85'}`}>
                <textarea
                    className={`w-full h-full rounded-md p-2 ${isLight ? "bg-neutral-200 text-neutral-800" : "bg-menusec text-white"}`}
                    placeholder="Add a message (optional)"
                    onFocus={handleFocusMsg}
                    onBlur={handleBlurMsg}></textarea>
            </div>

            <div className="w-full flex flex-row items-center justify-center mt-2 gap-6">
                <LabeledButtonCustom label={"Reject Share Offer"} onClick={onReject}
                    className={"theme-dark font-medium bg-[#e06868] text-neutral-900"}>
                </LabeledButtonCustom>
                <LabeledButtonCustom label={"Accept Share Offer"} onClick={onAccept}
                    className={"theme-dark font-medium bg-[#68f0e2] text-neutral-900"}>
                </LabeledButtonCustom>
            </div>
        </div>
    )
}
