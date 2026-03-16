
type GradientHoverProps = {
    className?: string;
}
export const GradientHover = ({ className }: GradientHoverProps) => {
    return (
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-0 group-hover:opacity-15 transition-all duration-300 ease-in-out ${className}`} />
    )
}