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
    <ClerkProvider publishableKey={clerkPublishableKey} appearance={{
      variables: {
        colorBackground: "#212126",
        colorNeutral: "white",
        colorPrimary: "#3f3f46",
        colorPrimaryForeground: "white",
        colorForeground: "white",
        colorInputForeground: "white",
        colorInput: "#26262B",
        colorInputBackground: "#26262B",
      },
      elements: {
        providerIcon__github: { filter: "invert(1)" },
        providerIcon__apple: { filter: "invert(1)" },
        input: { backgroundColor: "#26262B", color: "white" },
      },
    }}>
      <ClerkAuthBridge />
      <RouterProvider router={router} />
    </ClerkProvider>
  </React.StrictMode>,
)