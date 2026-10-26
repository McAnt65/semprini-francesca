import { redirect } from "next/navigation";

export default async function StudentEditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/studenti/nuovo?id=${encodeURIComponent(id)}`);
}
