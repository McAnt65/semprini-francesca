"use client";
import { useEffect } from "react";
import { getUser, onAuthChange } from "@netlify/identity";

export default function IdentitySession() {
  useEffect(() => {
    // Restart the SDK refresh timer when reopening the application.
    void getUser();
    const unsubscribe = onAuthChange(event => {
      if (event === "logout" && !["/", "/accesso"].includes(window.location.pathname)) {
        window.location.replace("/accesso");
      }
    });
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restored);
    return () => { unsubscribe(); window.removeEventListener("pageshow", restored); };
  }, []);
  return null;
}
