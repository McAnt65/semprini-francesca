"use client";

import { use } from "react";
import StudentDiary from "../../diario/StudentDiary";

export default function StudentLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentDiary studentId={id} />;
}
