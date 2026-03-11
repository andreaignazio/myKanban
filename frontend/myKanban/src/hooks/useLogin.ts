import { useNavigate } from "react-router-dom"

export function useLogin() {
    const navigate = useNavigate()

    function handleLogin(_hint?: string) {
        navigate("/sign-in")
    }

    return {
        handleLogin
    }
}