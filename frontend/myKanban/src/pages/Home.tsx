import { BoardBackgroundTransition, type BoardBackgroundSpec } from "@/components/BoardView/BoardBackgroundTransition"
import { MemberRow } from "@/components/common/MemberRow"

import { useAuthStore } from "@/stores/auth"
import { useAuth } from "@clerk/react"
import { useUiStore } from "@/stores/uiStore"

import { NotebookPen, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
export default function Home() {

    const bgUrl = useUiStore((state) => state.sessionLandingBgUrl)
    const targetBg: BoardBackgroundSpec = { kind: "image", url: bgUrl }

    const currentUser = useAuthStore((state) => state.user)
    const isSignedIn = useAuth().isSignedIn
    const navigate = useNavigate()

    const handleNavigate = () => {
        if (isSignedIn) {
            navigate("/workspaces")
        } else {
            navigate("/sign-in")
        }

    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-8">

            <div className="absolute inset-0 w-full h-full -z-0">
                <BoardBackgroundTransition target={targetBg} />
            </div>

            <WelcomeCard onClick={handleNavigate} isSignedIn={isSignedIn} />

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
}

const WelcomeCard = ({ onClick, isSignedIn }: WelcomeCardProps) => {

    const resolvedLabel = isSignedIn ? "Go to Workspaces" : "Login"


    return (
        <div className=" w-[400px] h-[550px] bg-zinc-700/50
        items-center justify-center shadow-lg shadow-black/10
        flex flex-col gap-12 rounded-[48px] backdrop-blur-md">
            <div className="flex flex-col justify-center items-center gap-4">
                <h1 className="text-4xl font-bold text-gray-200 text-center">Welcome to MyKanban</h1>
                <p className="text-center text-md max-w-[300px] text-gray-300">Organize your tasks and projects with ease using MyKanban, the ultimate task management tool.</p>
            </div>

            <div onClick={onClick}
                className=" aspect-square
                group flex flex-col gap-3 p-6 transition-all duration-300
             ease-in-out cursor-pointer bg-gradient-to-tr from-sky-600 to-sky-400
             hover:bg-sky-500
            hover:shadow-lg hover:shadow-sky-500/50
            hover:-translate-y-1
            text-white font-bold rounded-[38px]  items-center">
                {!isSignedIn && <User size={48} className="group-hover:scale-[1.1] transition-all duration-300 ease-in-out" />}
                {isSignedIn && <NotebookPen size={48} className="group-hover:scale-[1.1] transition-all duration-300 ease-in-out" />}
                {resolvedLabel}
            </div>
        </div>
    )
}
