import CheckIcon from "@heroicons/react/24/outline/CheckIcon"
import { CardDoneIcon } from "./CardDoneIcon"
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"


type CardRowTitleProps = {
    title: string
    editMode: boolean
    done: boolean
    setDone?: () => void
    minHeight?: number
}

export const CardRowTitle = ({ title, editMode, done, setDone, minHeight = 36, canEdit }: CardRowTitleProps) => {



    return (
        <div style={{ minHeight: minHeight }}
            className="flex flex-col  justify-center">
            <div className={`group flex flex-row items-center ${done ? "ps-3" : "ps-2"}  gap-2`}>
                <div className={`transition-all duration-200 ease-in-out -translate-y-[1px]
                             ${done ? "w-4 opacity-100 " : "w-0 opacity-0 "} ${canEdit ? "group-hover:w-4 group-hover:opacity-100 " : ""}`} >



                    <CardDoneIconDummy done={done} size={17} handleDoneToggle={setDone} />
                </div>


                <span className={`flex-1 text-base  
                !text-[14px] font-normal
                ${done ? " text-gray-500" : "text-gray-100"}
                 ${editMode ? "text-gray-400" : ""} 
                 transition-colors duration-200 ease-in-out break-all`}>
                    {title}
                </span>

            </div>

        </div>
    )
}

type CardDoneIconProps = {
    done: boolean;
    handleDoneToggle?: () => void;
    size?: number

}


const CardDoneIconDummy = ({ done, handleDoneToggle, size = 5 }: CardDoneIconProps) => {

    return (
        <div className={`
         transition-all duration-300 p-[0.2px] 
         aspect-square rounded-full border-2 
         ${done ? "border-done bg-done" : "border-gray-500"} 
         `}
            style={{ height: size }}
            onClickCapture={(e) => {
                e.stopPropagation();
                handleDoneToggle?.()
            }

            }>
            {done && <CheckIcon className="w-full h-full text-menu" strokeWidth={3} />}
        </div>
    )
}