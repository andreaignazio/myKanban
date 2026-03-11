import { LabeledButtonPresetA, LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton";
import { MemberRow } from "@/components/common/MemberRow";
import { CustomInput } from "@/components/menuElements/CustomInput";
import { TopbarLite } from "@/components/TopbarLite";
import { useHydrateAuth } from "@/hooks/useHydrateAuth";
import { useJoinByToken } from "@/hooks/useJoinByToken";
import { useLogin } from "@/hooks/useLogin";
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import type { PublicShareLink, ShareLinkAccessMode, ShareLinkTokenEntityData, User } from "@/stores/types";
import { LockIcon, LockKeyholeOpen } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AsyncRequestHandler, type AsyncRequestHandle } from "@/components/asyncRequestHandlers/asyncRequestHandler";




export const JoinPageMain = () => {
    const [activeTab, setActiveTab] = useState<"welcome" | "signup" | "login" | "join">("welcome");

    const { isAuthenticated, currentUser } = useHydrateAuth();
    const token = useParams().shareID as string;
    const { entityData, shareLink } = useJoinByToken(token, isAuthenticated);


    return (
        <div className="theme-dark w-full h-screen bg-main flex flex-col">
            <TopbarLite isAuthenticated={isAuthenticated} />

            <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">

                {activeTab === "welcome" && (
                    <WelcomeTab entityData={entityData} isAuthenticated={isAuthenticated} setActiveTab={setActiveTab} />
                )}
                {activeTab === "signup" && (
                    <SignupTab setActiveTab={setActiveTab} />
                )}
                {activeTab === "login" && (
                    <LoginTab setActiveTab={setActiveTab} />
                )}
                {activeTab === "join" && (
                    <JoinTab User={currentUser as User} shareLink={shareLink} token={token} />
                )}
            </div>
        </div>
    );
}

type JoinTabProps = {
    // You can add props related to the joining process here, such as callbacks or data needed for joining
    User: User
    shareLink: PublicShareLink | null
    token: string;
}

const JoinTab = ({ User, shareLink, token }: JoinTabProps) => {

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
            await createBoardAccessRequest(shareLink.TargetID, "", "viewer");
        } else if (shareLink.TargetType === "workspace") {
            await createWorkspaceAccessRequest(shareLink.TargetID, "", "viewer");
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
        gap-4 rounded-3xl bg-menusec shadow-lg shadow-black/20 p-6 overflow-hidden">
            <AsyncRequestHandler
                onError={createRequestOnError}
                onSuccess={createRequestOnSuccess}
                ref={asycHandlerRef} />

            <Header mode={mode} />

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
        </div>
    )
}

type HeaderProps = {
    mode: ShareLinkAccessMode | undefined;
}

