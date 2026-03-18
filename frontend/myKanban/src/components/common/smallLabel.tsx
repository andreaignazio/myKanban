

type SmallLabelProps = {
    text: string;
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
    textClassName?: string;
}

export const SmallLabel = ({ text, onClick, children, className, textClassName }: SmallLabelProps) => {
    return (
        <div className={`${className}
            py-1 px-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer
            absolute top-2 right-2 z-20 flex flex-row items-center
             justify-center gap-1 bg-zinc-800 hover:bg-zinc-600`}
            onClick={onClick}
        >
            <span className={`text-xs text-white/80 font-plex italic ${textClassName}`}>{text}</span>
            {children}
        </div>
    )
}