import { notFound } from "next/navigation";
import { isSubjectSlug, subjects } from "../../materie-data";
import TopicEditor from "./topic-editor";

export default async function TopicPage({ params, searchParams }: {
  params: Promise<{ materia: string }>;
  searchParams: Promise<{ nome?: string }>;
}) {
  const { materia } = await params;
  const { nome } = await searchParams;
  if (!isSubjectSlug(materia) || !nome || !subjects[materia].topics.includes(nome)) notFound();
  return <TopicEditor slug={materia} topic={nome} />;
}