const Header = ({ mode }: HeaderProps) => {
    return (
        <div className="flex flex-col items-center gap-4">
            {mode === "autojoin" && <LockKeyholeOpen size={120}
                className="animate-pulse text-green-400" />}
            {mode === "sendrequest" && <LockIcon size={120}
                className="animate-pulse text-gray-200" />}
            <span className="text-md text-neutral-400 font-bold">
                The token you used is valid!
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
    setActiveTab: (tab: "welcome" | "signup" | "login" | "join") => void;
}
const WelcomeTab = ({ entityData, isAuthenticated, setActiveTab }: WelcomeTabProps) => {
    const handleLogout = () => {
        setActiveTab("login");
    }

    return (
        <div className="flex flex-col items-center gap-4 rounded-xl 
                bg-menu shadow-xl shadow-black/20 p-12">
            <h1 className="text-2xl font-bold text-white">Join a {entityData?.EntityType}</h1>
            <span className="text-lg text-white">You are going to join {entityData?.Name}</span>
            <p className="text-sm text-neutral-400">{entityData?.Description}</p>
            {!isAuthenticated ? (
                <LoginOrSignupPrompt setActiveTab={setActiveTab} />
            ) : (
                <div className="flex flex-col items-center gap-4 rounded-md bg-menusec shadow-lg shadow-black/20 p-6">
                    <div className="flex flex-col items-start gap-2">
                        <LabeledButtonPresetBSubmit label="Join Now" onClick={() => setActiveTab("join")} />
                    </div>
                    <div className="h-px w-full bg-neutral-700" />
                    <div className="flex flex-row items-center gap-4">
                        <LabeledButtonPresetBSubmit className="!bg-slate-300" label="Logout and Join with different account"
                            onClick={handleLogout}
                        />
                    </div>
                </div>)
            }
        </div>
    )

}

type SignupTabProps = {
    setActiveTab: (tab: "welcome" | "signup" | "login") => void;
}

const SignupTab = ({ setActiveTab }: SignupTabProps) => {
    return (
        <div className="flex flex-col items-center gap-4 rounded-md bg-menusec shadow-lg
         shadow-black/20 p-6">
            <div className="flex flex-col items-start gap-2">
                <h2 className="text-lg font-semibold text-white">Sign Up</h2>
                <span className="text-sm text-neutral-400">
                    Sign up functionality is not implemented yet
                </span>
            </div>
            <div className="h-px w-full bg-neutral-700" />
            <Footer setActiveTab={setActiveTab} />
        </div>
    )
}


type LoginTabProps = {
    setActiveTab: (tab: "welcome" | "signup" | "login") => void;

}
const LoginTab = ({ setActiveTab }: LoginTabProps) => {





    return (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-menusec shadow-lg shadow-black/20 p-6">
            <LoginForm onLoginSuccess={() => setActiveTab("welcome")} />
            <div className="h-px w-full bg-neutral-700" />
            <Footer setActiveTab={setActiveTab} />
        </div>
    )
}

type FooterProps = {
    setActiveTab?: (tab: "welcome" | "signup" | "login") => void;
}
const Footer = ({ setActiveTab }: FooterProps) => {
    return (
        <div className="flex flex-row items-center gap-4">
            <LabeledButtonPresetBSubmit
                label="Go to Sign Up"
                onClick={() => { setActiveTab?.("signup"); }} />
            <LabeledButtonPresetBSubmit
                className="!bg-slate-300"
                label="Back to Welcome"
                onClick={() => { setActiveTab?.("welcome"); }} />
        </div>
    )
}

type LoginFormProps = {
    onLoginSuccess: () => void;
}


export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
    const { handleLogin } = useLogin();

    const tempHandleLogin = () => {
        handleLogin(email)
        onLoginSuccess();
    }

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const isEmailSet = email.length > 0;

    const inputClassName = "!rounded-lg shadow-md shadow-black/20 "



    return (
        <div className="flex flex-col items-start gap-4">
            <h2 className="text-lg font-semibold text-white">Login</h2>
            <span className="text-sm text-neutral-400">
                Login functionality is not implemented yet
            </span>
            <CustomInput
                placeholder="Email"
                value={email}
                // danger={!isEmailValid}
                className={inputClassName}
                onInputChange={(input) => setEmail(input?.current?.value ?? "")}
            />
            <CustomInput
                placeholder="Password"
                // danger={!isPosswordSet}
                value={password}
                className={inputClassName}
                onInputChange={(input) => setPassword(input?.current?.value ?? "")}
            />
            <LabeledButtonPresetBSubmit
                label="Login"
                disabled={!isEmailSet}
                onClick={() => tempHandleLogin()} />
        </div>
    )
}

type LoginOrSignupPromptProps = {
    setActiveTab?: (tab: "welcome" | "signup" | "login") => void;
}
const LoginOrSignupPrompt = ({ setActiveTab }: LoginOrSignupPromptProps) => {
    return (
        <div className="flex flex-col items-center gap-4 rounded-md bg-menusec shadow-lg shadow-black/20 p-6">
            <div className="flex flex-col items-start gap-2">
                <h2 className="text-lg font-semibold text-white">Please log in or sign up</h2>
                <span className="text-sm text-neutral-400">You need an account to join and collaborate on boards</span>
            </div>
            <div className="h-px w-full bg-neutral-700" />
            <div className="flex flex-row items-center gap-4">
                <LabeledButtonPresetBSubmit label="Go to Login" onClick={() => { setActiveTab?.("login"); }} />
                <LabeledButtonPresetBSubmit className="!bg-slate-300" label="Sign Up" onClick={() => { setActiveTab?.("signup"); }} />
            </div>
        </div>
    )
}