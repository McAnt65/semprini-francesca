import type { LessonSnapshot } from "./calendar-types";

type TopicLesson = Pick<LessonSnapshot, "topic" | "topicKind" | "coveredTopic" | "status">;

export function coveredTopicOf(lesson: TopicLesson): string {
  return lesson.coveredTopic?.trim() ?? "";
}

/** Older completed lessons did not distinguish a plan from a taught topic. */
export function unclassifiedHistoricalTopicOf(lesson: TopicLesson): string {
  return lesson.status === "svolta" && lesson.topicKind !== "planned" && lesson.coveredTopic === undefined
    ? lesson.topic.trim() : "";
}

export function plannedTopicOf(lesson: TopicLesson): string {
  return lesson.topicKind === "planned" || lesson.status !== "svolta" ? lesson.topic.trim() : "";
}
