import { Inngest } from "inngest";

// One client for every background job. v4 defaults to Cloud mode: locally
// INNGEST_DEV=1 (in .env.development) points it at the Inngest dev server;
// production needs INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY from the host.
// Never set `isDev` here — it would silently break production.
export const inngest = new Inngest({ id: "gmc-site-access" });
