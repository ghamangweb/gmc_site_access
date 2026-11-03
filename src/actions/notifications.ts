"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/domain/types";
import {
  clearAllNotifications,
  clearNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/services/notification-service";

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    await markNotificationRead(notificationId, session.staffUserId);

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("[actions/notifications]", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    await markAllNotificationsRead(session.staffUserId);

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("[actions/notifications]", error);
    return {
      success: false,
      error: "Failed to mark notifications as read",
    };
  }
}

export async function clearNotificationAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    await clearNotification(notificationId, session.staffUserId);

    revalidatePath("/dashboard", "layout");

    return { success: true };
  } catch (error) {
    console.error("[actions/notifications]", error);

    return { success: false, error: "Failed to clear notification" };
  }
}

export async function clearAllNotificationsAction(): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    await clearAllNotifications(session.staffUserId);

    revalidatePath("/dashboard", "layout");

    return { success: true };
  } catch (error) {
    console.error("[actions/notifications]", error);

    return { success: false, error: "Failed to clear notifications" };
  }
}
