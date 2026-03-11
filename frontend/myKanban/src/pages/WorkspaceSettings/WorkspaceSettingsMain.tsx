import { Outlet } from "react-router-dom"



export const WorkspaceSettingsMain = () => {



    return (
        <div className="flex flex-col gap-2 min-h-0 h-screen overflow-hidden pb-8 pr-1">


            <Outlet />
        </div>
    )
}


