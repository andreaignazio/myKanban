
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import { flatColorTokens, gradientColorTokens, baseImages, type BaseImage, type ColorToken } from "@/domain/colorTokens"
import type { BoardActionsMenuTabs } from "../BoardActionMenu"


type BoardChangeBgProps = {
    onClick?: (tab: BoardActionsMenuTabs) => void
}

export const BoardChangeBg = ({ onClick }: BoardChangeBgProps) => {

    return (
        <div className="flex flex-col w-full gap-3 px-4 pt-4  ">
            <ImageWrapper label="Colors" onClick={() => onClick?.("colors")}>
                <TokenRenderer token={gradientColorTokens[4]} className=" !rounded-lg flex h-40 px-8 py-4" >
                    <div className="flex flex-col gap-3 w-full h-full">
                        <TokenRenderer token={flatColorTokens[0]} className="w-full h-full" />
                        <TokenRenderer token={gradientColorTokens[2]} className="w-full h-full" />
                    </div>
                </TokenRenderer>
            </ImageWrapper>

            <ImageWrapper
                wrapperClassName="-mb-12 !py-0"
                label="Images" onClick={() => onClick?.("images")}>
                <ImageColorRenderer
                    className="flex !h-40 w-full !rounded-lg"
                    bgImage={baseImages[3].url}
                    backgroundType={"image"}
                />
            </ImageWrapper>
        </div>
    )
}

type TokenRendererProps = {
    token: ColorToken
    className?: string
    children?: React.ReactNode
}


const TokenRenderer = ({ token, className, children }: TokenRendererProps) => {
    if (flatColorTokens.includes(token) || gradientColorTokens.includes(token)) {
        return <div className={`${className}  rounded-lg ${token.className}`}>
            {children}
        </div>
    }
    return null;
}

type ImageWrapperProps = {
    children?: React.ReactNode
    label?: string
    onClick?: () => void
    wrapperClassName?: string
}

const ImageWrapper = ({ children, label, onClick, wrapperClassName }: ImageWrapperProps) => {
    return (
        <div className={`flex flex-col gap-1 w-full h-full ${wrapperClassName}`} onClick={onClick}>
            {children}
            <span className="text-center text-sm mt-2 text-white ">{label}</span>
        </div>

    )
}