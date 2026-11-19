// PROTOTYPE — throwaway Knock spike for "Does Knock hold up against Cadence?"
// (issue #52). Lives on the prototype/knock-spike branch only. Not production.
import Knock, { signUserToken } from "@knocklabs/node";
import { alias } from "drizzle-orm/sqlite-core";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "~/db";
import { comments, courses, lessons, modules, users } from "~/db/schema";

// Vite doesn't put .env into process.env for SSR; the spike loads it itself.
if (!process.env.KNOCK_API_KEY) process.loadEnvFile(".env");

export const knock = new Knock();

export const DISCUSSION_REPLY = "discussion-reply";
export const NEW_ENROLLMENT = "new-enrollment";

export const knockUserId = (id: number) => `cadence-${id}`;

export function knockConfig() {
  return {
    publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
    feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID!,
  };
}

// Check 1: the server signs an RS256 token for whichever user the session holds.
export async function signFor(userId: number) {
  return signUserToken(knockUserId(userId), { expiresInSeconds: 3600 });
}

export async function identify(userId: number) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error(`No user ${userId}`);
  await knock.users.update(knockUserId(user.id), {
    name: user.name,
    email: user.email,
  });
  return user;
}

// Check 2: a real Discussion Reply from the seed data, sent to the question's author.
export function latestDiscussionReply() {
  const question = alias(comments, "question");
  const replier = alias(users, "replier");
  return db
    .select({
      replyId: comments.id,
      replyBody: comments.body,
      replierId: replier.id,
      replierName: replier.name,
      questionAuthorId: question.userId,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseSlug: courses.slug,
    })
    .from(comments)
    .innerJoin(question, eq(comments.parentId, question.id))
    .innerJoin(replier, eq(comments.userId, replier.id))
    .innerJoin(lessons, eq(comments.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(and(isNotNull(comments.parentId), isNull(comments.deletedAt)))
    .orderBy(desc(comments.id))
    .limit(1)
    .get();
}

export async function triggerDiscussionReply(questionAuthorId: number) {
  const reply = latestDiscussionReply();
  if (!reply) throw new Error("No Discussion Reply in the seed data");
  await identify(reply.replierId);
  await identify(questionAuthorId);
  return knock.workflows.trigger(DISCUSSION_REPLY, {
    actor: knockUserId(reply.replierId),
    // The real recipient is reply.questionAuthorId; the spike lets you aim it
    // at the current DevUI user so the feed under test receives it.
    recipients: [knockUserId(questionAuthorId)],
    data: {
      replier_name: reply.replierName,
      lesson_title: reply.lessonTitle,
      url: `/courses/${reply.courseSlug}/lessons/${reply.lessonId}#comment-${reply.replyId}`,
    },
  });
}

// Check 4: new Enrollment → Instructor, which must be off by default and opt-in.
export async function triggerNewEnrollment(instructorId: number, studentId: number) {
  const course = db
    .select()
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .get();
  const student = await identify(studentId);
  await identify(instructorId);
  return knock.workflows.trigger(NEW_ENROLLMENT, {
    actor: knockUserId(studentId),
    recipients: [knockUserId(instructorId)],
    data: {
      student_name: student.name,
      course_title: course?.title ?? "(instructor has no course)",
    },
  });
}

export function getPreferences(userId: number) {
  return knock.users.getPreferences(knockUserId(userId), "default");
}

export function optInToEnrollments(userId: number) {
  return knock.users.setPreferences(knockUserId(userId), "default", {
    __persistence_strategy__: "merge",
    categories: { enrollments: { channel_types: { in_app_feed: true } } },
  });
}

export function clearPreferences(userId: number) {
  return knock.users.unsetPreferences(knockUserId(userId), "default");
}

export function allUsers() {
  return db.select({ id: users.id, name: users.name, role: users.role }).from(users).all();
}
