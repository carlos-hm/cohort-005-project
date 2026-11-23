// PROTOTYPE — throwaway, for "What does the Notification Feed look like in Cadence?" (#60).
// Lives on the prototype/notification-feed branch only. Not production.
import Knock, { signUserToken } from "@knocklabs/node";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "~/db";
import { comments, courses, lessons, modules, users, UserRole } from "~/db/schema";

if (!process.env.KNOCK_API_KEY) process.loadEnvFile(".env");

const knock = new Knock();
export const knockUserId = (id: number) => `cadence-${id}`;

export async function feedConfig(userId: number) {
  return {
    knockUserId: knockUserId(userId),
    userToken: await signUserToken(knockUserId(userId), { expiresInSeconds: 3600 }),
    publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
    feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID!,
  };
}

export const KINDS = [
  "refund-approved",
  "refund-declined",
  "refund-requested",
  "seat-claimed",
  "new-enrollment",
  "discussion-question",
  "discussion-reply",
] as const;
export type Kind = (typeof KINDS)[number];

function someone(notUserId: number) {
  return db.select().from(users).where(ne(users.id, notUserId)).get()!;
}
function someStudent(notUserId: number) {
  return (
    db
      .select()
      .from(users)
      .where(and(eq(users.role, UserRole.Student), ne(users.id, notUserId)))
      .get() ?? someone(notUserId)
  );
}
function someCourse() {
  return db.select().from(courses).get()!;
}
function someLesson() {
  return db
    .select({ id: lessons.id, title: lessons.title, slug: courses.slug })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .get()!;
}
function someComment(reply: boolean) {
  return db
    .select({ body: comments.body })
    .from(comments)
    .where(and(reply ? isNotNull(comments.parentId) : isNull(comments.parentId), isNull(comments.deletedAt)))
    .get();
}
const snippet = (s: string | undefined) =>
  (s ?? "Could you explain the second example again?").replace(/\s+/g, " ").slice(0, 90);

// Builds the structured data a real trigger would send. Rows are rendered by Cadence
// from this `data`, not from Knock's templated blocks.
function buildData(kind: Kind, recipientId: number) {
  const course = someCourse();
  const actor = someStudent(recipientId);
  const lesson = someLesson();
  switch (kind) {
    case "refund-approved":
      return { actor: null, data: { course_title: course.title, note: "Sorry it wasn't a fit, refunded in full.", url: `/courses/${course.slug}` } };
    case "refund-declined":
      return { actor: null, data: { course_title: course.title, note: "You've completed most of the course.", url: `/courses/${course.slug}` } };
    case "refund-requested":
      return { actor, data: { actor_name: actor.name, course_title: course.title, amount_cents: course.price, reason: "Not what I expected", url: "/admin/refunds" } };
    case "seat-claimed":
      return { actor, data: { actor_name: actor.name, course_title: course.title, seats_left: 3, url: "/team" } };
    case "new-enrollment":
      return { actor, data: { actor_name: actor.name, course_title: course.title, url: `/instructor/${course.id}/students` } };
    case "discussion-question":
      return { actor, data: { actor_name: actor.name, lesson_title: lesson.title, snippet: snippet(someComment(false)?.body), url: `/courses/${lesson.slug}/lessons/${lesson.id}` } };
    case "discussion-reply":
      return { actor, data: { actor_name: actor.name, lesson_title: lesson.title, snippet: snippet(someComment(true)?.body), url: `/courses/${lesson.slug}/lessons/${lesson.id}` } };
  }
}

export async function sendPrototypeNotification(kind: Kind, recipientId: number) {
  const recipient = db.select().from(users).where(eq(users.id, recipientId)).get()!;
  const { actor, data } = buildData(kind, recipientId);
  // Only `discussion-reply` and `new-enrollment` exist in the Knock dev env. The other
  // catalogue kinds ride on `discussion-reply` with `kind` in data — prototype shortcut.
  const workflow = kind === "new-enrollment" ? "new-enrollment" : "discussion-reply";
  if (kind === "new-enrollment") {
    // The spike found Enrollment is opt-in; opt the prototype user in so it shows up.
    await knock.users.setPreferences(knockUserId(recipientId), "default", {
      __persistence_strategy__: "merge",
      categories: { enrollments: { channel_types: { in_app_feed: true } } },
    } as never);
  }
  return knock.workflows.trigger(workflow, {
    actor: actor ? { id: knockUserId(actor.id), name: actor.name } : undefined,
    recipients: [{ id: knockUserId(recipient.id), name: recipient.name, email: recipient.email }],
    data: { kind, ...data },
  });
}
