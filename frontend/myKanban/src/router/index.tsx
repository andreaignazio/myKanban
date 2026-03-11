import type { ReactElement } from "react";
import { Navigate, createBrowserRouter, useParams } from "react-router-dom";


import Home from "@/pages/Home"
import AppLayout from "@/layouts/AppLayout"
import Login from "@/pages/Login";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
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
import { RequireAuth } from "@/router/RequireAuth";


function WorkspaceIndexRedirect() {
    const { workspaceId } = useParams();
    return <Navigate to={`/workspaces/${workspaceId}/boards`} replace />;
}

function withAuth(element: ReactElement) {
    return <RequireAuth>{element}</RequireAuth>;
}



export const router = createBrowserRouter([
    {

        element: <AppLayout />,
        children: [
            { path: "/", element: <Home /> },

            { path: "/login", element: <Login /> },
            { path: "/sign-in/*", element: <SignInPage /> },
            { path: "/sign-up/*", element: <SignUpPage /> },
            {
                path: "/workspaces/:workspaceId/boards/:boardId", element: withAuth(<BoardView />), children: [
                    { path: "cards/:cardId", element: null }
                ]
            },

            {
                path: "/workspaces/:workspaceId/boards", element: withAuth(<WorkspaceView />), children: [

                ]
            },
            { path: "/workspaces/:workspaceId", element: withAuth(<WorkspaceIndexRedirect />) },
            { path: "/workspaces", element: withAuth(<WorkspacesLanding />) },
            {
                path: "/workspaces/:workspaceId/settings", element: withAuth(<WorkspaceSettingsMain />), children: [
                    { path: "", element: withAuth(<WorkspaceSettings />) },
                    {
                        path: "subscription", element: withAuth(<WorkspaceSubscriptionMain />), children: [
                            { path: "upgrade", element: withAuth(<WorkspaceSubscriptions />) },
                            { path: "", element: withAuth(<WorkspaceSubscriptionManage />) }
                        ]
                    },
                    { path: "subscription/failed", element: withAuth(<SubscriptionFailedPage />) },
                    { path: "subscription/success", element: withAuth(<SubscriptionSuccessPage />) },
                ]
            },
            {
                path: "/workspaces/:workspaceId/members", element: withAuth(<WorkspaceMembers />), children: [
                    { path: "", element: withAuth(<WorkspaceMembersMain />) },
                    { path: "outbox", element: withAuth(<WorkspaceOutbox />) },
                    { path: "inbox", element: withAuth(<WorkspaceInbox />) },
                    { path: "guests", element: withAuth(<WorkspaceMembersMain />) },
                    { path: "links", element: withAuth(<WorkspaceLinks />) },

                ]
            },
            { path: "/workspaces/:workspaceId/users/:userID/activities", element: null },
            {
                path: "/users/me", element: withAuth(<UserMainPage />), children: [
                    { index: true, element: <Navigate to="activities" replace /> },
                    { path: "profile", element: withAuth(<UserProfilePage />) },
                    { path: "activities", element: withAuth(<UserActivity />) },
                    { path: "cards", element: withAuth(<UserCardsPage />) },
                    { path: "watched", element: withAuth(<UserWatchedPage />) },
                ]
            },
            { path: "/users/:userID/*", element: withAuth(<Navigate to="/users/me/activities" replace />) },
            { path: "/user", element: withAuth(<Navigate to="/users/me/activities" replace />) },
            { path: "/user/profile", element: withAuth(<Navigate to="/users/me/profile" replace />) },
            { path: "/user/activities", element: withAuth(<Navigate to="/users/me/activities" replace />) },
            { path: "/user/cards", element: withAuth(<Navigate to="/users/me/cards" replace />) },
            { path: "/user/watched", element: withAuth(<Navigate to="/users/me/watched" replace />) },
            { path: "/users", element: withAuth(<Navigate to="/users/me/activities" replace />) },



        ],
    },
    {
        path: "/sharelinks/join/:shareID", element: <JoinPageMain />, children: [
            { path: "", element: <JoinPageMain /> }


        ]
    }


]);