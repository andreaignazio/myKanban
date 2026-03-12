import { BoardBackgroundTransition, type BoardBackgroundSpec } from "@/components/BoardView/BoardBackgroundTransition"
import { MemberRow } from "@/components/common/MemberRow"

import { useAuthStore } from "@/stores/auth"
import { useAuth } from "@clerk/react"
import { useUiStore } from "@/stores/uiStore"

import { Building2, NotebookPen, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { WorkspaceCreateWizard } from "@/components/WorkspaceCreate/WorkspaceCreateWizard"
import { useWorkspaceStore } from "@/stores/workspaceStore"
export default function Home() {

    const bgUrl = useUiStore((state) => state.sessionLandingBgUrl)
    const targetBg: BoardBackgroundSpec = { kind: "image", url: bgUrl }

    const currentUser = useAuthStore((state) => state.user)
    const isSignedIn = useAuth().isSignedIn
    const navigate = useNavigate()
    let isAnyWorkspaceAvailable = useWorkspaceStore((state) => state.isAnyWorkspaceAvailabe())
    //isAnyWorkspaceAvailable = false
    const handleNavigate = () => {
        if (isSignedIn) {
            if (isAnyWorkspaceAvailable) {
                navigate("/workspaces")
            } else {
                return
            }

        } else {
            navigate("/sign-in")
        }

    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-8">

            <div className="absolute inset-0 w-full h-full -z-0">
                <BoardBackgroundTransition target={targetBg} />
            </div>

            <WelcomeCard onClick={handleNavigate}
                isAnyWorkspaceAvailable={isAnyWorkspaceAvailable}
                isSignedIn={isSignedIn} />

            <div className="absolute bottom-4">
                {currentUser ? (
                    <MemberRow
                        rowClassName="backdrop-blur-sm bg-zinc-500/50"
                        user={currentUser} showRole={false} />
                ) : (
                    <div className="text-sm text-gray-300">Please sign in to access your boards and workspaces.</div>
                )}
            </div>
        </div>
    )
}
type WelcomeCardProps = {
    onClick: () => void;
    isSignedIn?: boolean;
    isAnyWorkspaceAvailable?: boolean;
}

const WelcomeCard = ({ onClick, isSignedIn, isAnyWorkspaceAvailable }: WelcomeCardProps) => {

    const resolvedLabel = isSignedIn ? isAnyWorkspaceAvailable ? "Go to Workspaces" : "Create workspace" : "Login"


    return (
        <div className=" w-[400px] h-[550px] bg-zinc-700/50
        items-center justify-center shadow-lg shadow-black/10
        flex flex-col gap-12 rounded-[48px] backdrop-blur-md">
            <div className="flex flex-col justify-center items-center gap-4">
                <h1 className="text-4xl font-bold text-gray-200 text-center">Welcome to MyKanban</h1>
                <p className="text-center text-md max-w-[300px] text-gray-300">Organize your tasks and projects with ease using MyKanban, the ultimate task management tool.</p>
            </div>

            <StartButton onClick={onClick} isSignedIn={isSignedIn} isAnyWorkspaceAvailable={isAnyWorkspaceAvailable} resolvedLabel={resolvedLabel} />
        </div>
    )
}

const StartButton = ({ onClick, isSignedIn, isAnyWorkspaceAvailable, resolvedLabel }: { onClick: () => void; isSignedIn?: boolean; isAnyWorkspaceAvailable?: boolean; resolvedLabel: string }) => {
    const wizardId = "create-workspace-wizard"
    const exclusiveGroup = "home-page-wizards"

    return (
        <CardRowMenuBtn
            disableClick={isSignedIn && isAnyWorkspaceAvailable}
            exclusiveGroup={exclusiveGroup}
            customId={wizardId}
            renderType="virtual"
            menuComponent={
                ({ onClose, ref }) => <WorkspaceCreateWizard onClose={onClose} ref={ref} />
            }
        >
            <div onClick={onClick}
                className=" group w-32 h-32  justify-center items-center
                group flex flex-col gap-3 p-6 transition-all duration-300
             ease-in-out cursor-pointer bg-gradient-to-tr from-sky-600 to-sky-400
             hover:bg-sky-500
            hover:shadow-lg hover:shadow-sky-500/50
            hover:-translate-y-1 text-sm text-center
            text-white font-bold rounded-[38px]  ">
                <div className="group-hover:opacity-0 transition-opacity duration-300 ease-in-out absolute">
                    {!isSignedIn && <User size={48} className="group-hover:scale-[1.1] transition-all duration-300 ease-in-out" />}
                    {(isSignedIn && !isAnyWorkspaceAvailable) && <NotebookPen size={48} className="group-hover:scale-[1.1] transition-all duration-300 ease-in-out" />}
                    {(isSignedIn && isAnyWorkspaceAvailable) && <Building2 size={48} className="group-hover:scale-[1.1] transition-all duration-300 ease-in-out" />}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
                    {resolvedLabel}
                </div>
            </div>
        </CardRowMenuBtn>
    )
}