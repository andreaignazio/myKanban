
import { api } from "@/api/api";
import { useAuthStore } from "@/stores/auth";
import { useState } from "react";





export default function Login() {
    const [username, setUsername] = useState("")

    const setUserId = useAuthStore((state) => state.setUserID)

    function handleLogin(userID: string) {
        setUserId(userID)
        localStorage.setItem("userID", userID)
        api.defaults.headers.common["x-userID"] = userID
    }
    return (
        <>
            <p>Login Page</p>
            <input type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} />

            <button onClick={() => handleLogin(username)}>Login</button>

        </>

    )
}