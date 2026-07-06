import { db } from "./db";

type NotificationType = "PC_BUILD_APPROVED" | "PC_BUILD_REJECTED" | "PC_BUILD_AUTO_APPROVED";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  referenceId,
  referenceType,
}: CreateNotificationParams) {
  return db.notification.create({
    data: {
      user_id: userId,
      type,
      title,
      message,
      reference_id: referenceId,
      reference_type: referenceType,
    },
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return db.notification.count({
    where: { user_id: userId, is_read: false },
  });
}

export async function getNotifications(userId: string, limit = 20) {
  return db.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true, read_at: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return db.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });
}

export async function deleteAllNotifications(userId: string) {
  return db.notification.deleteMany({
    where: { user_id: userId },
  });
}

export async function deleteAllUsersNotifications() {
  return db.notification.deleteMany({});
}
