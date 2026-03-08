import { Outlet } from "react-router-dom";
import { AsideTabsBar, type AsideTabs } from "./asideTabs";

type WorkspaceSettingsPageWrapperProps = {
    asideHeader?: React.ReactNode;
    asideLinks: AsideTabs[];
    activeTab: string | null;
    handleNavigate: (e: React.MouseEvent<HTMLDivElement>, href: string) => void;
    mainHeader?: React.ReactNode;
    classNameLayout?: string;
    widthAside?: string;
}

export const SettingsPageWrapper = ({ asideHeader, asideLinks, activeTab, handleNavigate, mainHeader, classNameLayout, widthAside }: WorkspaceSettingsPageWrapperProps) => {

    return (
        <>

            <div className={`grid grid-cols-[1fr_6fr] gap-4 h-full mt-6 ${classNameLayout}`}>
                <div className=" ms-5 rounded-lg bg-transparent  h-full">
                    <div className="flex flex-row items-center justify-between gap-2 mb-12">
                        {asideHeader}
                    </div>

                    <AsideTabsBar asideLinks={asideLinks} activeTab={activeTab} handleNavigate={handleNavigate} width={widthAside} />

                </div>
                <div className="flex flex-col h-full px-12">
                    {mainHeader}

                </div>


            </div>
        </>
    )
}