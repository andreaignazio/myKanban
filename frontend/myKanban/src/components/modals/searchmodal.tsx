import { useUserStore } from "@/stores/userStore";
import React, { forwardRef, useEffect, useRef, useState } from "react"
import { UserRowData } from "../UserRow";
import type { User } from "@/stores/types";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { createPortal } from "react-dom";
import LoadingIcons from "react-loading-icons";

import { useShareOffersStore } from "@/stores/shareOffersStore";
import type { CreateShareOfferPayload } from "@/stores/shareOffersStore";
import { useParams } from "react-router";
import { useOverlayStore } from "@/overlays/store";
import { LabeledButtonCustom } from "../buttons/labeledButton";

export const SearchModal = forwardRef<HTMLDivElement, {}>((props, ref) => {

    const serachUsers = useUserStore((state) => state.searchUser)
    const isSendingShareOffer = useShareOffersStore((state) => state.isSendingShareOffer);
    const isRequestSuccessful = useShareOffersStore((state) => state.isRequestSuccessful);

    const closeMenu = useOverlayStore((state) => state.close);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const msgInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const timeOutRef = useRef<NodeJS.Timeout | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isFocusedMsg, setIsFocusedMsg] = useState(false);
    const [role, setRole] = useState("Viewer");

    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isUnsuccessful, setIsUnsuccessful] = useState(false);
    const getIsSuccess = useShareOffersStore((state) => state.getIsSuccess);

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

    const handleBlur = () => {
        setIsFocused(false);
        if (inputRef.current) {
            inputRef.current.classList.remove("outline-none");
        }
    };
    const removeSelectedUser = (userId: string) => {
        setSelectedUsers((prev) => prev.filter((user) => user.ID !== userId));
    }

    const createWorkspaceShareOffer = useShareOffersStore((state) => state.createWorkspaceShareOffer);

    const workspaceID = useParams().workspaceId ?? "";
    const requestTimerRef = useRef<NodeJS.Timeout | null>(null);


    async function handleSendWorkspaceShareOffer() {
        // console.log("Creating share offer with role:", role);
        const payload: CreateShareOfferPayload = {
            ToUserIDs: selectedUsers.map((user) => user.ID),
            OfferedRole: role.toLowerCase() as "owner" | "admin" | "member" | "viewer",
            Message: msgInputRef.current?.value ?? ""
        }
        setIsSent(true);
        setIsLoading(true);
        requestTimerRef.current = setTimeout(() => {
            handleRequestResult();
        }, 1000);
        await createWorkspaceShareOffer(payload, workspaceID)

    }

    function handleRequestResult() {
        // console.log("Handling request result. isRequestSuccessful:", getIsSuccess());
        if (getIsSuccess()) {
            setIsSuccess(true);
            setIsLoading(false);
            setTimeout(() => {
                handleClose();
            }, 1500);
        } else {
            setIsUnsuccessful(true);
            setIsSuccess(false);
            setIsLoading(false);
            setTimeout(() => {
                setIsSent(false);
                setIsUnsuccessful(false);

            }, 1000);

        }
    }

    function resetState() {
        setIsSent(false);
        setIsLoading(false);
        setIsSuccess(false);
        setIsUnsuccessful(false);
        setSelectedUsers([]);
    }

    function handleClose() {
        resetState();
        closeMenu();
    }


    return (
        <>

            <div ref={ref} className="theme-dark">
                <div className="theme-dark bg-menu w-[600px] rounded-2xl  
            shadow-lg shadow-black relative
         text-white p-6">
                    {(isSent) && (
                        <div className={`absolute inset-0  ${isUnsuccessful ? 'bg-red-500' : 'bg-black'} bg-opacity-50 flex items-center justify-center z-50 rounded-2xl`}>

                            {isLoading && (
                                <>
                                    <LoadingIcons.SpinningCircles className="text-white" />
                                    <span className="text-lg font-mono">Sending share offer...</span>
                                </>
                            )}
                            {isSuccess && (
                                <span className="text-lg font-mono">Share offer sent successfully!</span>
                            )}
                            {isUnsuccessful && (
                                <span className="text-lg font-mono">Share offer sent failed!</span>
                            )}

                        </div>
                    )}



                    <div className="w-full  flex flex-col items-center justify-center gap-2 ">
                        <div className="justify-start flex-row w-full mb-2 mt-2">
                            <span className="text-xl font-medium ">Offer Workspace Membership</span>
                        </div>
                        <div className="w-full flex flex-row gap-2">
                            <div className={`flex flex-row overflow-hidden 
                        bg-menusec w-full text-white  rounded-md h-11 
                        ${isFocused ?
                                    'border border-blue-500 ring-inset ring-2 ring-opacity-75 ring-blue-500'
                                    : 'border border-neutral-500 border-opacity-85'}`} >
                                <div className="px-1.5 flex flex-row gap-2 items-center justify-items-start">
                                    {selectedUsers ? (selectedUsers.map((user) => (
                                        <div className="py-1 px-0" key={user.ID}>
                                            <LabeledButton label={user.Name} onClick={() => { removeSelectedUser(user.ID) }} />
                                        </div>
                                    ))) : null
                                    }
                                </div>
                                <input ref={inputRef} onChange={handleInputChange} className=" w-full min-h-8 bg-transparent" onFocus={handleFocus} onBlur={handleBlur} placeholder="Search..." />

                            </div>
                            {selectedUsers.length > 0 && (
                                <LabeledButtonCustom label={"Send Invite"}
                                    onClick={() => { handleSendWorkspaceShareOffer() }}
                                    className={"theme-dark font-medium  bg-[#689ef0] text-neutral-900"}></LabeledButtonCustom>
                            )}

                        </div>
                        <div className={`flex w-full h-24 overflow-hidden rounded-md ${isFocusedMsg ?
                            'border border-blue-500 ring-inset ring-4 ring-opacity-100 ring-blue-500'
                            : 'border border-neutral-500 border-opacity-85'}`}>
                            <textarea
                                ref={msgInputRef}
                                className="w-full  h-full bg-menusec rounded-md p-2 text-white" placeholder="Add a message (optional)"
                                onFocus={handleFocusMsg} onBlur={handleBlurMsg}></textarea>
                        </div>
                        <div className="w-full flex flex-row items-center justify-start gap-4">
                            <MembersDropdown onSetRole={(role) => setRole(role)} Role={role} />
                        </div>
                    </div>

                </div>



                <SerchedResults searchResults={searchResults} onSelect={handleSelectUser} anchorRef={inputRef} />
                <div onClick={handleClose} className="absolute top-4 right-4 rounded-full p-1 hover:bg-gray-500 hover:bg-opacity-20 cursor-pointer">
                    <XMarkIcon className="w-5 h-5 text-white" />
                </div>

                {createPortal(<div className="theme-dark bg-[#0a090aea] bg-opacity-60 fixed h-screen w-screen top-0 left-0 z-40" onClick={handleClose}></div>, document.body)}



            </div>
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

export const SerchedResults = ({ searchResults, onSelect, anchorRef }: SerchedResultsProps) => {

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

