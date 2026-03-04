type InputWrapperProps = {
    isFocused: boolean
    className?: string
    children?: React.ReactNode
}
export const InputWrapper = ({ isFocused, className, children }: InputWrapperProps) => {
    return (
        <div className={`flex flex-row overflow-hidden cursor-pointer
                         w-full text-neutral-100 px-1 -mx-1 rounded-[4px] h-8 transition-colors ${className}
                        ${isFocused ?
                'border border-blue-500 bg-menusec ring-inset ring-2 ring-opacity-75 ring-blue-500'
                : 'bg-transparent'}`}>
            {children}
        </div>
    )
}
