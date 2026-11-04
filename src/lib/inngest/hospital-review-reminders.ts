import { parseISO } from "date-fns";

import { hospitalReviewReminderTemplate } from "@/lib/email/templates";
import { inngest } from "@/lib/inngest/client";
import {
  claimHospitalReviewReminder,
  listDueHospitalReviewReminders,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

// Daily at 07:00 Accra time: tells every Hospital user, on the bell and by
// email, about Fit with Conditions reviews due tomorrow and due today. Like a
// Server Action, this only orchestrates — the rules live in workflow-service.
// Each reminder is its own step, so one failed email doesn't re-send the rest,
// and the claim inside it stops a retry from notifying twice. Steps return
// counts only: their results are stored by Inngest, so no names leave here.
export const hospitalReviewReminders = inngest.createFunction(
  {
    id: "hospital-review-reminders",
    triggers: [{ cron: "TZ=Africa/Accra 0 7 * * *" }],
    concurrency: 1,
  },
  async ({ step }) => {
    const due = await step.run("find-due-reviews", () =>
      listDueHospitalReviewReminders(),
    );

    for (const { clearanceId, kind } of due) {
      await step.run("send-review-reminder", async () => {
        const claimed = await claimHospitalReviewReminder(clearanceId, kind);

        if (!claimed) {
          return { notified: 0, emailsFailed: 0 };
        }

        // Loaded here, not at the top: graph-mail builds its Azure credential
        // on import, and `next build` loads this route's module without the
        // Azure env (the pre-commit build runs with none).
        const { sendEmail } = await import("@/lib/email/send");

        let emailsFailed = 0;

        for (const recipient of claimed.recipients) {
          const sent = await sendEmail({
            to: recipient.email,
            ...hospitalReviewReminderTemplate({
              personName: claimed.personName,
              engagementId: claimed.engagementId,
              clearanceId,
              reviewDate: formatQueueDate(parseISO(claimed.nextReviewDate)),
              dueToday: kind === "Due",
            }),
          });

          if (!sent) emailsFailed += 1;
        }

        return { notified: claimed.recipients.length, emailsFailed };
      });
    }

    return { reminders: due.length };
  },
);
