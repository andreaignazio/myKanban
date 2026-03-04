import { TrashIcon } from "@heroicons/react/24/outline"

type TrashButtonProps = {
    onClick: () => void
}


export function TrashButton({ onClick }: TrashButtonProps) {
    return (
        <button
            className="p-1 w-8 h-8
                            justify-items-center
                            "
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClick}>
            <TrashIcon strokeWidth={1.5} className="h-4 w-4 text-800" />
        </button>
    )
}