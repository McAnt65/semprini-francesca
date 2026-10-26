import { notFound } from "next/navigation";
import { isSubjectSlug } from "../../materie-data";
import TopicEditor from "./topic-editor";

export default async function TopicPage({ params, searchParams }: {
  params: Promise<{ materia: string }>;
  searchParams: Promise<{ id?: string; nome?: string }>;
}) {
  const { materia } = await params;
  const { id, nome } = await searchParams;
  if (!isSubjectSlug(materia) || (!id && !nome)) notFound();
  return <TopicEditor slug={materia} topicId={id} legacyName={nome} />;
}
