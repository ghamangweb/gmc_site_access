import { generateReactHelpers } from "@uploadthing/react";

import type { GmcFileRouter } from "@/app/api/uploadthing/core";

// Typed against the real router, so an endpoint name or input shape that
// doesn't exist is a compile error rather than a runtime 400.
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<GmcFileRouter>();
