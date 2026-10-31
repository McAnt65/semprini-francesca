"use client";
import { useEffect } from "react";
import { onAuthChange } from "@netlify/identity";
import { resumeSession } from "../accesso/resume-session";

export default function IdentitySession() {
  useEffect(() => {
    // Restart the SDK refresh timer when reopening the application.
    const resume = () => { void resumeSession().catch(() => { /* Server authorization remains mandatory. */ }); };
    resume();
    const visible = () => { if (document.visibilityState === "visible") resume(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", resume);
    const unsubscribe = onAuthChange(event => {
      if (event === "logout" && !["/", "/accesso"].includes(window.location.pathname)) {
        window.location.replace("/accesso");
      }
    });
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restored);
    return () => {
      unsubscribe(); window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", resume);
    };
  }, []);
  return null;
}
