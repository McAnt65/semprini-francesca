"use client";

import { use } from "react";
import LessonRegister from "../../../lezioni/LessonRegister";

export default function StudentLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LessonRegister view="diary" studentId={id} backHref={`/studenti/${encodeURIComponent(id)}`} />;
}
