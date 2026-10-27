"use client";

import { Toaster } from "sonner";

export function Providers() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "#12121b",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#f4f4f8",
        },
      }}
    />
  );
}
