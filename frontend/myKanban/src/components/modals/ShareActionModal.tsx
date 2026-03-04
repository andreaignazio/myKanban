import { useUserStore } from "@/stores/userStore";
import React, { forwardRef, useEffect, useRef, useState } from "react"
import { UserRowData } from "../UserRow";
import type { CreateShareLinkRequest, User } from "@/stores/types";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";

import { useShareOffersStore } from "@/stores/shareOffersStore";
import type { CreateShareOfferPayload } from "@/stores/shareOffersStore";
import { useParams } from "react-router";
import { useOverlayStore } from "@/overlays/overlayStore";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CustomDropDown, type MenuItem } from "../menuElements/CustomDropDown";
import type { OverlayDescriptor } from "@/overlays/overlayStore";
import { SerchedResults } from "@/components/menuElements/SearchedResults"
import { useShareLinksStore } from "@/stores/shareLinksStore";
import { UserRoleBadgeSelector } from "../badges/RoleBadge";
import { useCurrentBoardRole, type BoardRole } from "@/hooks/useCurrentBoardRole";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useAsyncActionOverlay } from "@/hooks/useAsyncActionOverlay";
import { AsyncActionOverlay } from "./AsyncActionOverlay";
import { SelectedUserChip } from "./shareBoard/SelectedUserChip";
import { ShareLinkSection } from "./shareBoard/ShareLinkSection";
import { BoardShareModal } from "./BoardShareModal";


type ActionType = "create" | "revoke" | "respond" | "createAccessRequest" | "share-board" | "createWorkspaceAccessRequest";

type ShareActionModalProps = {
    actionType: ActionType;
    targetID?: string;
    targetType?: "workspace" | "board";
    shareOfferID?: string;
    onSubmitRevoke?: (text: string) => void;
    onClose?: () => void;
    style?: React.CSSProperties;
}

