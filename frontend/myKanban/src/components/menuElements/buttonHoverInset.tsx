export const ButtonHoverInset = ({ onClick, className }: { onClick: () => void, className?: string }) => {
    return (
        <div className={`absolute inset-0 opacity-0 
        hover:opacity-100 transition-opacity
         duration-200 bg-black/20 cursor-pointer ${className}`} onClick={onClick} />
    )
}   