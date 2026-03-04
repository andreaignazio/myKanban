import { Check, Square } from "lucide-react";

type CheckerProps = {
    done: boolean;
    handleMarkToggle: (done: boolean) => void;
}

export const Checker = ({ done, handleMarkToggle }: CheckerProps) => {
    return (
        <>
            {<Square className={` absolute top-1 h-5 ${done ? "text-transparent" : "text-gray-500"} translate-y-0.5 cursor-pointer`}
                fill={done ? "rgba(102, 157, 241, 1)" : "transparent"}
                onClick={() => handleMarkToggle(done ? false : true)} />}
            {done && <Check className=" absolute top-2 h-3 text-black/50 translate-y-0.5 pointer-events-none" strokeWidth={4} />}
        </>
    )
}