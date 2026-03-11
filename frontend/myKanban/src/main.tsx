import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'

import { RouterProvider } from "react-router-dom";
import { router } from "./router/index.tsx";
import { ClerkAuthBridge } from "@/auth/ClerkAuthBridge";
import './index.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY")
}



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkAuthBridge />
      <RouterProvider router={router} />
    </ClerkProvider>
  </React.StrictMode>,
)