import { forwardRef, useEffect, useRef, useState } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { BoardBackgroundTransition, type BoardBackgroundSpec } from "../BoardView/BoardBackgroundTransition"
import { baseImages, getClassNamesForWorkspaceColorToken, workspaceBorderColorTokens, type ColorToken } from "@/domain/colorTokens"
import { CatalogIcon, type IconId } from "@/icons/iconCatalog"
import { CustomInput } from "../menuElements/CustomInput"
import { Check, ChevronRight, ImageIcon, XIcon } from "lucide-react"
import { CardRowMenuBtn, type CardRowMenuBtnProps } from "../cardMenus/cardRowMenus"
import { WorkspaceCoverEditor } from "@/pages/WorkspaceSettings/workspaceCoverEditor"
import { WorkspaceIconEditor } from "@/pages/WorkspaceSettings/workspaceIconEditor"
import { useImageOrColorSelector } from "@/hooks/UseImageOrColorSelector"
import type { WorkspaceCoverProps } from "@/stores/types"
import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry"
import { useAsyncRequest } from "@/hooks/useAsyncRequest"

type WorkspaceCreateWizardProps = {
    onClose: () => void
}

const radius = 52
const padding = 24

const wSuccess = `max(calc(35vw + ${2 * padding}px), ${460 + 2 * padding}px)`


const paddingInner = 48

const colorBorder = "rgba(255,255,255,0.7)"


