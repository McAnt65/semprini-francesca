import { base64ToBytes } from "./archives";
import { parsePayload, type BackupPayload } from "./format";

export const ENCRYPTED_FORMAT = "registro-francesca-encrypted-backup";
const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
type Header = { format: typeof ENCRYPTED_FORMAT; version: 1; kdf: "PBKDF2-SHA-256";
  iterations: number; cipher: "AES-256-GCM"; salt: string; nonce: string; digest: string };
type EncryptedBackup = { header: Header; ciphertext: string };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export function cryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle && typeof crypto.getRandomValues === "function";
}
export async function encryptBackup(payload: BackupPayload, password: string): Promise<string> {
  if (!cryptoAvailable()) throw new Error("Cifratura non disponibile: apri il Registro tramite HTTPS o localhost.");
  if (password.length < 12) throw new Error("Scegli una password di almeno 12 caratteri.");
  const plaintext = encoder.encode(JSON.stringify(parsePayload(payload)));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const digest = toBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", plaintext)));
  const header: Header = { format: ENCRYPTED_FORMAT, version: 1, kdf: "PBKDF2-SHA-256",
    iterations: ITERATIONS, cipher: "AES-256-GCM", salt: toBase64(salt),
    nonce: toBase64(nonce), digest };
  const key = await derive(password, salt, ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce,
    additionalData: encoder.encode(JSON.stringify(header)) }, key, plaintext);
  return JSON.stringify({ header, ciphertext: toBase64(new Uint8Array(ciphertext)) } satisfies EncryptedBackup);
}
export async function decryptBackup(file: string, password: string): Promise<BackupPayload> {
  if (!cryptoAvailable()) throw new Error("Cifratura non disponibile: apri il Registro tramite HTTPS o localhost.");
  let value: unknown;
  try { value = JSON.parse(file); } catch { throw new Error("File di backup non leggibile."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("File di backup non valido.");
  const envelope = value as Partial<EncryptedBackup>;
  const header = envelope.header;
  if (!header || header.format !== ENCRYPTED_FORMAT || header.version !== 1 ||
      header.kdf !== "PBKDF2-SHA-256" || header.iterations !== ITERATIONS ||
      header.cipher !== "AES-256-GCM" || typeof envelope.ciphertext !== "string")
    throw new Error("Formato o versione del backup non compatibile.");
  let plaintext: Uint8Array<ArrayBuffer>;
  try {
    const salt = base64ToBytes(header.salt);
    const nonce = base64ToBytes(header.nonce);
    if (salt.length !== 16 || nonce.length !== 12) throw new Error("invalid header");
    const key = await derive(password, salt, ITERATIONS);
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce,
      additionalData: encoder.encode(JSON.stringify(header)) }, key, base64ToBytes(envelope.ciphertext)));
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", plaintext));
    if (!equalBytes(digest, base64ToBytes(header.digest))) throw new Error("invalid digest");
  } catch {
    throw new Error("Password errata o file alterato. Nessun dato è stato modificato.");
  }
  try { return parsePayload(JSON.parse(decoder.decode(plaintext))); }
  catch (error) {
    if (error instanceof Error && error.message.includes("versione")) throw error;
    throw new Error("Contenuto del backup non valido. Nessun dato è stato modificato.");
  }
}
