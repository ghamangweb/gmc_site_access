import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "@/app/api/uploadthing/core";

// GET serves the route config to the client; POST handles presign + the
// upload-complete callback. Both are public endpoints — authorization lives
// in each route's middleware, not here.
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
