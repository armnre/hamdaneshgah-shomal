import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireAccess, audit } from '../lib/server';
import { loadReports } from '../lib/reportData';

// همه‌ی مراحل پس از پایان رأی‌گیری؛ گزارش به محض بسته شدن رأی‌گیری خودکار آماده است
const POST_VOTING = ['Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived'] as const;

export default createEndpoint({
  description: 'Builds official result reports for closed elections (one or all) for the admin panel',
  authenticated: true,
  inputSchema: z.object({ electionId: z.string().optional() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'elections');
    const reports = await loadReports(POST_VOTING, input.electionId || undefined);
    await audit(context.user, 'report', 'elections', input.electionId ?? 'all', `${reports.length} report(s)`);
    return { reports };
  },
});
