import { notFound } from "next/navigation";
import { isSubjectSlug, subjects } from "../../materie-data";
import SubjectStudents from "./subject-students";

export default async function StudentsPage({ params }: { params: Promise<{ materia: string }> }) {
  const { materia } = await params;
  if (!isSubjectSlug(materia)) notFound();
  return <SubjectStudents slug={materia} title={subjects[materia].title} />;
}
