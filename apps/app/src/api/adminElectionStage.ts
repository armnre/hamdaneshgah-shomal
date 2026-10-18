import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit } from '../lib/server';
import { canTransition } from '../lib/policy';

// Post-voting stages driven from the tally page: close → counting → confirm → publish → archive.
const POST = ['Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived'] as const;

export default createEndpoint({
  description: 'Moves an election to its next post-voting stage (close, count, confirm, publish, archive)',
  authenticated: true,
  inputSchema: z.object({ electionId: z.string().min(1), to: z.enum(POST) }),
  outputSchema: z.object({ status: z.string() }),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'elections');
    const e = await zite.elections.findOne({ id: input.electionId });
    if (!e) throw new ZiteError({ code: 'NOT_FOUND', message: 'election', userFacingMessage: 'انتخابات یافت نشد.' });
    const from = String(e.status);
    if (!canTransition(from, input.to)) throw new ZiteError({ code: 'BAD_REQUEST', message: 'transition', userFacingMessage: 'این تغییر مرحله مجاز نیست؛ مراحل باید به ترتیب طی شوند.' });
    if (input.to === 'Closed') {
      // Early close also ends the voting window so no session can still vote
      const now = new Date().toISOString();
      await zite.elections.update({ id: e.id, record: { status: 'Closed', votingEnd: e.votingEnd && String(e.votingEnd) < now ? e.votingEnd : now } });
      const s = await zite.sql({ query: `SELECT "voterSessionsId" AS id FROM "ElectionsVoterSessions" WHERE "electionsId" = $1`, params: [e.id] });
      for (const r of s.rows) await zite.voterSessions.delete({ id: String(r.id) });
    } else {
      await zite.elections.update({ id: e.id, record: { status: input.to } });
    }
    await audit(context.user, 'stage', 'elections', e.id, `${from} → ${input.to}`);
    return { status: input.to };
  },
});