export const ShareActionModal = forwardRef<HTMLDivElement, ShareActionModalProps>((props, ref) => {

    if (props.actionType === "share-board") {
        return (
            <BoardShareModal
                ref={ref}
                targetID={props.targetID ?? ""}
                onClose={props.onClose}
                style={props.style}
            />
        );
    }

    const serachUsers = useUserStore((state) => state.searchUser)
    // const closeMenu = useOverlayStore((state) => state.close);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const msgInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const timeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isFocusedMsg, setIsFocusedMsg] = useState(false);
    const [role, setRole] = useState("Viewer");
    const [publicShareLink, setPublicShareLink] = useState<string | null>(null);
    const [shareLinkMode, setShareLinkMode] = useState<"autojoin" | "sendrequest">("autojoin");
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState<string | null>(null);


    const getIsSuccess = useShareOffersStore((state) => state.getIsSuccess);
    const { status: asyncOverlayStatus, isActive: isAsyncOverlayActive, reset: resetAsyncOverlay, runWithOverlay } = useAsyncActionOverlay();



    //====USER SEARCH HANDLER WITH DEBOUNCE====//
    const handleInputChange = () => {
        if (timeOutRef.current) {
            clearTimeout(timeOutRef.current);
        }
        const value = inputRef.current?.value;
        // console.log("Search input:", value);
        timeOutRef.current = setTimeout(() => {
            serachUsers(value ?? "").then((users) => {
                setSearchResults(users);
                // console.log("Search results:", users);
            });
        }, 500);
    }

    useEffect(() => {
        return () => {
            if (timeOutRef.current) {
                clearTimeout(timeOutRef.current);
            }
        };
    }, []);

    const handleSelectUser = (user: User) => {
        setSearchResults([]);
        inputRef.current!.value = "";
        setSelectedUsers((prev) => [...prev, user]);
        // console.log("Selected user:", user);
    };

    const handleFocus = () => {
        setIsFocused(true);
        if (inputRef.current) {
            inputRef.current.classList.add("outline-none");
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputRef.current) {
            inputRef.current.classList.remove("outline-none");
        }
    };
    const removeSelectedUser = (userId: string) => {
        setSelectedUsers((prev) => prev.filter((user) => user.ID !== userId));
    }


    ///====MESSAGE FOCUS HANDLERS====//
    const handleFocusMsg = () => {
        setIsFocusedMsg(true);
        if (msgInputRef.current) {
            msgInputRef.current.classList.add("outline-none");
        }
    };

    const handleBlurMsg = () => {
        setIsFocusedMsg(false);
        if (msgInputRef.current) {
            msgInputRef.current.classList.remove("outline-none");
        }
    };



    ///====SHARE OFFER HANDLERS====//



    const createWorkspaceAccessRequest = useShareOffersStore((state) => state.createWorkspaceAccessRequest);
    const createWorkspaceShareOffer = useShareOffersStore((state) => state.createWorkspaceShareOffer);
    const revokeWorkspaceShareOffer = useShareOffersStore((state) => state.revokeWorkspaceShareOffer);
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer);
    const createBoardAccessRequest = useShareOffersStore((state) => state.createBoardAccessRequest);
    const createShareLink = useShareLinksStore((state) => state.createShareLink);

    const workspaceID = useParams().workspaceId ?? "";
    const { isAdminOrOwner: isAdminOrOwnerBoard } = useCurrentBoardRole(props.targetID);
    const { isAdminOrOwner: isAdminOrOwnerWorkspace, isMember: isWorkspaceMember, isViewer: isWorkspaceViewer } = useCurrentWorkspaceRole(workspaceID)


    const isAdminOrOwner = props.targetType === "board" ? isAdminOrOwnerBoard : isAdminOrOwnerWorkspace;

    async function handleSendBoardAccessRequest() {
        if (!props.targetID) return;
        await runWithOverlay(
            () => createBoardAccessRequest(props.targetID ?? "", msgInputRef.current?.value ?? "", role.toLowerCase() as "owner" | "admin" | "member" | "viewer"),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        )
    }




    async function handleSendWorkspaceShareOffer() {
        // console.log("Creating share offer with role:", role);
        const payload: CreateShareOfferPayload = {
            ToUserIDs: selectedUsers.map((user) => user.ID),
            OfferedRole: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Message: msgInputRef.current?.value ?? ""
        }
        await runWithOverlay(
            () => createWorkspaceShareOffer(payload, workspaceID),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        )

    }

    async function handleSubmitRevoke() {
        if (!props.shareOfferID) return;
        const shareOfferID = props.shareOfferID;
        await runWithOverlay(
            () => revokeWorkspaceShareOffer(shareOfferID, msgInputRef.current?.value ?? ""),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        )
    }

    async function handleSubmitRespond(accept: boolean) {
        if (!props.shareOfferID) return;
        const shareOfferID = props.shareOfferID;
        await runWithOverlay(
            () => respondToShareOffer(shareOfferID, accept),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        )
    }

    async function handlCreateShareLink() {
        // console.log("Creating share link with role:", role, "targetID:", props.targetID, "targetType:", props.targetType);
        if (!props.targetID || !props.targetType) return;
        const payload: CreateShareLinkRequest = {
            TargetID: props.targetID,
            TargetType: props.targetType,
            Role: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Mode: shareLinkMode,
            ExpiresAt: shareLinkExpiresAt ?? undefined,
        }
        const shareLink = await createShareLink(payload);
        // console.log("Created share link:", shareLink);
        setPublicShareLink(shareLink);
    }

    async function handleCreateWorkspaceAccessRequest() {
        if (!props.targetID) return;
        await runWithOverlay(
            () => createWorkspaceAccessRequest(props.targetID ?? "", msgInputRef.current?.value ?? "", role.toLowerCase() as "member" | "viewer"),
            {
                settleDelayMs: 1000,
                evaluateSuccess: () => Boolean(getIsSuccess()),
                successDurationMs: 1500,
                errorDurationMs: 1000,
                onSuccess: handleClose,
            }
        )
    }

    function resetState() {
        resetAsyncOverlay();
        setSelectedUsers([]);
        setShareLinkMode("autojoin");
        setShareLinkExpiresAt(null);
    }

    function handleClose() {
        resetState();
        if (props.onClose) {
            props.onClose();
        }
    }

    let Title = "";
    switch (props.actionType) {
        case "create":
            Title = "Offer Workspace Membership";
            break;
        case "revoke":
            Title = "Revoke offer";
            break;
        case "respond":
            Title = "Respond to Workspace Share Offer";
            break;
        case "createAccessRequest":
            Title = "Request Board Access";
            break;
        case "createWorkspaceAccessRequest":
            Title = "Request access to workspace";
            break;
    }

    const roles: MenuItem[] = [
        { id: "owner", label: "Owner", onClick: () => setRole("Owner") },
        { id: "admin", label: "Admin", onClick: () => setRole("Admin") },
        { id: "member", label: "Member", onClick: () => setRole("Member") },
        { id: "viewer", label: "Viewer", onClick: () => setRole("Viewer") },
    ]


    let boardAccessRequestAvailableRoles: MenuItem[] = []

    if (isAdminOrOwnerWorkspace || isWorkspaceMember) {
        boardAccessRequestAvailableRoles = roles.filter((role) => role.id != "owner")
    }
    if (isWorkspaceViewer) {
        boardAccessRequestAvailableRoles = roles.filter((role) => role.id === "viewer")
    }

    const workspaceAccessRequestAvailableRoles: MenuItem[] =
        roles.filter((role) => role.id === "member" || role.id === "viewer")


    const panelRefSearch = useRef<HTMLDivElement | null>(null)
    const SEARCHED_PANEL_ID = "share-action-search-results-dropdown";
    const onOpenOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const inputWrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (searchResults.length > 0) {
            handleOpenDropdpown();
        } else {
            closeOverlay(SEARCHED_PANEL_ID);
        }
    }, [searchResults]);

    function handleOpenDropdpown() {

        const descriptor: OverlayDescriptor = {
            id: SEARCHED_PANEL_ID,
            render: () => <SerchedResults anchorRef={inputWrapperRef} searchResults={searchResults} ref={panelRefSearch} onSelect={handleSelectUser}></SerchedResults>,
            panelRef: panelRefSearch,
            anchorRef: inputWrapperRef,
            type: "dropdown",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: true,

            },
            position: {
                placement: "bottom-start",
                offset: [2, 2],

            },
            renderType: "anchored",
            exclusiveGroup: "dropdowns",

        }
        onOpenOverlay(descriptor);
    }


    return (
        <>

            <div ref={ref} className="theme-dark">
                <div
                    style={props.style}
                    className="theme-dark bg-menu w-[600px] h-fit rounded-2xl  
            shadow-lg shadow-black relative overflow-hidden pt-4
         text-white p-4 pb-6 px-9">

                    <AsyncActionOverlay
                        isActive={isAsyncOverlayActive}
                        status={asyncOverlayStatus}
                        loadingText="Sending share offer..."
                        successText="Share offer sent successfully!"
                        errorText="Share offer sent failed!"
                    />



                    <div className="w-full relative h-full min-h-0 flex flex-col gap-2 overflow-hidden ">
                        <div className="justify-between items-center flex flex-row  w-full mb-3 mt-2">
                            <span className="text-lg font-medium ">{Title}</span>

                            <div onClick={handleClose} className=" rounded-md p-1.5 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                                <XMarkIcon className="w-6 aspect-square text-white" />
                            </div>

                        </div>


                        {(props.actionType === "create") && isAdminOrOwner && (

                            <div className="w-full flex flex-row mb-2 ">
                                <div ref={inputWrapperRef}
                                    className={`flex flex-row overflow-hidden 
                        bg-menusec w-full text-white  rounded-md h-11 
                        ${isFocused ?
                                            'border border-blue-500 ring-inset ring-2 ring-opacity-75 ring-blue-500'
                                            : 'border border-neutral-500 border-opacity-85'}`} >
                                    <div className="px-1.5 flex flex-row gap-2 items-center justify-items-start">
                                        {selectedUsers ? (selectedUsers.map((user) => (
                                            <div className="py-1 px-0" key={user.ID}>
                                                <SelectedUserChip label={user.Name} onRemove={() => { removeSelectedUser(user.ID) }} />
                                            </div>
                                        ))) : null
                                        }

                                    </div>
                                    <input ref={inputRef} onChange={handleInputChange} className=" w-full min-h-8 bg-transparent" onFocus={handleFocus} onBlur={handleBlur} placeholder="Search..." />

                                </div>
                                <div className="flex flex-row items-center ml-0 ">
                                    {(selectedUsers.length > -1) && (<div className="flex w-32 ml-2">

                                        <CustomDropDown items={roles} btnId="role-selector-dropdown"
                                            style={{
                                                color: "rgba(255, 255, 255, 0.5)",
                                                borderColor: "rgba(200, 200, 200, 0.2)",
                                                justifyContent: "space-between",
                                            }}
                                            placeholderCustom="Select role" >
                                            <ChevronDownIcon className="w-4 h-4 text-[rgba(200, 200, 200, 0.5)]" />
                                        </CustomDropDown>


                                    </div>)}

                                    {selectedUsers.length > 0 && (
                                        <LabeledButtonCustom label={"Send invite"}
                                            onClick={() => {
                                                handleSendWorkspaceShareOffer()
                                            }}
                                            className={"rounded-[3px] min-w-20 justify-center theme-dark font-medium ml-2  items-center bg-[#689ef0] text-neutral-900 h-10"}>

                                        </LabeledButtonCustom>
                                    )}


                                </div>
                            </div>)}

                        {((props.actionType === "create" && selectedUsers.length > 0) || props.actionType === "revoke" || props.actionType === "createAccessRequest" || props.actionType === "createWorkspaceAccessRequest") && (
                            <div className={`flex w-full h-24 overflow-hidden rounded-md ${isFocusedMsg ?
                                'border border-blue-500 ring-inset ring-4 ring-opacity-100 ring-blue-500'
                                : 'border border-neutral-500 border-opacity-85'}`}>
                                <textarea
                                    ref={msgInputRef}
                                    className="w-full  h-full bg-menusec rounded-md p-2 text-white" placeholder="Add a message (optional)"
                                    onFocus={handleFocusMsg} onBlur={handleBlurMsg}></textarea>
                            </div>)}

                        {(props.actionType === "create") && (
                            <ShareLinkSection
                                publicShareLink={publicShareLink}
                                handleCreateShareLink={handlCreateShareLink}
                                linkMode={shareLinkMode}
                                onLinkModeChange={setShareLinkMode}
                                expiresAt={shareLinkExpiresAt}
                                onExpiresAtChange={setShareLinkExpiresAt}
                            >
                                <div>
                                    <UserRoleBadgeSelector role={role.toLowerCase() as BoardRole}
                                        onClick={() => { }}
                                        isLocked={publicShareLink !== null}
                                        className=" cursor-pointer scale-110  transition-all text-white" items={roles} />
                                </div>
                            </ShareLinkSection>
                        )}

                        {(props.actionType === "createAccessRequest" || props.actionType === "createWorkspaceAccessRequest") && (
                            <div className="w-full flex flex-row items-center h-11 justify-between gap-4">
                                <div className="flex flex-row items-center h-full w-40">
                                    {selectedUsers.length > -1 && (
                                        <CustomDropDown className="!rounded !h-full"
                                            items={props.actionType === "createAccessRequest" ? boardAccessRequestAvailableRoles : workspaceAccessRequestAvailableRoles} btnId="role-selector-dropdown"
                                            placeholderCustom="Select role" />

                                    )}
                                </div>
                                <LabeledButtonCustom label={"Request Access"} onClick={props.actionType === "createAccessRequest" ? handleSendBoardAccessRequest : handleCreateWorkspaceAccessRequest}
                                    className={"theme-dark !rounded px-4 font-medium h-full !bg-accent text-neutral-900"}>
                                </LabeledButtonCustom>
                            </div>)}

                        {(props.actionType === "revoke") && (
                            <div className="w-full flex flex-row items-center justify-start mt-2 gap-4">
                                <LabeledButtonCustom label={"Revoke Share Offer"} onClick={handleSubmitRevoke}
                                    className={"theme-dark font-medium  bg-[#e06868] text-neutral-900"}>
                                </LabeledButtonCustom>
                            </div>)}
                        {(props.actionType === "respond") && (
                            <div className="w-full flex flex-row items-center justify-center mt-2 gap-6">
                                <LabeledButtonCustom label={"Reject Share Offer"} onClick={() => handleSubmitRespond(false)}
                                    className={"theme-dark font-medium  bg-[#e06868] text-neutral-900"}>
                                </LabeledButtonCustom>
                                <LabeledButtonCustom label={"Accept Share Offer"} onClick={() => handleSubmitRespond(true)}
                                    className={"theme-dark font-medium  bg-[#68f0e2] text-neutral-900"}>
                                </LabeledButtonCustom>
                            </div>)}

                    </div>

                </div>







                {createPortal(<div className="theme-dark bg-[#0a090aea] bg-opacity-60 fixed h-screen w-screen top-0 left-0 z-40" onClick={handleClose}></div>, document.body)}



            </div >
        </>
    )
}
)

