import axios from "axios";
import { useAuthStore } from "@/stores/auth";

export const api = axios.create({
    baseURL: '/api'

})

api.defaults.headers.common['Content-Type'] = "application/json"

api.interceptors.request.use((config) => {
    const { userID } = useAuthStore.getState()
    const storedUserId = localStorage.getItem("userID")
    const resolvedUserId = userID ?? storedUserId

    if (resolvedUserId) {
        config.headers = config.headers ?? {}
        config.headers["x-userID"] = resolvedUserId
    }

    return config
})