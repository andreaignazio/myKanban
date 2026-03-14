import { forwardRef, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { LabeledButtonCustom } from "@/components/buttons/labeledButton";
import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useShareOffersStore, type CreateShareOfferPayload } from "@/stores/shareOffersStore";
import { useAsyncRequestStore } from "@/stores/asyncRequestStore";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import type { CreateShareLinkRequest } from "@/stores/types";
import { useShareUserSearch } from "@/hooks/useShareUserSearch";
import { SelectedUserChip } from "@/components/modals/shareBoard/SelectedUserChip";
import { ShareLinkSection } from "@/components/modals/shareBoard/ShareLinkSection";
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper";
import { AsyncRequestOverlayA } from "../asyncRequestHandlers/asyncRequestOverlayA";
import type { BoardRole } from "@/hooks/useCurrentBoardRole";

import { getRoleBadgeClass, } from "../badges/UserRoleBadge";

type WorkspaceShareModalProps = {
    workspaceID: string;
    onClose?: () => void;
    style?: CSSProperties;
}

export const WorkspaceShareModal = forwardRef<HTMLDivElement, WorkspaceShareModalProps>(({ workspaceID, onClose, style }, ref) => {
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceID);

    const createWorkspaceShareOffer = useShareOffersStore((state) => state.createWorkspaceShareOffer);
    const createShareLink = useShareLinksStore((state) => state.createShareLink);

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
        overlayId: `workspace-share-search-results-dropdown-${workspaceID}`,
    });

    const msgInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [isFocusedMsg, setIsFocusedMsg] = useState(false);
    const [role, setRole] = useState("viewer");
    const [publicShareLink, setPublicShareLink] = useState<string | null>(null);
    const [shareLinkMode, setShareLinkMode] = useState<"autojoin" | "sendrequest">("autojoin");
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState<string | null>(null);

    const getRoleClass = (role: BoardRole) => getRoleBadgeClass(role.toLowerCase() as BoardRole, true, false, false);

    const roles: MenuItem[] & { className: string }[] = [
        { id: "owner", label: "Owner", onClick: () => setRole("owner"), className: getRoleClass("owner") },
        { id: "admin", label: "Admin", onClick: () => setRole("admin"), className: getRoleClass("admin") },
        { id: "member", label: "Member", onClick: () => setRole("member"), className: getRoleClass("member") },
        { id: "viewer", label: "Viewer", onClick: () => setRole("viewer"), className: getRoleClass("viewer") },
    ];

    const resetState = () => {
        resetSearch();
        setRole("Viewer");
        setPublicShareLink(null);
        setShareLinkMode("autojoin");
        setShareLinkExpiresAt(null);
        if (msgInputRef.current) msgInputRef.current.value = "";
    };

    const handleClose = () => {
        resetState();
        onClose?.();
    };

    const handleSendWorkspaceShareOffer = async () => {
        if (!workspaceID) return;

        const payload: CreateShareOfferPayload = {
            ToUserIDs: selectedUsers.map((user) => user.ID),
            OfferedRole: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Message: msgInputRef.current?.value ?? "",
        };

        await createWorkspaceShareOffer(payload, workspaceID);

        const isSuccess = useAsyncRequestStore.getState().requestsByKey["workspace:shareoffer:create"]?.isSuccessful;
        if (isSuccess) {
            setTimeout(handleClose, 1500);
        }
    };

    const handleCreateShareLink = async () => {
        if (!workspaceID) return;

        const payload: CreateShareLinkRequest = {
            TargetID: workspaceID,
            TargetType: "workspace",
            Role: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Mode: shareLinkMode,
            ExpiresAt: shareLinkExpiresAt ?? undefined,
        };

        const shareLink = await createShareLink(payload);
        setPublicShareLink(shareLink);
    };

    const shareControlsTab = (
        <div className="w-full min-h-0 flex flex-col gap-3 py-3">
            {isAdminOrOwner && (
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
                                items={roles}
                                btnId="workspace-share-role-selector-dr$$opdown"
                                activeId={role}

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

                        {selectedUsers.length > 0 && (
                            <LabeledButtonCustom
                                label="Send invite"
                                onClick={handleSendWorkspaceShareOffer}
                                className="rounded-[3px] min-w-20 justify-center theme-dark font-medium ml-2 items-center bg-[#689ef0] text-neutral-900 h-10"
                            />
                        )}
                    </div>
                </div>
            )}

            {selectedUsers.length > 0 && (
                <div className={`flex w-full h-24 overflow-hidden rounded-md ${isFocusedMsg
                    ? "border border-blue-500 ring-inset ring-4 ring-opacity-100 ring-blue-500"
                    : "border border-neutral-500 border-opacity-85"}`}>
                    <textarea
                        ref={msgInputRef}
                        className="w-full h-full bg-menusec rounded-md p-2 text-white"
                        placeholder="Add a message (optional)"
                        onFocus={() => setIsFocusedMsg(true)}
                        onBlur={() => setIsFocusedMsg(false)}
                    />
                </div>
            )}

            <ShareLinkSection
                publicShareLink={publicShareLink}
                handleCreateShareLink={handleCreateShareLink}
                linkMode={shareLinkMode}
                onLinkModeChange={setShareLinkMode}
                expiresAt={shareLinkExpiresAt}
                onExpiresAtChange={setShareLinkExpiresAt}
                expiryMenuId={`workspace-share-link-expiry-menu-${workspaceID}`}
                isCollapsible={false}
            >
                <div>

                </div>
            </ShareLinkSection>
        </div>
    );

    return (
        <>
            <CommonMenuWrapper
                requestGroups={[
                    { requestKey: ["workspace:shareoffer:create"], maxErrorMs: 2000 },
                ]}
                ref={ref}
                style={style}
                className="flex-col w-[600px] min-h-[200px] h-fit !rounded-2xl pt-4 p-4 pb-4 px-9"
            >
                <AsyncRequestOverlayA
                    requestKey={["workspace:shareoffer:create"]}
                />

                <div className="w-full relative min-h-0 flex flex-col gap-2 overflow-hidden">
                    <div className="justify-between items-center flex flex-row w-full mb-0 mt-2">
                        <span className="text-lg font-medium">Offer Workspace Membership</span>

                        <div onClick={handleClose} className="rounded-md p-1.5 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                            <XMarkIcon className="w-6 aspect-square text-white" />
                        </div>
                    </div>
                    <div className="w-full min-h-0">
                        {shareControlsTab}
                    </div>
                </div>
            </CommonMenuWrapper>

            {createPortal(
                <div
                    className="theme-dark bg-[#0a090aea] bg-opacity-60 fixed h-screen w-screen top-0 left-0 z-40"
                    onClick={handleClose}
                />, document.body
            )}
        </>
    );
});