export function MembersDropdown({ onSetRole, Role }: { onSetRole: (role: string) => void, Role?: string }) {
    const [open, setOpen] = useState(false)
    const menuItems = [
        { id: 0, label: "Viewer" },
        { id: 1, label: "Member" },
        { id: 2, label: "Admin" },
        { id: 3, label: "Owner" },
    ]
    const handleClose = () => {
        setOpen(false)
    }
    const toggle = () => {
        setOpen((prev) => !prev)
    }

    const anchorRef = useRef<HTMLButtonElement | null>(null)
    const anchorEl = anchorRef?.current;
    const style = anchorEl ? {
        position: "fixed",
        left: anchorEl.getBoundingClientRect().left - 10,
        top: anchorEl.getBoundingClientRect().bottom - 12,
        //width: "200px",
        //width: anchorEl.getBoundingClientRect().width + 10,
        zIndex: 3000
    } as React.CSSProperties : { position: "fixed", left: 0, top: 0, zIndex: 1000 } as React.CSSProperties;

    return (
        <>
            <button
                ref={anchorRef}
                onClick={toggle}
                className="rounded-md bg-surface px-3 py-2 hover:bg-active"
            >
                {Role ?? "Membership"}
            </button>
            {open && createPortal(

                <div
                    style={style}
                    //ref={panelRef}
                    className="theme-dark w-44 rounded-lg border border-transparent bg-menusec shadow-lg p-2"
                >
                    <div className="px-3 py-2 text-sm font-bold text-neutral-200">Select role</div>
                    {menuItems.map((item) => (
                        <button
                            className="w-full text-left text-neutral-100 rounded-lg px-3 py-2 hover:bg-active hover:bg-opacity-10"
                            onClick={() => {
                                handleClose()
                                onSetRole((item.label ?? "Viewer"))
                            }}
                        >
                            {item.label}
                        </button>
                    ))}

                </div>, document.body)}
        </>
    )
}


