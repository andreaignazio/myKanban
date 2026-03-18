import { LabeledButtonPresetA, LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton";
import { MemberRow } from "@/components/common/MemberRow";
import { TopbarLite } from "@/components/TopbarLite";
import { useHydrateAuth } from "@/hooks/useHydrateAuth";
import { useJoinByToken } from "@/hooks/useJoinByToken";
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import type { PublicShareLink, ShareLinkAccessMode, ShareLinkTokenEntityData, User } from "@/stores/types";
import { Handshake, LockIcon, LockKeyholeOpen, CalendarDays, UserRound, CircleArrowRight, ShieldX } from "lucide-react";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { AsyncRequestHandler, type AsyncRequestHandle } from "@/components/asyncRequestHandlers/asyncRequestHandler";

import { SignIn, useAuth, useClerk } from "@clerk/react";
import SpinningCircles from "react-loading-icons/dist/esm/components/spinning-circles";




export const JoinPageMain = () => {
    const [activeTab, setActiveTab] = useState<"welcome" | "join">("welcome");

    const { isAuthenticated, currentUser } = useHydrateAuth();
    const token = useParams().shareID as string;
    const { entityData, shareLink, error, isLoading: isDataLoading } = useJoinByToken(token, isAuthenticated);

    const { isSignedIn, isLoaded: clerkIsLoaded } = useAuth()

    const isLoading = !clerkIsLoaded || isDataLoading

    const effectiveTab = (!isLoading && error) ? "join" : activeTab

    return (
        <div className="theme-dark w-full h-screen bg-main flex flex-col">
            <TopbarLite isAuthenticated={isAuthenticated} />

            <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={effectiveTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                    >
                        {effectiveTab === "welcome" ? (
                            <WelcomeTab entityData={entityData} isAuthenticated={isSignedIn ?? false}
                                isLoading={isLoading}
                                setActiveTab={setActiveTab} />
                        ) : (
                            <JoinTab User={currentUser as User} shareLink={shareLink} token={token} error={error} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

type JoinTabProps = {
    User: User
    shareLink: PublicShareLink | null
    token: string;
    error?: string | null;
}

const JoinTab = ({ User, shareLink, token, error }: JoinTabProps) => {

    const navigate = useNavigate();
    const claimShareLinkByToken = useShareLinksStore((state) => state.claimShareLinkByToken);
    const fetchShareLinkAuthenticatedByToken = useShareLinksStore((state) => state.fetchShareLinkAuthenticatedByToken);
    const createBoardAccessRequest = useShareOffersStore((state) => state.createBoardAccessRequest);
    const createWorkspaceAccessRequest = useShareOffersStore((state) => state.createWorkspaceAccessRequest);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [isClaimed, setIsClaimed] = useState(false);
    const [isRequestingAccess] = useState(false);
    const [requestError] = useState<string | null>(null);
    const [isRequestSent] = useState(false);

    const mode = shareLink?.Mode;
    const entityType = shareLink?.TargetType;
    const requestSuccessLabel = entityType === "workspace" ? "Request sent to workspace admins" : "Request sent to board admins";

    const shareLinkRole = shareLink?.Role as "viewer" | "member" | "admin" | undefined;

    const handleClaimAccess = async () => {
        if (!token) return;
        setIsClaiming(true);
        setClaimError(null);
        const claimed = await claimShareLinkByToken(token);
        if (claimed) {
            setIsClaimed(true);

            const details = await fetchShareLinkAuthenticatedByToken(token);
            if (details?.EntityType === "board" && details.Board) {
                navigate(`/workspaces/${details.Board.WorkspaceID}/boards/${details.Board.ID}`);
                return;
            }
            if (details?.EntityType === "workspace" && details.Workspace) {
                navigate(`/workspaces/${details.Workspace.ID}`);
                return;
            }
            if (claimed.UserWorkspace) {
                navigate(`/workspaces/${claimed.UserWorkspace.WorkspaceID}`);
                return;
            }
        } else {
            setClaimError("Unable to claim access. Please try again.");
        }
        setIsClaiming(false);
    }

    const asycHandlerRef = useRef<AsyncRequestHandle>(null);

    const createRequest = async () => {
        if (!shareLink?.TargetID || !shareLink?.TargetType) return;

        if (shareLink.TargetType === "board") {
            await createBoardAccessRequest(shareLink.TargetID, "", (shareLinkRole === "member" || shareLinkRole === "viewer") ? shareLinkRole : "viewer");
        } else if (shareLink.TargetType === "workspace") {
            await createWorkspaceAccessRequest(shareLink.TargetID, "", shareLinkRole ?? "viewer");
        }
    }

    const createRequestOnError = () => {
        navigate(`/workspaces/`);
    }

    const createRequestOnSuccess = () => {
        navigate(`/workspaces/`);
    }


    const handleRequestAccess = () => {
        if (!shareLink?.TargetID || !shareLink?.TargetType) return;
        if (asycHandlerRef.current) {
            asycHandlerRef.current.execute(createRequest);
        }
    }



    return (
        <div className=" relative flex flex-col items-center
        gap-4 rounded-2xl bg-menusec shadow-lg shadow-black/20 p-6 overflow-hidden">
            <AsyncRequestHandler
                onError={createRequestOnError}
                onSuccess={createRequestOnSuccess}
                ref={asycHandlerRef} />

            <Header mode={mode} error={error} />

            {!error && <>
                <TokenDescription mode={mode} type={entityType} />
                <div className="h-px w-full bg-neutral-700" />

                <UserLoggedInInfo user={User} />

                <span className="text-xs max-w-[400px] text-neutral-600 mt-1">
                    Requesting access to the {entityType === "workspace" ? "workspace" : "board"} you accept to share your name and email
                    with the {entityType === "workspace" ? "workspace" : "board"} admins.
                    Admins will be able to see your profile picture,
                    name and email when they review your request.
                </span>
                {mode === "sendrequest" && <LabeledButtonPresetBSubmit className="!w-full !h-10 !rounded-lg"
                    label={isRequestingAccess ? "Sending Request..." : isRequestSent ? requestSuccessLabel : "Request Access"}
                    disabled={isRequestingAccess || isRequestSent}
                    onClick={handleRequestAccess} />}

                {mode === "autojoin" && <LabeledButtonPresetBSubmit className="!w-full !h-10 !rounded-lg"
                    label={isClaiming ? "Claiming..." : isClaimed ? "Access Claimed" : "Claim Access"}
                    disabled={isClaiming || isClaimed}
                    onClick={handleClaimAccess} />}

                {claimError && <span className="text-xs text-red-400">{claimError}</span>}
                {requestError && <span className="text-xs text-red-400">{requestError}</span>}
            </>}
        </div>
    )
}

type HeaderProps = {
    mode: ShareLinkAccessMode | undefined;
    error?: string | null;
}

const Header = ({ mode, error }: HeaderProps) => {
    return (
        <div className="flex flex-col items-center gap-4">
            {error ? (
                <ShieldX size={120} className="text-red-400 opacity-70 animate-pulse" />
            ) : (
                <>
                    {mode === "autojoin" && <LockKeyholeOpen size={120}
                        className="animate-pulse text-green-400" />}
                    {mode === "sendrequest" && <LockIcon size={120}
                        className="animate-pulse text-gray-200" />}
                </>
            )}
            <span className="text-md text-neutral-400 font-bold">
                {error ? "Token is not valid or is expired" : "The token you used is valid!"}
            </span>
        </div>
    )
}

type TokenDescriptionProps = {
    mode: ShareLinkAccessMode | undefined;
    type: string | undefined;
}
const TokenDescription = ({ mode, type }: TokenDescriptionProps) => {

    const entityType = type === "board" ? "board" : "workspace";

    return (
        <span className={`text-sm max-w-[400px] font-medium
        
        ${mode === "sendrequest"
                ? "text-neutral-500"
                : "text-neutral-400/80"} 
        
        text-start`}>
            {mode === "sendrequest" && ` Admins of the ${entityType} have to approve your request before you can access the ${entityType}.
            You will receive a notification once your request is approved.`}
            {mode === "autojoin" && ` Admins of the ${entityType} have set the share link to autojoin,
             which means you will get immediate access to the ${entityType} without needing approval!`}
        </span>
    )

}




const UserLoggedInInfo = ({ user }: { user: User }) => {

    return (
        <div className="flex flex-col w-full items-start gap-2">
            <div className="flex w-full flex-row items-center justify-between gap-4">
                <span className="text-neutral-400/80 text-xs">You are logged in as</span>
                <LabeledButtonPresetA className="text-neutral-300/50 text-xs !bg-transparent hover:!bg-slate-500/20"
                    label="Change Account" onClick={() => { }} />
            </div>
            <MemberRow user={user}
                rowClassName="!bg-slate-500/20"
            />
        </div>)

}






type WelcomeTabProps = {
    entityData: ShareLinkTokenEntityData | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setActiveTab: (tab: "welcome" | "join") => void;
}
const WelcomeTab = ({ entityData, isAuthenticated, isLoading, setActiveTab }: WelcomeTabProps) => {
    const { signOut } = useClerk()
    const { shareID } = useParams()
    const [view, setView] = useState<"info" | "login">("info")

    const redirectUrl = `${window.location.origin}/sharelinks/join/${shareID}`

    const handleLogout = () => {
        void signOut({ redirectUrl })
    }

    return (
        <motion.div
            layout
            layoutDependency={view}
            transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
            className={`relative w-[clamp(400px,60vw,600px)] overflow-hidden
            ${isAuthenticated && !isLoading
                    ? "bg-gradient-to-tr from-[#202022] to-[#37373f] ring-blue-400 ring-2"
                    : "bg-zinc-800/80"}
            flex flex-col items-center gap-4 rounded-3xl bg-menu shadow-lg shadow-black/20 p-8 pt-12`}>

            <div className={`${isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}
                flex flex-col items-center justify-center
                transition-all duration-300 ease-in-out
                absolute inset-0 rounded-3xl bg-[#202022] z-20`}>
                <SpinningCircles width="48" height="48" className="text-blue-500" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {view === "info" ? (
                    <motion.div
                        key="info"
                        className="flex flex-col items-center gap-4 w-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        <Handshake size={180} className="text-zinc-200" strokeWidth={1} />
                        <div className="flex flex-col w-full px-2 pt-4 items-start justify-start gap-2">
                            <h1 className="text-3xl font-grotesk font-extrabold text-zinc-100">Join a {entityData?.EntityType}</h1>
                            <div className="flex flex-row items-center gap-2">
                                <span className="text-lg text-zinc-400">You are going to join </span>
                                <span className="text-lg font-bold text-zinc-300">{entityData?.Name}</span>
                            </div>
                            {entityData?.Description && <p className="text-sm text-neutral-400">{entityData?.Description}</p>}
                            <EntityMeta createdAt={entityData?.CreatedAt} ownerName={entityData?.OwnerName} />
                        </div>
                        {!isAuthenticated ? (
                            <div className="flex flex-col items-center gap-4 rounded-xl bg-zinc-900/50 p-6 w-full">
                                <div className="flex flex-col items-start gap-2 w-full">
                                    <h2 className="text-lg font-semibold text-white">Please log in or sign up</h2>
                                    <span className="text-sm text-neutral-400">You need an account to join and collaborate on boards</span>
                                </div>
                                <div className="h-px w-full bg-neutral-700" />
                                <div className="flex flex-row items-start justify-end w-full">
                                    <LabeledButtonPresetBSubmit
                                        className="!h-12 !rounded-2xl !bg-sky-500/80 hover:!bg-sky-500/100 !text-zinc-100"
                                        label="Go to Login"
                                        onClick={() => setView("login")} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 rounded-xl bg-zinc-900/50 p-6 w-full">
                                <LabeledButtonPresetBSubmit
                                    className="transition-all duration-200 ease-in-out hover:shadow-md hover:shadow-sky-500/50
                                        !h-12 !rounded-2xl !bg-sky-500/80 hover:!bg-sky-500/100 !text-zinc-100"
                                    label="Join Now" onClick={() => setActiveTab("join")}>
                                    <CircleArrowRight className="w-5 h-5 ms-2" />
                                </LabeledButtonPresetBSubmit>
                                <div className="h-px w-full bg-neutral-700" />
                                <LabeledButtonPresetBSubmit
                                    className="!bg-zinc-800 !text-zinc-400 hover:!bg-zinc-800/80"
                                    label="Logout and Join with different account"
                                    onClick={handleLogout} />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    !isLoading && (<motion.div
                        key="login"
                        className="flex flex-col items-center gap-3 mx-2 w-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        <SignIn
                            routing={"virtual" as "hash"}
                            signUpUrl={import.meta.env.VITE_CLERK_SIGN_UP_URL ?? "/sign-up"}
                            fallbackRedirectUrl={redirectUrl}
                        />
                        <LabeledButtonPresetBSubmit
                            className="!bg-zinc-800 !text-zinc-400 hover:!bg-zinc-800/80 !w-full"
                            label="← Back"
                            onClick={() => setView("info")} />
                    </motion.div>)
                )}
            </AnimatePresence>
        </motion.div>
    )
}



const EntityMeta = ({ createdAt, ownerName }: { createdAt?: string; ownerName?: string }) => {
    const dateParser = useDateTimeParser()
    const formatted = createdAt ? dateParser.stringifyDatePretty(new Date(createdAt), true)?.date : undefined
    if (!formatted && !ownerName) return null
    return (
        <div className="flex flex-row items-center gap-4 mt-1">
            {ownerName && (
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                    <UserRound className="w-3 h-3" />
                    {ownerName}
                </span>
            )}
            {formatted && (
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                    <CalendarDays className="w-3 h-3" />
                    {formatted}
                </span>
            )}
        </div>
    )
}

