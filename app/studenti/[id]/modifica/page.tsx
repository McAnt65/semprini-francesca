import { use } from "react";
import StudentForm from "../../StudentForm";

export default function StudentEditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StudentForm studentId={id} />;
}
