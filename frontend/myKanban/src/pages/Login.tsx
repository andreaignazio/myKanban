import { Navigate, useLocation } from "react-router-dom";

export default function Login() {
    const location = useLocation()
    const redirectUrl = `${location.pathname}${location.search}`

    return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`} replace />
}