import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeUserCodebase } from "@/lib/inngest/functions";

// This endpoint can run for a maximum of 300 seconds on Vercel
export const maxDuration = 300;

// Create an API that serves zero-downtime background jobs
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeUserCodebase,
  ],
});
