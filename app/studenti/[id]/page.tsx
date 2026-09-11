import { notFound } from "next/navigation";
import StudentDetail from "../../components/StudentDetail";
import { getStudentById } from "../../data/students";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = getStudentById(id);

  if (!student) {
    notFound();
  }

  return <StudentDetail student={student} />;
}
