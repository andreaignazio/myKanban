import { forwardRef } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";

type DomainModalWrapperProps = {
    onClose: () => void;
    children: (onClose: () => void) => React.ReactNode;
    theme?: "light" | "dark";
}


export const DomainModalWrapper = forwardRef<HTMLDivElement, DomainModalWrapperProps>(({ onClose, children, theme = "dark" }, ref) => {


    return (
        <CommonMenuWrapper ref={ref} className={theme === "light" ? "!bg-neutral-100 !text-neutral-900" : undefined}>
            {children(onClose)}
        </CommonMenuWrapper>
    )
})