import { Navigate, createBrowserRouter, useParams } from "react-router-dom";


import Home from "@/pages/Home"
import AppLayout from "@/layouts/AppLayout"
import Login from "@/pages/Login";
import BoardView from "@/pages/BoardView"
import { WorkspaceView } from "@/pages/WorkspaceView";
import { WorkspaceMembers } from "@/pages/WorkspaceMembers";
import { WorkspaceMembersMain } from "@/pages/WorkspaceMembersMain";
import { WorkspaceOutbox } from "@/pages/WorkspaceOutbox";
import { WorkspaceInbox } from "../pages/WorkspaceInbox";

import { WorkspaceLinks } from "@/pages/WorkspaceLinks";
import { UserActivity } from "@/pages/User/UserActivityPage";
import { UserCardsPage } from "@/pages/User/userCards";
import { UserMainPage } from "@/pages/User/UserMain";
import { UserProfilePage } from "@/pages/User/userProfile";
import { UserWatchedPage } from "@/pages/User/userWatched";
import { WorkspaceSettingsMain } from "@/pages/WorkspaceSettings/WorkspaceSettingsMain";
import { SubscriptionFailedPage } from "@/pages/WorkspaceSettings/SubscriptionFailed";
import { SubscriptionSuccessPage } from "@/pages/WorkspaceSettings/SubscriptionSuccess";
import { WorkspaceSubscriptions } from "@/pages/WorkspaceSettings/WorkspaceSubscriptions";
import { WorkspaceSettings } from "@/pages/WorkspaceSettings/WorkspaceSettings";
import { WorkspacesLanding } from "@/pages/WorkspacesLanding";
import { JoinPageMain } from "@/pages/Join/joinPageMain";
import { WorkspaceSubscriptionMain } from "@/pages/WorkspaceSettings/WorkspaceSubscriptionMain";
import { WorkspaceSubscriptionManage } from "@/pages/WorkspaceSettings/WorkspaceSubscriptionManage";


function WorkspaceIndexRedirect() {
    const { workspaceId } = useParams();
    return <Navigate to={`/workspaces/${workspaceId}/boards`} replace />;
}



export const router = createBrowserRouter([
    {

        element: <AppLayout />,
        children: [
            { path: "/", element: <Home /> },

            { path: "/login", element: <Login /> },
            {
                path: "/workspaces/:workspaceId/boards/:boardId", element: <BoardView />, children: [
                    { path: "cards/:cardId", element: null }
                ]
            },

            {
                path: "/workspaces/:workspaceId/boards", element: <WorkspaceView />, children: [

                ]
            },
            { path: "/workspaces/:workspaceId", element: <WorkspaceIndexRedirect /> },
            { path: "/workspaces", element: <WorkspacesLanding /> },
            {
                path: "/workspaces/:workspaceId/settings", element: <WorkspaceSettingsMain />, children: [
                    { path: "", element: <WorkspaceSettings /> },
                    {
                        path: "subscription", element: <WorkspaceSubscriptionMain />, children: [
                            { path: "upgrade", element: <WorkspaceSubscriptions /> },
                            { path: "", element: <WorkspaceSubscriptionManage /> }
                        ]
                    },
                    { path: "subscription/failed", element: <SubscriptionFailedPage /> },
                    { path: "subscription/success", element: <SubscriptionSuccessPage /> },
                ]
            },
            {
                path: "/workspaces/:workspaceId/members", element: <WorkspaceMembers />, children: [
                    { path: "", element: <WorkspaceMembersMain /> },
                    { path: "outbox", element: <WorkspaceOutbox /> },
                    { path: "inbox", element: <WorkspaceInbox /> },
                    { path: "guests", element: <WorkspaceMembersMain /> },
                    { path: "links", element: <WorkspaceLinks /> },

                ]
            },
            { path: "/workspaces/:workspaceId/users/:userID/activities", element: null },
            {
                path: "/users/me", element: <UserMainPage />, children: [
                    { index: true, element: <Navigate to="activities" replace /> },
                    { path: "profile", element: <UserProfilePage /> },
                    { path: "activities", element: <UserActivity /> },
                    { path: "cards", element: <UserCardsPage /> },
                    { path: "watched", element: <UserWatchedPage /> },
                ]
            },
            { path: "/users/:userID/*", element: <Navigate to="/users/me/activities" replace /> },
            { path: "/user", element: <Navigate to="/users/me/activities" replace /> },
            { path: "/user/profile", element: <Navigate to="/users/me/profile" replace /> },
            { path: "/user/activities", element: <Navigate to="/users/me/activities" replace /> },
            { path: "/user/cards", element: <Navigate to="/users/me/cards" replace /> },
            { path: "/user/watched", element: <Navigate to="/users/me/watched" replace /> },
            { path: "/users", element: <Navigate to="/users/me/activities" replace /> },



        ],
    },
    {
        path: "/sharelinks/join/:shareID", element: <JoinPageMain />, children: [
            { path: "", element: <JoinPageMain /> }


        ]
    }


]);