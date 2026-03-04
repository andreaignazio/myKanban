import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { ChevronDownIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type CustomDropDownProps = {
    items?: MenuItem[] | WorkspaceMenuItem[];
    btnId: string;
    activeId?: string | null;
    onClick?: (id: string) => void;
    placeholderCustom?: string;
    useCustomSelector?: boolean;
    disableGlobalState?: boolean;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    isLocked?: boolean;
    showChevron?: boolean;
    className?: string;
    chevronClassName?: string;
    desiredBackdropOpacity?: number;
    fixedWidth?: number;
}

export type MenuItem = {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}

export type WorkspaceMenuItem = MenuItem & {
    availableBoards: Record<"current" | "max", number>;
}

export type CustomDropDownHandle = {
    setActiveId: (id: string | null) => void;
}

export const CustomDropDown = forwardRef<CustomDropDownHandle, CustomDropDownProps>(({ items, btnId, activeId: controlledActiveId, onClick, placeholderCustom, disableGlobalState = false, style, children, isLocked = false, showChevron = false, className, chevronClassName, desiredBackdropOpacity, fixedWidth }, ref) => {
    const anchorRef = useRef<HTMLDivElement>(null);
    const onOpenOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const isActive = useOverlayStore((state) => state.isActive)
    const panelRef = useRef<HTMLDivElement>(null)
    //const triggerUpdate = useOverlayStore((state) => state.triggerUpdate)

    const [activeId, setActiveId] = useState<string | null>(controlledActiveId ?? null)
    const setDropdownActiveId = useOverlayStore((state) => state.setDropdownActiveId)

    useEffect(() => {
        if (controlledActiveId !== undefined) {
            setActiveId(controlledActiveId)
        }
    }, [controlledActiveId])

    useImperativeHandle(ref, () => ({
        setActiveId: (id: string | null) => {
            setActiveId(id);
            if (!disableGlobalState) {
                setDropdownActiveId(btnId, id);
            }
        }
    }), [btnId, disableGlobalState, setDropdownActiveId])



    function handleOpenDropdpown() {

        const descriptor: OverlayDescriptor = {
            id: btnId,
            render: () => <DropDownMenu
                fixedWidth={fixedWidth}
                btnId={btnId}
                activeId={activeId}
                disableGlobalState={disableGlobalState}
                onClick={(id) => {
                    setActiveId(id);
                    if (!disableGlobalState) {
                        setDropdownActiveId(btnId, id);
                    }
                    onClick?.(id)
                    closeOverlay(btnId);
                }}
                anchorRef={anchorRef} ref={panelRef} items={items || []} />,
            panelRef: panelRef,
            anchorRef: anchorRef,
            type: "dropdown",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: true,

            },
            position: {
                placement: "bottom-start",
                offset: [2, 0],

            },
            renderType: "anchored",
            exclusiveGroup: "dropdowns",
            desiredBackdropOpacity,

        }
        onOpenOverlay(descriptor);
    }
    const placeholder = placeholderCustom ? placeholderCustom : btnId === "workspace-dropdown" ? "Select workspace" : "Select visibility";
    return (

        <div
            ref={anchorRef}
            onClick={isLocked ? undefined : handleOpenDropdpown}
            style={style}
            aria-disabled={isLocked}
            className={`flex flex-row overflow-hidden w-full text-white ${className}
                px-2.5 items-center justify-start ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                bg-menusec rounded-[3px] h-11
                pointer-cursor ${isActive(btnId) ?
                    'border border-blue-500 ring-inset ring-2 ring-opacity-75 ring-blue-500'
                    : 'border border-neutral-500 border-opacity-85'}`} >
            <span>{activeId ? items?.find(item => item.id === activeId)?.label : placeholder}</span>
            {children}
            {showChevron && <ChevronDownIcon className={`ml-auto ${chevronClassName}`} />}
        </div>

    )
})

export type DropDownMenuProps = {
    items: MenuItem[] | WorkspaceMenuItem[];
    anchorRef?: React.RefObject<HTMLElement | null> | null;
    btnId: string;
    activeId?: string | null;
    disableGlobalState?: boolean;
    fixedWidth?: number;
    onClick: (id: string) => void;
    className?: string;
}

export const DropDownMenu = forwardRef<HTMLDivElement, DropDownMenuProps>((props, ref) => {
    const { items, anchorRef, btnId, onClick, activeId, disableGlobalState = false, className } = props;

    const activeMenuItem = useOverlayStore((state) => state.dropdownActiveIdMap)


    const rect = anchorRef?.current?.getBoundingClientRect();
    const style: React.CSSProperties = {
        width: props.fixedWidth ?? rect?.width,
    }
    function handleOnClick(id: string) {
        // console.log("Clicked item with id:", id);
        onClick(id);
    }
    const selectedId = disableGlobalState ? activeId : (activeMenuItem[btnId] ?? activeId);
    // const activeId = "ws2";
    return (
        <div
            ref={ref}
            style={style}

            className={`theme-dark w-[200px] h-full text-neutral-300 bg-menusec rounded-md ${className}`}>
            <div className="flex flex-col">
                {items.length > 0 && items.map((item) => (
                    <div key={item.id}
                        onClick={() => {
                            if (item.disabled) return;
                            handleOnClick(item.id);
                            item.onClick?.();
                        }}
                        className={`flex flex-row  border-s-2 border-[rgba(0,0,0,0)] items-center gap-2 px-3 py-2
                     ${item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-700 hover:border-opacity-100 hover:border-[rgba(102,157,241,1)] cursor-pointer"}
                     ${item.id === selectedId ? "bg-[#123263] border-s-2 border-opacity-100 border-[rgba(102,157,241,1)] text-[#669df1]" : ""}
                     `}>
                        <div className="flex flex-row items-center gap-4">
                            {item.icon}
                            <div className="flex flex-col">
                                <span className="text-sm">{item.label}</span>
                                {item.description && <span className="text-xs text-neutral-500">{item.description}</span>}
                            </div>
                            <div className="rounded-full bg-neutral-400 bg-opacity-20 px-2 text-xs ml-auto text-black font-medium">
                                {("availableBoards" in item) && `${item.availableBoards.current}/${item.availableBoards.max}`}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
})
