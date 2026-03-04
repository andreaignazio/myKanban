import { forwardRef } from "react"

type CommonMenuWrapperProps = {
    Title?: string;
    onClose?: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

export const CommonMenuWrapper = forwardRef<HTMLDivElement, CommonMenuWrapperProps>(({ children, Title, onClose, style, className }, ref) => {

    return (
        <div ref={ref} className={` flex justify-start items-start theme-dark bg-menu rounded-xl 
            shadow-lg shadow-black relative
         text-white  overflow-hidden ${className}`} style={style} >


            {children}
        </div>
    )

})