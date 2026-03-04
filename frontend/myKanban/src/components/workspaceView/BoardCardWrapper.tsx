
type BoardCardWrapperProps = {
    children: React.ReactNode;
    className?: string;
};

export function BoardCardWrapper({ children, className }: BoardCardWrapperProps) {

    return (
        <>
            <div className={`group relative w-full h-[120px]  overflow-hidden rounded-lg
             text-slate-100 shadow-md shadow-black/20 ${className || ""}`} >


                {children}
            </div>
        </>
    )
}