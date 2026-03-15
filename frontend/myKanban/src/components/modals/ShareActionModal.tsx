import React, { forwardRef, useRef, useState } from "react"
import { XMarkIcon } from "@heroicons/react/24/solid";
import { createPortal } from "react-dom";

import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useParams } from "react-router";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CustomDropDown, type MenuItem } from "../menuElements/CustomDropDown";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useAsyncActionOverlay } from "@/hooks/useAsyncActionOverlay";
import { AsyncActionOverlay } from "./AsyncActionOverlay";
import { BoardShareModal } from "./BoardShareModal";
import { WorkspaceShareModal } from "./WorkspaceShareModal";


type ActionType = "revoke" | "respond" | "createAccessRequest" | "share-board" | "createWorkspaceAccessRequest" | "create";

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

    if (props.actionType === "create") {
        return (
            <WorkspaceShareModal
                ref={ref}
                workspaceID={props.targetID ?? ""}
                onClose={props.onClose}
                style={props.style}
            />
        );
    }

    const msgInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [isFocusedMsg, setIsFocusedMsg] = useState(false);
    const [role, setRole] = useState("Viewer");

    const getIsSuccess = useShareOffersStore((state) => state.getIsSuccess);
    const { status: asyncOverlayStatus, isActive: isAsyncOverlayActive, reset: resetAsyncOverlay, runWithOverlay } = useAsyncActionOverlay();

    const handleFocusMsg = () => setIsFocusedMsg(true);
    const handleBlurMsg = () => setIsFocusedMsg(false);

    const createWorkspaceAccessRequest = useShareOffersStore((state) => state.createWorkspaceAccessRequest);
    const revokeWorkspaceShareOffer = useShareOffersStore((state) => state.revokeWorkspaceShareOffer);
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer);
    const createBoardAccessRequest = useShareOffersStore((state) => state.createBoardAccessRequest);

    const workspaceID = useParams().workspaceId ?? "";
    const { isAdminOrOwner: isAdminOrOwnerWorkspace, isMember: isWorkspaceMember, isViewer: isWorkspaceViewer } = useCurrentWorkspaceRole(workspaceID);

    async function handleSendBoardAccessRequest() {
        if (!props.targetID) return;
        await runWithOverlay(
            () => createBoardAccessRequest(props.targetID ?? "", msgInputRef.current?.value ?? "", role.toLowerCase() as "member" | "viewer"),
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
    }

    function handleClose() {
        resetState();
        props.onClose?.();
    }

    let Title = "";
    switch (props.actionType) {
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
    ];

    let boardAccessRequestAvailableRoles: MenuItem[] = [];
    if (isAdminOrOwnerWorkspace || isWorkspaceMember) {
        boardAccessRequestAvailableRoles = roles.filter((r) => r.id !== "owner");
    }
    if (isWorkspaceViewer) {
        boardAccessRequestAvailableRoles = roles.filter((r) => r.id === "viewer");
    }

    const workspaceAccessRequestAvailableRoles: MenuItem[] =
        roles.filter((r) => r.id === "member" || r.id === "viewer");


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


                        {(props.actionType === "revoke" || props.actionType === "createAccessRequest" || props.actionType === "createWorkspaceAccessRequest") && (
                            <div className={`flex w-full h-24 overflow-hidden rounded-md ${isFocusedMsg ?
                                'border border-blue-500 ring-inset ring-4 ring-opacity-100 ring-blue-500'
                                : 'border border-neutral-500 border-opacity-85'}`}>
                                <textarea
                                    ref={msgInputRef}
                                    className="w-full  h-full bg-menusec rounded-md p-2 text-white" placeholder="Add a message (optional)"
                                    onFocus={handleFocusMsg} onBlur={handleBlurMsg}></textarea>
                            </div>)}

                        {(props.actionType === "createAccessRequest" || props.actionType === "createWorkspaceAccessRequest") && (
                            <div className="w-full flex flex-row items-center h-11 justify-between gap-4">
                                <div className="flex flex-row items-center h-full w-40">
                                    <CustomDropDown className="!rounded !h-full"
                                        items={props.actionType === "createAccessRequest" ? boardAccessRequestAvailableRoles : workspaceAccessRequestAvailableRoles} btnId="role-selector-dropdown"
                                        placeholderCustom="Select role" />
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







                {false && createPortal(<div className="theme-dark bg-[#0a090aea] bg-opacity-60 fixed h-screen w-screen top-0 left-0 z-40" onClick={handleClose}></div>, document.body)}



            </div >
        </>
    )
}
)


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

