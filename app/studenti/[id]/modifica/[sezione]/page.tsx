import { redirect } from "next/navigation";

export default async function EditStudentSection({ params }: { params: Promise<{ id: string; sezione: string }> }) {
  const { id } = await params;
  redirect(`/studenti/nuovo?id=${encodeURIComponent(id)}`);
}
