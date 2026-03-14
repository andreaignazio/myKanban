import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LinkIcon } from "@heroicons/react/24/solid";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { CalendarIcon } from "lucide-react";

import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown";
import { LabeledButtonCustom, LabeledButtonPresetA, LabeledButtonPresetB } from "@/components/buttons/labeledButton";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { ShareLinkExpiryMenu } from "@/components/modals/ShareLinkExpiryMenu";
import { useOverlayStore } from "@/overlays/overlayStore";

type ShareLinkSectionProps = {
    children?: ReactNode;
    publicShareLink?: string | null;
    handleCreateShareLink: () => void;
    linkMode: "autojoin" | "sendrequest";
    onLinkModeChange: (mode: "autojoin" | "sendrequest") => void;
    expiresAt: string | null;
    onExpiresAtChange: (expiresAt: string | null) => void;
    expiryMenuId?: string;
    isCollapsible?: boolean;
}

export const ShareLinkSection = ({
    children,
    publicShareLink,
    handleCreateShareLink,
    linkMode,
    onLinkModeChange,
    expiresAt,
    onExpiresAtChange,
    expiryMenuId = "share-link-expiry-menu",
    isCollapsible = true,
}: ShareLinkSectionProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const isOverlayActive = useOverlayStore((state) => state.isActive);
    const triggerOverlayUpdate = useOverlayStore((state) => state.triggerUpdate);
    const [expiryDraftDate, setExpiryDraftDate] = useState<Date | undefined>(
        expiresAt ? new Date(expiresAt) : undefined,
    );

    useEffect(() => {
        if (isOverlayActive(expiryMenuId)) {
            triggerOverlayUpdate();
        }
    }, [expiryDraftDate, expiryMenuId, isOverlayActive, triggerOverlayUpdate]);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1200);
        return () => clearTimeout(timer);
    }, [copied]);

    const expiryPretty = expiresAt
        ? new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(expiresAt))
        : null;

    const linkModes: MenuItem[] = [
        { id: "autojoin", label: "Auto-join ", description: "Anyone with the link can join immediately with the selected role." },
        { id: "sendrequest", label: "Request to join", description: "Anyone with the link can send a request to join. An admin will need to approve the request." },
    ];

    const handlePrimaryAction = async () => {
        if (!publicShareLink) {
            await handleCreateShareLink();
            return;
        }

        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(publicShareLink);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = publicShareLink;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }

        setCopied(true);
    };

    const primaryButtonLabel = !publicShareLink
        ? "Create Share Link"
        : copied
            ? "Copied!"
            : "Copy Share Link";

    return (
        <div className="w-full mt-0 flex flex-col gap-1">
            <div className="w-full flex flex-row items-center justify-between">
                <span className="text-sm text-neutral-300">Or create a public share link</span>
                {isCollapsible && <LabeledButtonPresetA
                    className="!h-7 !px-2"
                    label={isCollapsed ? "Show" : "Hide"}
                    onClick={() => setIsCollapsed((prev) => !prev)}
                >
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </LabeledButtonPresetA>}
            </div>

            <div className={`w-full overflow-hidden transition-all duration-200 ease-in-out ${isCollapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}>
                <div className="w-full flex flex-row items-center justify-between gap-0 pt-1">
                    <div className="flex flex-row items-end gap-0">
                        <div className="flex flex-col items-start gap-0.5 text-sm">
                            {expiryPretty && <span className="text-xs text-neutral-400">Expires: {expiryPretty}</span>}
                        </div>

                        {children}
                        <LabeledButtonCustom
                            label={primaryButtonLabel}
                            onClick={() => {
                                void handlePrimaryAction();
                            }}
                            className={`rounded-md h-9 justify-center text-sm font-medium tracking-wide ${publicShareLink
                                ? "bg-blue-400/80 text-neutral-900"
                                : "bg-menubtn"
                                }`}
                        >
                            <LinkIcon className="w-4 h-4 " />
                        </LabeledButtonCustom>
                    </div>

                    <div className="flex flex-row items-end gap-1">
                        <CustomDropDown
                            showChevron={true}
                            disableGlobalState={true}
                            activeId={linkMode}
                            onClick={(id) => onLinkModeChange(id as "autojoin" | "sendrequest")}
                            className=" !text-gray-300 !border-gray-300/20 !rounded !h-9  !w-22"
                            placeholderCustom="Select link mode"
                            items={linkModes}
                            btnId="share-link-mode-dropdown"
                            fixedWidth={300}
                        />

                        <CardRowMenuBtn
                            customId={expiryMenuId}
                            exclusiveGroup="board-share-submenu"
                            placement="top-end"
                            offset={[0, -6]}
                            enableOwnBackdrop={true}

                            //desiredBackdropOpacity={0}
                            menuComponent={({ onClose, ref }) => (
                                <div ref={ref}>
                                    <ShareLinkExpiryMenu
                                        value={expiryDraftDate}
                                        onChange={setExpiryDraftDate}
                                        onClear={() => {
                                            setExpiryDraftDate(undefined);
                                            onExpiresAtChange(null);
                                            onClose();
                                        }}
                                        onApply={() => {
                                            onExpiresAtChange(expiryDraftDate ? expiryDraftDate.toISOString() : null);
                                            onClose();
                                        }}
                                    />
                                </div>
                            )}
                        >
                            <LabeledButtonPresetB
                                className="!gap-0 !h-9 !w-9"
                                label=" "
                                onClick={() => {
                                    setExpiryDraftDate(expiresAt ? new Date(expiresAt) : undefined);
                                }}
                            >
                                <CalendarIcon className="w-4 h-4 text-white" />
                            </LabeledButtonPresetB>
                        </CardRowMenuBtn>
                    </div>
                </div>
            </div>
        </div>
    );
};
