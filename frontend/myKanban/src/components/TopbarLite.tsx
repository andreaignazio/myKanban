import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/userStore";
import { UserAvatarDummy } from "./badges/UserAvatarDummy";

type TopbarLiteProps = {
    isAuthenticated: boolean;
}

export function TopbarLite({ isAuthenticated }: TopbarLiteProps) {
    const userID = useAuthStore((state) => state.userID);
    const authUser = useAuthStore((state) => state.user);
    const clearAuthSession = useAuthStore((state) => state.clearAuthSession);
    const userFromStore = useUserStore((state) => (userID ? state.usersById[userID] : undefined));
    const currentUser = authUser ?? userFromStore;

    return (
        <header className="w-full h-14 px-4 md:px-6 flex items-center justify-between bg-main border-b border-white/10">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-white/20 text-white text-sm font-semibold flex items-center justify-center">
                    K
                </div>
                <span className="text-white font-semibold tracking-tight">myKanban</span>
            </div>

            {isAuthenticated && userID ? (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={clearAuthSession}
                        className="text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        Logout
                    </button>
                    <UserAvatarDummy user={currentUser} size={32} disableHoverEffect />
                </div>
            ) : (
                <div className="w-8 h-8" />
            )}
        </header>
    );
}
