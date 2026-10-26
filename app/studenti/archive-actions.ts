import { archiveStoredStudentResult, restoreStoredStudentResult } from "../data/student-storage";
import type { SaveResult } from "../data/save-result";
import type { StudentRecord } from "../data/students";
import { fullName } from "./student-utils";

type Confirmation = (message: string) => boolean;
type StatusUpdate = (id: string) => boolean | SaveResult;
type ActionResult = "cancelled" | "saved" | "temporary" | "failed";

function actionStatus(result: boolean | SaveResult): ActionResult {
  return typeof result === "boolean" ? (result ? "saved" : "failed") : result.status;
}

export function archiveStudentAfterConfirmation(
  id: string,
  hasOutstanding: boolean,
  confirm: Confirmation = (message) => window.confirm(message),
  archive: StatusUpdate = archiveStoredStudentResult,
): ActionResult {
  const warning = hasOutstanding
    ? "\n\nAttenzione: questo studente ha ancora pagamenti in sospeso. Gli importi rimarranno registrati anche dopo l'archiviazione."
    : "";
  const message = "Vuoi archiviare questo studente? I suoi dati, le lezioni e i pagamenti resteranno conservati. Potrai ripristinarlo in qualsiasi momento." + warning;
  if (!confirm(message)) return "cancelled";
  return actionStatus(archive(id));
}

export function restoreStudentAfterConfirmation(
  student: StudentRecord,
  confirm: Confirmation = (message) => window.confirm(message),
  restore: StatusUpdate = restoreStoredStudentResult,
): ActionResult {
  const message = `Vuoi ripristinare ${fullName(student)} tra gli studenti attivi? I suoi dati, le lezioni e i pagamenti resteranno conservati.`;
  if (!confirm(message)) return "cancelled";
  return actionStatus(restore(student.id));
}
