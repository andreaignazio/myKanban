import { api } from "@/api/api"
import { useAuthStore } from "@/stores/auth"

export function useLogin() {
    const setUserId = useAuthStore((state) => state.setUserID)

    function handleLogin(userID: string) {
        setUserId(userID)
        localStorage.setItem("userID", userID)
        api.defaults.headers.common["x-userID"] = userID
    }

    return {
        handleLogin
    }
}