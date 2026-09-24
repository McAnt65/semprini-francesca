import Link from "next/link";

export default function NewLessonAction({
  date,
  studentId,
}: {
  date?: string;
  studentId?: string;
}) {
  const query = new URLSearchParams();
  if (date) query.set("data", date);
  if (studentId) query.set("studente", studentId);

  return (
    <Link
      href={`/calendario/nuova${query.size ? `?${query}` : ""}`}
      aria-label="Aggiungi una nuova lezione"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] right-3 z-50 rounded-full border border-[#8b5960] bg-[#f9edda] px-4 py-2.5 font-entry-elegant text-[15px] font-semibold text-[#6f2638] shadow-[0_3px_12px_rgba(65,38,28,.22)] sm:absolute sm:bottom-[12%] sm:right-[4%]"
    >
      ＋ Nuova lezione
    </Link>
  );
}
