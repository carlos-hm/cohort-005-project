// PROTOTYPE — throwaway (#60). Sends a catalogue Notification to the DevUI user.
import { data } from "react-router";
import type { Route } from "./+types/api.prototype-notify";
import { getCurrentUserId } from "~/lib/session";
import { KINDS, sendPrototypeNotification, type Kind } from "~/lib/prototype-notification-feed.server";

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel.", { status: 401 });
  const kind = String((await request.formData()).get("kind")) as Kind;
  if (!KINDS.includes(kind)) throw data("unknown kind", { status: 400 });
  return sendPrototypeNotification(kind, userId);
}
