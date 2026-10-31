"use client";
import { useEffect, useRef } from "react";

// OAuth and invitation links land on /. Hand off the fragment without logging it.
export default function IdentityCallback() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (/(?:access_token|invite_token|recovery_token|confirmation_token|email_change_token|error)=/.test(window.location.hash)) {
      window.location.replace("/accesso" + window.location.hash);
    }
  }, []);
  return null;
}
