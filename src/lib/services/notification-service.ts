import { and, count, desc, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export type NotificationRow = typeof notifications.$inferSelect;

// A read notification stays on the dashboard for a week after it was read,
// then drops off. The row is kept: unread rows double as pending access
// requests, and nothing here should change what the admin pages see.
const READ_NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUnreadNotificationCount(
  recipientStaffUserId: string,
): Promise<number> {
  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.readAt),
        isNull(notifications.clearedAt),
      ),
    );
  return unreadCount;
}

export async function getRecentNotifications(
  recipientStaffUserId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  const readCutoff = new Date(Date.now() - READ_NOTIFICATION_RETENTION_MS);

  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.clearedAt),
        or(isNull(notifications.readAt), gt(notifications.readAt, readCutoff)),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(
  notificationId: string,
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
      ),
    );
}

export async function markAllNotificationsRead(
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.readAt),
      ),
    );
}

export async function clearNotification(
  notificationId: string,
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ clearedAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.clearedAt),
      ),
    );
}

export async function clearAllNotifications(
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ clearedAt: new Date() })
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.clearedAt),
      ),
    );
}
