import axios from "axios";
import { getSessionToken } from "@/auth/session";
import { getApiBaseURL } from "@/config/runtime";

export const api = axios.create({
    baseURL: getApiBaseURL()

})

api.defaults.headers.common['Content-Type'] = "application/json"

api.interceptors.request.use(async (config) => {
    const token = await getSessionToken()

    config.headers = config.headers ?? {}
    delete config.headers["x-userID"]

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }

    // Pass through caller-provided correlation ID; backend generates one if absent
    if (!config.headers["x-correlation-id"]) {
        delete config.headers["x-correlation-id"]
    }

    return config
})