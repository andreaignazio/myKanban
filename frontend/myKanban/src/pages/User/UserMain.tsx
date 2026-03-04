import { Outlet } from "react-router"

export const UserMainPage = () => {

    return (
        <div className="flex h-full">
            <Outlet />
        </div>
    )
}
