type RoundButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    className?: string;
}


export const RoundButton = ({ children, onClick, isActive, className }: RoundButtonProps) => {
    return (
        <div
            className={`w-8 h-8 rounded-full p-1 flex items-center justify-center ${className}
             hover:bg-neutral-700/25 ${isActive ? "bg-neutral-700/50" : ""} cursor-pointer`}>
            {children}
        </div>
    )
}   