import { notFound } from "next/navigation";
import { isSubjectSlug, subjects } from "../materie-data";
import SubjectScreen from "./subject-screen";

export default async function SubjectPage({ params }: { params: Promise<{ materia: string }> }) {
  const { materia } = await params;
  if (!isSubjectSlug(materia)) notFound();
  return <SubjectScreen slug={materia} subject={subjects[materia]} />;
}
