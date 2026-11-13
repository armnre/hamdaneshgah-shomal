import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { loadReports } from '../lib/reportData';
import { RESULT_STAGES } from '../lib/policy';

// عمومی: فقط انتخاباتی که نتایجشان رسماً اعلام شده است
export default createEndpoint({
  description: 'Official result reports of elections whose results are published',
  inputSchema: z.object({ electionId: z.string().optional() }),
  outputSchema: z.any(),
  execute: async ({ input }) => ({ reports: await loadReports(RESULT_STAGES, input.electionId || undefined) }),
});
