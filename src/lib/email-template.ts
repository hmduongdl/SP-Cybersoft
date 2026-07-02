import { render } from "@react-email/render";
import { createElement } from "react";
import { NotificationEmail } from "@/emails/notification-email";

/** Render HTML cho email thông báo bằng React Email. */
export async function buildNotificationEmail(subject: string, message: string): Promise<string> {
  return render(createElement(NotificationEmail, { subject, message }));
}
