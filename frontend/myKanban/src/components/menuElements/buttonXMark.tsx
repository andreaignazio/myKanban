import { XMarkIcon } from "@heroicons/react/24/solid";

type ButtonXMarkProps = {
    onClick: () => void;
    className?: string;
}

export const ButtonXMark = ({ onClick, className }: ButtonXMarkProps) => {
    return (
        <XMarkIcon onClick={onClick}
            className={`h-8 aspect-square
            hover:bg-neutral-300/10 p-2 rounded-md
              text-neutral-400 absolute top-3 right-3 cursor-pointer ${className}`} />
    )
}