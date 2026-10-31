"use client";

import { useEffect, useRef, useState } from "react";
import { acceptInvite, handleAuthCallback, login, logout, oauthLogin, updateUser } from "@netlify/identity";
import styles from "../impostazioni/settings.module.css";
import { authenticationFailure } from "./auth-feedback";
import { resumeSession } from "./resume-session";

export default function AccessoPage() {
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState<string>();
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Verifica dell’accesso…");

  async function enter() {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    if (response.ok) { window.location.replace("/benvenuto"); return; }
    if (response.status === 403) throw new Error("Questo account non è autorizzato. Esci e scegli l’account invitato.");
    if (response.status === 503) throw new Error("L’accesso è in preparazione. Riprova più tardi.");
    throw new Error("Accedi con l’account invitato per aprire il Registro.");
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await handleAuthCallback();
        if (result?.type === "invite" && result.token) {
          setInvite(result.token); setMessage("Scegli una password per accettare l’invito."); return;
        }
        if (result?.type === "recovery") { setRecovery(true); setMessage("Scegli la nuova password."); return; }
        if (await resumeSession()) {
          // Keep the explicit account-exit screen open instead of immediately
          // redirecting an authenticated visitor away from the logout control.
          if (new URLSearchParams(window.location.search).get("azione") === "esci") {
            setMessage("Sei già entrato. Premi “Esci dall’account” per terminare l’accesso.");
          } else await enter();
        } else setMessage("Accesso riservato all’account invitato.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Accesso momentaneamente non disponibile."); }
      finally { setBusy(false); }
    })();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      if (invite) await acceptInvite(invite, password);
      else if (recovery) await updateUser({ password });
      else await login(email, password);
    } catch (error) {
      setMessage(authenticationFailure(error, Boolean(invite)));
      setBusy(false);
      return;
    }
    // The invite is single-use: never offer to submit it again after acceptance,
    // even if the following server authorization or network request fails.
    setInvite(undefined); setRecovery(false); setPassword("");
    try { await enter(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Account verificato, ma il Registro non è ancora raggiungibile."); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}><div className={styles.sheet}>
    <h1>Il Registro di Francesca</h1>
    <p>Accedi al tuo Registro</p>
    <p role="status" aria-live="polite" className={styles.message}>{message}</p>
    <form onSubmit={submit} className={styles.form} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      {!invite && !recovery && <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <label>Password<input type="password" autoComplete={invite || recovery ? "new-password" : "current-password"} minLength={invite || recovery ? 12 : undefined} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">{invite ? "Accetta l’invito" : recovery ? "Salva password" : "Accedi"}</button>
    </form>
    {!invite && !recovery && <button type="button" disabled={busy} className={styles.helpLink} onClick={() => {
      try { oauthLogin("google"); } catch { setMessage("Accesso Google non disponibile. Controlla la configurazione dell’anteprima."); }
    }}>Accedi con Google</button>}
    <p><button type="button" disabled={busy} className={styles.helpLink} onClick={async () => {
      setBusy(true);
      try { await logout(); setMessage("Accesso terminato. I dati nel browser restano conservati."); }
      catch { setMessage("Uscita non completata. Riprova prima di lasciare il dispositivo."); }
      finally { setBusy(false); }
    }}>Esci dall’account</button></p>
    <p>Ambiente di prova: utilizzare soltanto dati fittizi.</p>
  </div></main>;
}
