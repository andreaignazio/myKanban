import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { ButtonHoverInset } from "@/components/menuElements/buttonHoverInset";
import { SubmitFooter } from "@/components/menuElements/submitFooter";
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper";
import { ActionMenuWrapper } from "@/components/modals/ListActionsMenu";
import {
    getClassNamesForWorkspaceColorToken,
    workspaceBorderColorTokens,
    workspaceFlatColorTokens,
    workspaceGradientColorTokens,
    type ColorToken
} from "@/domain/colorTokens";
import { CatalogIcon, iconCatalog, type IconId } from "@/icons/iconCatalog";
import type { WorkspaceProps } from "@/stores/types";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/common/Separator";

type WorkspaceIconEditorProps = {
    workspaceID?: string;
    initialIconId?: IconId;
    initialBgToken?: string;
    initialBorderToken?: string;
    onClose: () => void;
    onLocalSubmit?: (iconId: IconId, bgToken: string, borderToken: string) => void;
};

export const WorkspaceIconEditor = forwardRef<HTMLDivElement, WorkspaceIconEditorProps>(({ workspaceID, initialIconId, initialBgToken, initialBorderToken, onClose, onLocalSubmit }, ref) => {
    const workspaceActions = useWorkspaceActionRegistry();
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceID ?? ""]);
    const [isSaving, setIsSaving] = useState(false);

    const iconIds = useMemo(() => Object.keys(iconCatalog) as IconId[], []);
    const workspaceBgTokens = useMemo(() => [...workspaceGradientColorTokens, ...workspaceFlatColorTokens], []);
    const [selectedIconId, setSelectedIconId] = useState<IconId>(initialIconId ?? "boards");
    const [iconBgToken, setIconBgToken] = useState<string>(initialBgToken ?? "ws_flat_slate");
    const [iconBorderToken, setIconBorderToken] = useState<string>(initialBorderToken ?? "ws_border_none");

    useEffect(() => {
        if (!workspaceID) return;
        const iconId = workspace?.Props?.IconID;
        if (iconId && iconId in iconCatalog) {
            setSelectedIconId(iconId as IconId);
        }

        setIconBgToken((workspace?.Props?.IconBg as string | undefined) ?? "ws_flat_slate");
        setIconBorderToken((workspace?.Props?.IconBorderColor as string | undefined) ?? "ws_border_none");
    }, [workspace]);

    const resolveToken = (token: string): ColorToken | null => {
        return workspaceBgTokens.find((item) => item.token === token)
            || workspaceBorderColorTokens.find((item) => item.token === token)
            || null;
    };

    const resolveBorderColor = (tokenOrHex?: string) => {
        if (!tokenOrHex) return undefined;
        if (tokenOrHex.startsWith("#")) return tokenOrHex;

        const token = resolveToken(tokenOrHex);
        const className = token?.className ?? "";
        const hexMatches = className.match(/#[0-9a-fA-F]{3,8}/g);
        return hexMatches?.[0];
    };

    const iconBgTokenClass = getClassNamesForWorkspaceColorToken(iconBgToken);
    const iconBorderColor = resolveBorderColor(iconBorderToken);
    const hasBorder = iconBorderToken !== "ws_border_none" && !!iconBorderColor;

    const handleSubmit = async () => {
        if (onLocalSubmit) {
            onLocalSubmit(selectedIconId, iconBgToken, iconBorderToken);
            onClose();
            return;
        }
        if (!workspaceID) return;
        try {
            setIsSaving(true);
            const props: WorkspaceProps = {
                IconID: selectedIconId,
                IconBg: iconBgToken,
                IconBorderColor: iconBorderToken,
            };
            await workspaceActions.patchWorkspaceProps(workspaceID, { Props: props });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const [shouldBeHorizontal, setShouldBeHorizontal] = useState(false);
    useEffect(() => {
        const update = () => setShouldBeHorizontal(window.innerHeight < 800);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return (
        <CommonMenuWrapper ref={ref}>
            <div className={`flex ${shouldBeHorizontal
                ? "flex-col w-[600px]"
                : "flex-col w-[360px]"}  gap-3 p-4`}>

                <span className="text-lg font-semibold text-neutral-300">Workspace icon</span>

                <div className="
                z-0
                flex w-full bg-zinc-900 rounded-xl  items-center justify-center py-8 mb-0">
                    <div className={`rounded-3xl p-4 ${hasBorder ? "border-2" : "border-0"} ${iconBgTokenClass}`}
                        style={hasBorder ? { borderColor: iconBorderColor } : undefined}>
                        <CatalogIcon id={selectedIconId} className="h-16 w-16 text-neutral-200" />
                    </div>
                </div>
                <div className={`w-full flex gap-4 ${shouldBeHorizontal ? "flex-row" : "flex-col"}`}>
                    <div style={{ zIndex: 2000 }}
                        className="flex flex-col w-full
                         bg-zinc-900/30 border-zinc-400/20  p-3 py-4 rounded-xl
                          shadow-md shadow-black/10" >
                        <TokenizedColorSelector
                            label="Icon background"
                            menuId="workspace-icon-bg-selector"
                            quickTokens={workspaceBgTokens}
                            menuGradients={workspaceGradientColorTokens}
                            menuColors={workspaceFlatColorTokens}
                            selectedToken={resolveToken(iconBgToken)}
                            onSelectToken={(color) => setIconBgToken(color.token)}
                            className=" filter saturate-150 brightness-110"
                        />
                        <Separator className="my-6 mb-4" />

                        <TokenizedColorSelector
                            label="Icon border"
                            menuId="workspace-icon-border-selector"
                            quickTokens={workspaceBorderColorTokens}
                            menuGradients={[]}
                            menuColors={workspaceBorderColorTokens}
                            selectedToken={resolveToken(iconBorderToken)}
                            onSelectToken={(color) => setIconBorderToken(color.token)}
                        />
                    </div>
                    {!shouldBeHorizontal && <Separator className="flex my-1" />}
                    <div className="flex flex-col w-full">
                        <div className={`grid ${shouldBeHorizontal ? "grid-cols-5" : "grid-cols-6"} gap-2`}>
                            {iconIds.map((iconId) => {
                                const isSelected = selectedIconId === iconId;

                                return (
                                    <button
                                        key={iconId}
                                        type="button"
                                        onClick={() => setSelectedIconId(iconId)}
                                        disabled={isSaving}
                                        className={`flex h-12 aspect-square
                                     w-12 items-center justify-center rounded-lg border transition ease-in-out
                                    ${isSelected
                                                ? "border-zinc-200 bg-zinc-700/50"
                                                : "border-neutral-500/0 bg-zinc-900/30 hover:bg-zinc-700/35"}
                                    ${isSaving ? "opacity-60" : ""}`}
                                        title={iconId}
                                    >
                                        <CatalogIcon id={iconId} className="h-6 w-6 text-neutral-200" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>




                <Separator className="mt-1" />


                <SubmitFooter
                    show={true}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    isSaving={isSaving}
                    flipButtons={true}
                    className="!w-full !justify-end"
                    buttonsClassName="!px-5 !rounded-lg !h-10 !w-full !px-8"
                />
            </div>
        </CommonMenuWrapper>
    );
});

type TokenizedColorSelectorProps = {
    label: string;
    menuId: string;
    quickTokens: ColorToken[];
    menuGradients: ColorToken[];
    menuColors: ColorToken[];
    selectedToken: ColorToken | null;
    onSelectToken: (color: ColorToken) => void;
    className?: string;
};

function TokenizedColorSelector({ label, menuId, quickTokens, menuGradients, menuColors, selectedToken, onSelectToken, className }: TokenizedColorSelectorProps) {

    return (
        <div className="flex w-full flex-col gap-1">
            <span className="text-sm font-semibold text-gray-300">{label}</span>
            <div className="grid grid-cols-7 gap-1.5">
                {quickTokens.map((token) => {
                    const isSelected = selectedToken?.token === token.token;
                    return (
                        <div
                            key={token.token}
                            onClick={() => onSelectToken(token)}
                            className={`relative h-8 w-full cursor-pointer rounded-[4px] ${token.className} 
                            ${className}
                            transition-all duration-200 ease-in-out
                            ${isSelected ? "ring-1 ring-neutral-100" : ""}`}
                        >
                            <ButtonHoverInset onClick={() => { }} />
                        </div>
                    );
                })}

                <CardRowMenuBtn
                    customId={menuId}
                    placement="right"
                    exclusiveGroup="workspace-icon-editor-submenu"
                    menuComponent={({ ref, onClose }) => (
                        <ColorTokenMenu
                            ref={ref}
                            title={label}
                            gradients={menuGradients}
                            colors={menuColors}
                            activeColorToken={selectedToken}
                            onSelectColor={(color) => {
                                onSelectToken(color);
                                onClose();
                            }}
                            onClose={onClose}
                        />
                    )}
                >
                    <div className="relative h-8 w-full cursor-pointer rounded-[4px] bg-menubtn flex items-center justify-center text-sm text-neutral-300">
                        <ButtonHoverInset onClick={() => { }} />
                        ...
                    </div>
                </CardRowMenuBtn>
            </div>
        </div>
    );
}

type ColorTokenMenuProps = {
    title: string;
    gradients: ColorToken[];
    colors: ColorToken[];
    activeColorToken: ColorToken | null;
    onSelectColor: (color: ColorToken) => void;
    onClose: () => void;
};

const ColorTokenMenu = forwardRef<HTMLDivElement, ColorTokenMenuProps>(({ title, gradients, colors, activeColorToken, onSelectColor, onClose }, ref) => {
    const gridClass = "grid grid-cols-3 gap-2";
    const objClass = "relative h-14 w-full rounded-md cursor-pointer overflow-hidden";

    return (
        <ActionMenuWrapper
            Title={title}
            onClose={onClose}
            width={300}
            style={{ paddingTop: "10px", paddingInline: "10px" }}
            titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}
        >
            <div className="flex flex-col gap-2 mt-2">
                {gradients.length > 0 && (
                    <>
                        <div className="text-left text-sm font-medium text-neutral-200">Gradients</div>
                        <div className={gridClass}>
                            {gradients.map((color) => {
                                const isActive = activeColorToken?.token === color.token;
                                return (
                                    <div key={color.token} className={`${objClass} ${color.className} ${isActive ? "ring-1 ring-neutral-100" : ""}`}>
                                        <ButtonHoverInset onClick={() => onSelectColor(color)} />
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="text-left text-sm font-medium text-neutral-200">Colors</div>
                <div className={gridClass}>
                    {colors.map((color) => {
                        const isActive = activeColorToken?.token === color.token;
                        return (
                            <div key={color.token} className={`${objClass} ${color.className} ${isActive ? "ring-1 ring-neutral-100" : ""}`}>
                                <ButtonHoverInset onClick={() => onSelectColor(color)} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </ActionMenuWrapper>
    );
});