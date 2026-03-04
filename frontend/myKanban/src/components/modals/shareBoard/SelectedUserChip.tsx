import { XMarkIcon } from "@heroicons/react/24/solid";

type SelectedUserChipProps = {
    label: string;
    onRemove: () => void;
}

export const SelectedUserChip = ({ label, onRemove }: SelectedUserChipProps) => {
    return (
        <div className="relative flex flex-row items-center justify-start bg-menu rounded-sm py-1 px-2 gap-1">
            <div className="text-nowrap">{label}</div>
            <div className="rounded-sm hover:bg-gray-500 hover:bg-opacity-15 p-0.1">
                <XMarkIcon
                    onClick={onRemove}
                    className="flex items-center justify-center w-5 h-5 text-white cursor-pointer translate-y-[1px]"
                />
            </div>
        </div>
    );
};
