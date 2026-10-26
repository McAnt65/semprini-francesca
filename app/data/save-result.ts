export type SaveResult = { status: "saved" | "temporary" | "failed" };

export const TEMPORARY_SAVE_WARNING =
  "I dati sono disponibili soltanto in questa sessione. Potrebbero andare persi chiudendo il browser.";

export function writeAndVerify(storage: Pick<Storage, "setItem" | "getItem">, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return storage.getItem(key) === value;
  } catch {
    return false;
  }
}
