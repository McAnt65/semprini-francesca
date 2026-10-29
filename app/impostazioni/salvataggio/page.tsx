"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collectArchives, type BrowserArchives } from "../../data/backup/archives";
import { cryptoAvailable, decryptBackup, encryptBackup } from "../../data/backup/encryption";
import { makePayload, summarize, type BackupPayload, type BackupSummary } from "../../data/backup/format";
import { prepareRestore, restoreArchives, validateSafetyExport } from "../../data/backup/restore";
import packageInfo from "../../../package.json";
import styles from "./salvataggio.module.css";

const APP_VERSION = packageInfo.version;

async function fingerprint(archives: BrowserArchives): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(archives));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function download(content: string, createdAt: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `registro-francesca-${createdAt.replace(/[:.]/g, "-")}.frbackup`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function Counts({ summary }: { summary: BackupSummary }) {
  return <dl className={styles.counts}>
    <div><dt>Studenti</dt><dd>{summary.students}</dd></div>
    <div><dt>Lezioni singole</dt><dd>{summary.appointments}</dd></div>
    <div><dt>Ricorrenze</dt><dd>{summary.series}</dd></div>
    <div><dt>Richieste</dt><dd>{summary.requests}</dd></div>
    <div><dt>Movimenti di pagamento</dt><dd>{summary.paymentMovements}</dd></div>
    <div><dt>Tariffe</dt><dd>{summary.tariffs}</dd></div>
    <div><dt>Programmi</dt><dd>{summary.programs}</dd></div>
    <div><dt>Programmi eliminati conservati</dt><dd>{summary.deletedPrograms}</dd></div>
    <div><dt>Argomenti nel catalogo</dt><dd>{summary.topics}</dd></div>
    <div><dt>Appunti delle materie</dt><dd>{summary.subjectNotes}</dd></div>
    <div><dt>Note mensili</dt><dd>{summary.monthlyNotes}</dd></div>
    <div><dt>Fotografie legacy conservate</dt><dd>{summary.legacyPhotos}</dd></div>
    <div><dt>Chiavi temporanee</dt><dd>{summary.temporaryKeys}</dd></div>
    <div><dt>Chiavi applicative sconosciute</dt><dd>{summary.unknownKeys}</dd></div>
  </dl>;
}

export default function BackupPage() {
  const [current, setCurrent] = useState<BackupSummary | null>(null);
  const [prepared, setPrepared] = useState<BackupPayload | null>(null);
  const [preview, setPreview] = useState<BackupSummary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [safetyFingerprint, setSafetyFingerprint] = useState("");
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    collectArchives().then((archives) => {
      if (active) setCurrent(summarize(makePayload(archives, APP_VERSION)));
    }).catch(() => { if (active) setMessage("Non riesco a leggere tutti gli archivi: una copia completa non è disponibile in questo browser."); });
    return () => { active = false; };
  }, []);

  async function createCopy() {
    setMessage(""); setBusy(true);
    try {
      if (backupPassword !== repeatPassword) throw new Error("Le due password non coincidono.");
      const archives = await collectArchives();
      const payload = makePayload(archives, APP_VERSION);
      const validation = validateSafetyExport(payload);
      const content = await encryptBackup(payload, backupPassword);
      download(content, payload.createdAt);
      setCurrent(summarize(payload));
      setSafetyFingerprint(await fingerprint(archives));
      setSafetyConfirmed(false);
      setBackupPassword(""); setRepeatPassword("");
      setMessage(validation.studentConflict
        ? "Download avviato: il file cifrato conserva entrambe le copie discordanti. Controlla che sia stato salvato e conserva la password. Il ripristino automatico resta bloccato finché il conflitto non è risolto."
        : "Download avviato. Controlla che il file sia stato salvato e conserva la password.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Copia non riuscita."); }
    finally { setBusy(false); }
  }

  async function verifyFile() {
    setMessage(""); setPrepared(null); setPreview(null); setBusy(true);
    try {
      if (!selectedFile) throw new Error("Seleziona un file di backup.");
      const payload = await decryptBackup(await selectedFile.text(), restorePassword);
      const plan = prepareRestore(payload);
      const result = summarize(payload);
      setPrepared(payload); setPreview(result);
      setReplaceConfirmed(false);
      setMessage(`File verificato. ${plan.promotedKeys.length} copie temporanee saranno rese permanenti; le chiavi sconosciute restano solo nel file.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verifica non riuscita."); }
    finally { setBusy(false); }
  }

  async function restore() {
    setMessage(""); setBusy(true);
    try {
      if (!prepared || !safetyFingerprint || !safetyConfirmed || !replaceConfirmed)
        throw new Error("Scarica e conferma la copia attuale, poi conferma la sostituzione.");
      const currentArchives = await collectArchives();
      if (await fingerprint(currentArchives) !== safetyFingerprint)
        throw new Error("I dati correnti sono cambiati: crea una nuova copia di sicurezza prima di ripristinare.");
      if (!window.confirm("Sostituire gli archivi operativi con quelli del file verificato?")) {
        setMessage("Ripristino annullato. Nessun dato modificato."); return;
      }
      await restoreArchives(prepared, currentArchives);
      setPrepared(null); setPreview(null); setRestorePassword("");
      setSafetyFingerprint(""); setSafetyConfirmed(false); setReplaceConfirmed(false);
      setMessage("Ripristino completato e scritture verificate. Ricarica il Registro per vedere i dati.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ripristino non riuscito."); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <nav className={styles.navigation}><Link href="/impostazioni">IMPOSTAZIONI</Link><Link href="/menu">MENU</Link></nav>
      <header><p className={styles.eyebrow}>IL REGISTRO DI FRANCESCA</p><h1>Salvataggio e ripristino</h1>
        <p>Conserva una copia cifrata dei dati del Registro e usala quando cambi telefono.</p></header>
      <section aria-labelledby="create-title">
        <h2 id="create-title">Crea una copia di sicurezza</h2>
        <p>Il file comprende gli archivi operativi, le copie temporanee e le eventuali fotografie storiche, senza riattivarle.</p>
        {current && <Counts summary={current} />}
        <label>Password del file (almeno 12 caratteri)<input type="password" autoComplete="new-password"
          value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} /></label>
        <label>Ripeti la password<input type="password" autoComplete="new-password"
          value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} /></label>
        <button type="button" disabled={busy || !cryptoAvailable()} onClick={createCopy}>SCARICA COPIA CIFRATA</button>
      </section>
      <section aria-labelledby="restore-title">
        <h2 id="restore-title">Ripristina una copia</h2>
        <p>Verifica il file e leggi il riepilogo prima di sostituire gli archivi presenti su questo dispositivo.</p>
        <label>File cifrato<input type="file" accept=".frbackup,application/json" onChange={(event) => {
          setSelectedFile(event.target.files?.[0] ?? null); setPrepared(null); setPreview(null); setReplaceConfirmed(false);
        }} /></label>
        <label>Password del file<input type="password" autoComplete="off" value={restorePassword}
          onChange={(event) => { setRestorePassword(event.target.value); setPrepared(null); setPreview(null); }} /></label>
        <button type="button" disabled={busy || !selectedFile || !cryptoAvailable()} onClick={verifyFile}>VERIFICA E MOSTRA IL CONTENUTO</button>
        {preview && prepared && <div className={styles.preview}>
          <p>Creato il {new Date(prepared.createdAt).toLocaleString("it-IT")}. Versione app: {prepared.appVersion}.</p>
          <Counts summary={preview} />
          {preview.warnings.length > 0 && <ul>{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          {preview.temporaryKeys > 0 && <p>Il file contiene copie temporanee: i dati operativi prevalenti saranno salvati stabilmente.</p>}
          {preview.unknownKeys > 0 && <p>Le chiavi sconosciute sono conservate nel file ma non vengono importate automaticamente.</p>}
          <p>Prima di procedere, scarica una copia cifrata dei dati attualmente presenti usando il comando sopra.</p>
          <label className={styles.checkbox}><input type="checkbox" checked={safetyConfirmed}
            onChange={(event) => setSafetyConfirmed(event.target.checked)} />Ho verificato che la copia attuale è stata salvata.</label>
          <label className={styles.checkbox}><input type="checkbox" checked={replaceConfirmed}
            onChange={(event) => setReplaceConfirmed(event.target.checked)} />Confermo la sostituzione degli archivi operativi.</label>
          <button type="button" className={styles.danger} disabled={busy || !safetyFingerprint || !safetyConfirmed || !replaceConfirmed}
            onClick={restore}>RIPRISTINA GLI ARCHIVI</button>
        </div>}
      </section>
      <section aria-labelledby="important-title"><h2 id="important-title">Informazioni importanti</h2>
        <p>Il file può contenere nomi, recapiti, appunti e pagamenti di studenti e famiglie. Conservalo in un luogo privato. Non inviarlo come normale allegato.</p>
        <p>La password non viene conservata nel browser. Se la dimentichi, il file cifrato non sarà recuperabile.</p>
        <p>Su Android la cifratura richiede HTTPS o localhost. Una pagina aperta tramite indirizzo LAN HTTP potrebbe non offrire questa funzione.</p>
      </section>
      <p className={styles.message} role="status" aria-live="polite">{message}</p>
    </div>
  </main>;
}