export const WorkspaceCreateWizard = forwardRef<HTMLDivElement, WorkspaceCreateWizardProps>(({ onClose }, ref) => {

    const [iconId, setIconId] = useState<IconId>("boards")
    const [iconBgToken, setIconBgToken] = useState<string>("ws_flat_slate")
    const [iconBorderToken, setIconBorderToken] = useState<string>("ws_border_none")
    const iconSelectionRef = useRef({ iconId, iconBgToken, iconBorderToken })
    iconSelectionRef.current = { iconId, iconBgToken, iconBorderToken }
    const { selectedColor, handleSetColor, selectedImage, handleSetImage } = useImageOrColorSelector()
    const nameRef = useRef<import("../menuElements/CustomInput").CustomInputHandle | null>(null)
    const descriptionRef = useRef<import("../menuElements/CustomInput").CustomInputHandle | null>(null)

    const workspaceActions = useWorkspaceActionRegistry()
    const { isLoading, isSuccessful } = useAsyncRequest("workspace:create")

    const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1024)
    useEffect(() => {
        const check = () => setIsNarrow(window.innerWidth < 1024)
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])

    useEffect(() => {
        if (isSuccessful) {
            const t = setTimeout(onClose, 1000)
            return () => clearTimeout(t)
        }
    }, [isSuccessful])

    const handleIconSubmit = (newIconId: IconId, newBgToken: string, newBorderToken: string) => {
        setIconId(newIconId)
        setIconBgToken(newBgToken)
        setIconBorderToken(newBorderToken)
    }

    const handleCoverSubmit = (cover: WorkspaceCoverProps) => {
        if (cover.Type === "color" && cover.Color) {
            handleSetColor({ className: cover.Color } as ColorToken)
        } else if (cover.Type === "image" && cover.ImageUrl) {
            handleSetImage(cover.ImageUrl)
        }
    }

    const handleCreate = async () => {
        const trimmedName = (nameRef.current?.getElement()?.value ?? "").trim()
        const trimmedDesc = (descriptionRef.current?.getElement()?.value ?? "").trim()
        if (!trimmedName || isLoading || isSuccessful) return
        await workspaceActions.createWorkspace({
            Name: trimmedName,
            Description: trimmedDesc || undefined,
            Props: {
                IconID: iconId,
                IconBg: iconBgToken,
                IconBorderColor: iconBorderToken,
                Cover: selectedImage
                    ? { Type: "image", ImageUrl: selectedImage }
                    : selectedColor
                        ? { Type: "color", Color: selectedColor.className }
                        : undefined,
            },
        })
    }

    const iconBgTokenClass = getClassNamesForWorkspaceColorToken(iconBgToken)
    const resolvedBorderColor = (() => {
        const borderClassName = workspaceBorderColorTokens.find(t => t.token === iconBorderToken)?.className ?? ""
        const match = borderClassName.match(/#[0-9a-fA-F]{3,8}/g)
        return match?.[0]
    })()
    const hasBorder = iconBorderToken !== "ws_border_none" && !!resolvedBorderColor

    const targetBackground: BoardBackgroundSpec = selectedImage
        ? { kind: "image", url: selectedImage }
        : selectedColor
            ? { kind: "color", className: selectedColor.className, colorToken: selectedColor.token ?? null }
            : { kind: "image", url: baseImages[0].url }



    return (
        <CommonMenuWrapper
            ref={ref}
            style={{
                borderRadius: radius,
                padding: padding,
                width: isLoading || isSuccessful ? wSuccess : "70vw",
                minWidth: isLoading || isSuccessful ? wSuccess : "320px",
                height: isNarrow ? "auto" : "80vh",
                gap: isNarrow ? "1.5rem" : "0",
                transition: "width 0.6s ease-in-out, height 0.4s ease-in-out, gap 0.4s ease-in-out",
                flexDirection: isNarrow ? "column" : "row",
            }}
            className="flex items-stretch justify-start relative bg-transparent"
            onClose={onClose}>
            <div className="group absolute inset-0 -z-10 overflow-hidden" style={{ borderRadius: radius }}>
                <div className="absolute inset-0 w-full h-full -z-10 group-hover:scale-[120%] transition-transform duration-300 ease-in-out">
                    <BoardBackgroundTransition
                        target={targetBackground}
                    />
                    <div className="absolute transition-all duration-500 ease-in-out
                    inset-0 w-full h-full bg-white/10 backdrop-blur-none group-hover:backdrop-blur-md " />
                </div>
            </div>

            <div
                style={{
                    borderRadius: radius - padding,
                    padding: paddingInner,
                    width: isNarrow ? "100%" : "35vw",
                    minWidth: isNarrow ? undefined : "460px",
                    height: isNarrow ? "50vh" : "100%",
                    flexShrink: 0,
                    transition: "width 0.4s ease-in-out, height 0.4s ease-in-out, min-width 0.4s ease-in-out",
                }}
                className="bg-zinc-900 flex flex-col items-center justify-between gap-0 overflow-hidden shadow-lg shadow-black/50 z-20"
            >
                <HeaderCol
                    iconId={iconId}
                    iconBgTokenClass={iconBgTokenClass}
                    hasBorder={hasBorder}
                    iconBorderColor={resolvedBorderColor}
                    nameRef={nameRef}
                    collapsed={isLoading || !!isSuccessful}
                    onIconMenuComponent={({ ref, onClose }) => (
                        <WorkspaceIconEditor ref={ref} onClose={onClose} onLocalSubmit={handleIconSubmit}
                            initialIconId={iconSelectionRef.current.iconId}
                            initialBgToken={iconSelectionRef.current.iconBgToken}
                            initialBorderToken={iconSelectionRef.current.iconBorderToken} />
                    )}
                />

                <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full min-h-0 flex-1
                pt-4
                    ${isLoading || isSuccessful ? "max-h-0 opacity-0" : "opacity-100"}`}>
                    <CustomInput
                        ref={descriptionRef}
                        useTextArea={true}
                        placeholder="Description (optional)"
                        textAreaClassName="lg:!min-h-[20px] !h-full pt-2 "
                        className={`ps-1 w-full  rounded-[8px] !h-full `} />
                </div>
                <div
                    onClick={handleCreate}
                    style={isLoading || isSuccessful ? { width: "3rem", height: "3rem", padding: 0, borderRadius: "50%" } : undefined}
                    className={`bg-sky-500/70 w-32 !h-12 mt-4 items-center justify-center gap-2 ps-4 py-2
                 flex rounded-xl shadow-lg shadow-black/30 transition-all duration-500 ease-in-out
                 ${isLoading || isSuccessful ? "cursor-default !ps-0" : "cursor-pointer hover:bg-sky-500/90"}
                 ${isSuccessful ? "!bg-emerald-500/80" : ""}`}>
                    {isSuccessful
                        ? <Check size={22} />
                        : isLoading
                            ? <span className="animate-pulse text-sm">…</span>
                            : <><span>Create</span><ChevronRight size={24} /></>}
                </div>


            </div>
            <CardRowMenuBtn
                customId="wizard-cover-editor"
                placement="bottom"
                wrapperClassName="flex-1 w-full flex items-center justify-center min-h-[120px]"
                menuComponent={({ ref, onClose }) => (
                    <WorkspaceCoverEditor ref={ref} onClose={onClose} onLocalSubmit={handleCoverSubmit} />
                )}
            >
                <div className="hover:opacity-100 opacity-0 transition-opacity duration-300 ease-in-out
                w-full h-full items-center justify-center flex cursor-pointer z-20">
                    <ImageIcon size={isNarrow ? 80 : 128} className="z-20 text-neutral-200" />
                </div>
            </CardRowMenuBtn>
            <div
                onClick={onClose}
                style={{ top: padding, right: padding }}
                className={`group absolute  bg-neutral-300/20 cursor-pointer p-4 rounded-full opacity-50 hover:opacity-100 transition-opacity duration-300 ease-in-out z-30`}>
                <XIcon size={24} className="text-neutral-100 group-hover:text-neutral-200  transition-colors duration-300 ease-in-out" />
            </div>
        </CommonMenuWrapper>
    )
})





type WorkspaceIconProps = {
    size?: number;
    radiusOverride?: number;
    iconId?: IconId;
    iconBgTokenClass?: string;
    hasBorder?: boolean;
    iconBorderColor?: string;
}

const WorkspaceIcon = ({ size = 96, radiusOverride = 52, iconId = "boards", iconBgTokenClass, hasBorder, iconBorderColor }: WorkspaceIconProps) => {

    const resolvedRadius = radiusOverride ? radiusOverride : radius
    return (
        <div
            style={{
                borderRadius: resolvedRadius - padding - paddingInner / 2,
                border: hasBorder && iconBorderColor
                    ? `2px solid ${iconBorderColor}`
                    : hasBorder === false
                        ? "none"
                        : `1px solid ${colorBorder}`,
                height: size,
                width: size,
            }}
            className={`p-4 shadow-md !text-stone-300 shadow-black/20 flex flex-col items-center justify-center 
            ${iconBgTokenClass ?? "bg-gray-100/10"}`}>
            <CatalogIcon
                id={iconId} className="h-full w-full" />

        </div>
    )
}

type HeaderColProps = {
    iconId?: IconId;
    iconBgTokenClass?: string;
    hasBorder?: boolean;
    iconBorderColor?: string;
    onIconMenuComponent?: CardRowMenuBtnProps["menuComponent"];
    nameRef?: React.Ref<import("../menuElements/CustomInput").CustomInputHandle>;
    onNameChange?: () => void;
    collapsed?: boolean;
}

const HeaderCol = ({ iconId, iconBgTokenClass, hasBorder, iconBorderColor, onIconMenuComponent, nameRef, onNameChange, collapsed }: HeaderColProps) => {

    return (
        <div className="flex flex-col items-center justify-center gap-4 w-full">
            <CardRowMenuBtn
                customId="wizard-icon-editor"
                placement="bottom"
                menuComponent={onIconMenuComponent}
            >
                <div className="group relative cursor-pointer rounded-[26px]
                    ring-0 hover:ring-2 ring-zinc-300/60 transition-all duration-150">
                    <WorkspaceIcon size={120} radiusOverride={74}
                        iconId={iconId}
                        iconBgTokenClass={iconBgTokenClass}
                        hasBorder={hasBorder}
                        iconBorderColor={iconBorderColor}
                    />
                    <div className="absolute inset-0 rounded-[26px] bg-white/0 group-hover:bg-white/10 transition-colors duration-150" />
                </div>
            </CardRowMenuBtn>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full flex flex-col gap-4
                ${collapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}>
                <h2 className="text-lg font-semibold text-neutral-300 text-center">Name your workspace</h2>
                <CustomInput
                    ref={nameRef}
                    placeholder="Workspace Name"
                    onInputChange={onNameChange}
                    className={`ps-1 w-full rounded-[8px]`} />
            </div>
        </div>
    )
}


/*const HeaderInline = () => {

    return (
        <div className="grid grid-cols-[102px_1fr] items-center !gap-4">
            <WorkspaceIcon />
            <div className="flex flex-col w-full gap-2 h-full justify-end">
                <h2 className="text-md font-semibold text-neutral-300">Name your workspace</h2>
                <CustomInput

                    placeholder="Workspace Name" className={`ps-1 w-full rounded-[8px]`} />
            </div>
        </div>
    )
}*/