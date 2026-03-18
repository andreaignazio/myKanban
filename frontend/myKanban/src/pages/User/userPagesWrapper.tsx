import { WorkspacePageHeader } from "@/components/workspacePages/WorkspacePageHeader";
import type { IconId } from "@/icons/iconCatalog";
import { forwardRef } from "react";

type UserPagesWrapperProps = {
    children: React.ReactNode;
    Title?: string;
    DoNotShowTitle?: boolean;
    className?: string;
    maxWidth?: string;
    description?: string;
    iconId?: IconId;
    containerClassName?: string;
}

export const UserPagesWrapper = forwardRef<HTMLDivElement, UserPagesWrapperProps>(({ children, Title, DoNotShowTitle, className, maxWidth = "900px", description, iconId, containerClassName }: UserPagesWrapperProps, ref) => {
    return (
        <div ref={ref} className="overflow-hidden min-h-0 h-full w-full">
            <div className={`flex flex-col pb-8 min-h-0 h-full w-full max-w-[clamp(320px,92vw,900px)] mx-auto px-[clamp(12px,4vw,48px)]
            overflow-y-auto scrollbar-hidden ${containerClassName}`}>
                <div className={`flex flex-col mt-16 ${className}`}>
                    {!DoNotShowTitle && <WorkspacePageHeader title={Title ?? ""}
                        description={description ?? ""}
                        iconId={iconId ?? "default"} />}

                    {children}
                </div>
            </div>
        </div>
    )
})