type SerchedResultsProps = {
    searchResults: User[]
    onSelect: (user: User) => void
    anchorRef?: React.RefObject<HTMLElement | null>
}

export const SerchedResultsOLD = ({ searchResults, onSelect, anchorRef }: SerchedResultsProps) => {

    // const panelRef = useRef<HTMLDivElement | null>(null)
    const anchorEl = anchorRef?.current;
    const style = anchorEl ? {
        position: "fixed",
        left: anchorEl.getBoundingClientRect().left - 10,
        top: anchorEl.getBoundingClientRect().bottom - 12,
        width: anchorEl.getBoundingClientRect().width + 10,
        zIndex: 3000
    } as React.CSSProperties : { position: "fixed", left: 0, top: 0, zIndex: 1000 } as React.CSSProperties;

    if (searchResults.length > 0) {
        //open(overlayId)
    }
    //if (openId !== overlayId) return null

    // console.log("Style for search results:", style);
    return createPortal(
        <div className={`w-full px-0 ${searchResults.length > 0 ? 'block' : 'hidden'}`} style={style}>
            <div className="theme-dark w-full bg-menusec text-white 
                shadow-lg max-h-72 overflow-y-auto scrollbar-hidden
                rounded-lg mt-4 py-4 px-2 flex flex-col gap-3 ">
                {searchResults && (searchResults?.map((user) => (
                    <UserRowData key={user.ID} user={user} onClick={() => onSelect(user)} />
                )))}
            </div>
        </div>, document.body
    )
}



export function LabeledButton({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <div className="relative flex flex-row items-center justify-start bg-menu rounded-sm py-1 px-2 gap-1">
            <div className=" text-nowrap">{label}</div>
            <div className=" rounded-sm hover:bg-gray-500 hover:bg-opacity-15 p-0.1">
                <XMarkIcon onClick={onClick} className=" flex items-center 
                justify-center w-5 h-5 text-white cursor-pointer translate-y-[1px]" />
            </div>
        </div>
    )
}

