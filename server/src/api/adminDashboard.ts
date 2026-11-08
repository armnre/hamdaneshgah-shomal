import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getAccess } from '../lib/server';

export default createEndpoint({
  description: 'Returns real dashboard counts and recent activity for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const access = await getAccess(context.user.id);
    if (!access) throw new ZiteError({ code: 'FORBIDDEN', message: 'no admin', userFacingMessage: 'دسترسی ندارید.' });
    const [counts, monthly, recent, messages] = await Promise.all([
      zite.sql({
        query: `SELECT
          (SELECT COUNT(*)::int FROM "Associations" WHERE "active" = true) AS "associations",
          (SELECT COUNT(*)::int FROM "Faculties") AS "faculties",
          (SELECT COUNT(*)::int FROM "Majors") AS "majors",
          (SELECT COUNT(*)::int FROM "News" WHERE "status" = 'Published') AS "newsPublished",
          (SELECT COUNT(*)::int FROM "News" WHERE "status" = 'Draft') AS "newsDraft",
          (SELECT COUNT(*)::int FROM "Events" WHERE "status" = 'Published' AND COALESCE("endAt","startAt") >= NOW()) AS "eventsUpcoming",
          (SELECT COUNT(*)::int FROM "ContactMessages" WHERE "status" = 'New') AS "messagesNew"`,
      }),
      zite.sql({
        query: `SELECT to_char(date_trunc('month', "publishAt"), 'YYYY-MM') AS "month", COUNT(*)::int AS "count"
          FROM "News" WHERE "status" = 'Published' AND "publishAt" > NOW() - INTERVAL '6 months'
          GROUP BY 1 ORDER BY 1`,
      }),
      access.role === 'Super Admin'
        ? zite.sql({ query: `SELECT "id", "action", "entity", "actorEmail", "loggedAt" FROM "AuditLogs" ORDER BY "loggedAt" DESC LIMIT 8` })
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
      access.role !== 'Association Manager'
        ? zite.sql({ query: `SELECT "id", "subject", "senderName", "receivedAt" FROM "ContactMessages" WHERE "status" = 'New' ORDER BY "receivedAt" DESC LIMIT 5` })
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    ]);
    return { counts: counts.rows[0], monthly: monthly.rows, recent: recent.rows, messages: messages.rows };
  },
});
