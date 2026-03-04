
type UserPagesWrapperProps = {
    children: React.ReactNode;
    Title?: string;
}

export const UserPagesWrapper = ({ children, Title }: UserPagesWrapperProps) => {
    return (
        <div className="overflow-hidden min-h-0 h-full w-full">
            <div className="flex flex-col min-h-0 h-full w-full max-w-[clamp(320px,92vw,900px)] mx-auto px-[clamp(12px,4vw,48px)]
            overflow-y-auto scrollbar-hidden">
                <div className="flex flex-col mt-16">
                    <div className="text-lg font-bold  ">{Title}</div>
                    {children}
                </div>
            </div>
        </div>
    )
}
