
type SeparatorProps = {
    className?: string
}
export const Separator = ({ className }: SeparatorProps) => {
    return (
        <div className={`h-px w-full bg-zinc-500/20 ${className}`} />
    );
};