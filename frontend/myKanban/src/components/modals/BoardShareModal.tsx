import { forwardRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { AsyncActionOverlay } from "@/components/modals/AsyncActionOverlay";
import { LabeledButtonCustom } from "@/components/buttons/labeledButton";
import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown";
import { UserRoleBadgeSelector } from "@/components/badges/RoleBadge";
import { BoardMembersSubMenu } from "@/components/modals/BoardMembersSubMenu";
import type { BoardRole } from "@/hooks/useCurrentBoardRole";
import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole";
import { useAsyncActionOverlay } from "@/hooks/useAsyncActionOverlay";
import { useShareOffersStore, type CreateShareOfferPayload } from "@/stores/shareOffersStore";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import type { CreateShareLinkRequest } from "@/stores/types";
import { useShareUserSearch } from "@/hooks/useShareUserSearch";
import { SelectedUserChip } from "@/components/modals/shareBoard/SelectedUserChip";
import { ShareLinkSection } from "@/components/modals/shareBoard/ShareLinkSection";

type BoardShareModalProps = {
    targetID: string;
    onClose?: () => void;
    style?: CSSProperties;
}

export const BoardShareModal = forwardRef<HTMLDivElement, BoardShareModalProps>(({ targetID, onClose, style }, ref) => {
    const { isAdminOrOwner } = useCurrentBoardRole(targetID);

    const createBoardShareOffer = useShareOffersStore((state) => state.createBoardShareOffer);
    const getIsSuccess = useShareOffersStore((state) => state.getIsSuccess);
    const createShareLink = useShareLinksStore((state) => state.createShareLink);

    const { status: asyncOverlayStatus, isActive: isAsyncOverlayActive, reset: resetAsyncOverlay, runWithOverlay } = useAsyncActionOverlay();

    const {
        inputRef,
        inputWrapperRef,
        selectedUsers,
        isFocused,
        handleInputChange,
        handleFocus,
        handleBlur,
        removeSelectedUser,
        reset: resetSearch,
    } = useShareUserSearch({
        overlayId: `share-action-search-results-dropdown-${targetID}`,
    });

    const [role, setRole] = useState("Viewer");
    const [publicShareLink, setPublicShareLink] = useState<string | null>(null);
    const [shareLinkMode, setShareLinkMode] = useState<"autojoin" | "sendrequest">("autojoin");
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState<string | null>(null);

    const roles: MenuItem[] = [
        { id: "owner", label: "Owner", onClick: () => setRole("Owner") },
        { id: "admin", label: "Admin", onClick: () => setRole("Admin") },
        { id: "member", label: "Member", onClick: () => setRole("Member") },
        { id: "viewer", label: "Viewer", onClick: () => setRole("Viewer") },
    ];
    const memberDropdownRoles = roles.filter((item) => item.id !== "owner");

    const resetState = () => {
        resetAsyncOverlay();
        resetSearch();
        setRole("Viewer");
        setPublicShareLink(null);
        setShareLinkMode("autojoin");
        setShareLinkExpiresAt(null);
    };

    const handleClose = () => {
        resetState();
        onClose?.();
    };

    const handleSendBoardShareOffer = async () => {
        if (!targetID) return;

        const payload: CreateShareOfferPayload = {
            ToUserIDs: selectedUsers.map((user) => user.ID),
            OfferedRole: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Message: "",
        };

        await runWithOverlay(
            () => createBoardShareOffer(payload, targetID),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        );
    };

    const handleCreateShareLink = async () => {
        if (!targetID) return;

        const payload: CreateShareLinkRequest = {
            TargetID: targetID,
            TargetType: "board",
            Role: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Mode: shareLinkMode,
            ExpiresAt: shareLinkExpiresAt ?? undefined,
        };

        const shareLink = await createShareLink(payload);
        setPublicShareLink(shareLink);
    };

    const shareControlsTab = (
        <div className="w-full min-h-0 flex flex-col gap-3 py-3">
            <div className="w-full flex flex-row mb-2">
                <div
                    ref={inputWrapperRef}
                    className={`flex flex-row overflow-hidden bg-menusec w-full text-white rounded-md h-11 ${isFocused
                        ? "border border-blue-500 ring-inset ring-2 ring-opacity-75 ring-blue-500"
                        : "border border-neutral-500 border-opacity-85"}`}
                >
                    <div className="px-1.5 flex flex-row gap-2 items-center justify-items-start">
                        {selectedUsers.map((user) => (
                            <div className="py-1 px-0" key={user.ID}>
                                <SelectedUserChip label={user.Name} onRemove={() => removeSelectedUser(user.ID)} />
                            </div>
                        ))}
                    </div>

                    <input
                        ref={inputRef}
                        onChange={handleInputChange}
                        className="w-full min-h-8 bg-transparent"
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Search..."
                    />
                </div>

                <div className="flex flex-row items-center ml-0">
                    <div className="flex w-32 ml-2">
                        <CustomDropDown
                            items={memberDropdownRoles}
                            btnId="board-share-role-selector-dropdown"
                            style={{
                                color: "rgba(255, 255, 255, 0.5)",
                                borderColor: "rgba(200, 200, 200, 0.2)",
                                justifyContent: "space-between",
                            }}
                            placeholderCustom="Select role"
                        >
                            <ChevronDownIcon className="w-4 h-4 text-[rgba(200, 200, 200, 0.5)]" />
                        </CustomDropDown>
                    </div>

                    {selectedUsers.length > -1 && (
                        <LabeledButtonCustom
                            label="Share"
                            onClick={handleSendBoardShareOffer}
                            className="rounded-[3px] min-w-20 justify-center theme-dark font-medium ml-2 items-center bg-[#689ef0] text-neutral-900 h-10"
                        />
                    )}
                </div>
            </div>


            <ShareLinkSection
                publicShareLink={publicShareLink}
                handleCreateShareLink={handleCreateShareLink}
                linkMode={shareLinkMode}
                onLinkModeChange={setShareLinkMode}
                expiresAt={shareLinkExpiresAt}
                onExpiresAtChange={setShareLinkExpiresAt}
                expiryMenuId={`share-link-expiry-menu-${targetID}`}
                isCollapsible={false}
            >

            </ShareLinkSection>
        </div>
    );

    return (
        <div ref={ref} className="theme-dark">
            <div
                style={style}
                className="theme-dark bg-menu w-[600px]
                 h-fit rounded-2xl shadow-lg
                  shadow-black relative overflow-hidden pt-4 text-white p-4 pb-4 px-9"
            >
                <AsyncActionOverlay
                    isActive={isAsyncOverlayActive}
                    status={asyncOverlayStatus}
                    loadingText="Sending share offer..."
                    successText="Share offer sent successfully!"
                    errorText="Share offer sent failed!"
                />

                <div className="w-full relative min-h-0 flex flex-col gap-2 overflow-hidden">
                    <div className="justify-between items-center flex flex-row w-full mb-0 mt-2">
                        <span className="text-lg font-medium">Share Board</span>

                        <div onClick={handleClose} className="rounded-md p-1.5 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                            <XMarkIcon className="w-6 aspect-square text-white" />
                        </div>
                    </div>
                    <div className="w-full min-h-0">
                        <BoardMembersSubMenu
                            boardID={targetID}
                            defaultTabId={isAdminOrOwner ? "share" : "members"}
                            dynamicHeight={true}
                            maxDynamicContentHeight={460}
                            extraTabs={isAdminOrOwner ? [{ id: "share", label: "Share", content: shareControlsTab }] : undefined}
                        />
                    </div>
                </div>
            </div>

            {createPortal(
                <div
                    className="theme-dark bg-[#0a090aea] bg-opacity-60 fixed h-screen w-screen top-0 left-0 z-40"
                    onClick={handleClose}
                />, document.body
            )}
        </div>
    );
});
