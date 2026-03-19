import { CheckIcon } from "lucide-react"


type CardDoneToggleProps = {
    done: boolean;
    handleDoneToggle: () => void;
}

export const CardDoneToggle = ({ done, handleDoneToggle }: CardDoneToggleProps) => {
    return (
        <div className={`w-5 p-[0.2px] aspect-square rounded-full border-2 
                            ${done ? "border-done bg-done" : "border-gray-500"} cursor-pointer`}
            onClick={handleDoneToggle}>
            {done && <CheckIcon className="w-full h-full text-menu" />}
        </div>
    )
}