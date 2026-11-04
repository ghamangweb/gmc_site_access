import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { hospitalReviewReminders } from "@/lib/inngest/hospital-review-reminders";

// The one non-upload API route (see architecture.md): Inngest calls it to run
// background jobs. No business logic and no session — Inngest signs every
// request (INNGEST_SIGNING_KEY), and the proxy only guards /dashboard.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [hospitalReviewReminders],
});
