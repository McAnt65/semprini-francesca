import { redirect } from "next/navigation";
import { use } from "react";

export default function StudentSectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  redirect(`/studenti/${encodeURIComponent(id)}/modifica`);
}
