import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const PAGE = 9;

export default createEndpoint({
  description: 'Lists published events/courses/calls, upcoming or past, paginated',
  inputSchema: z.object({
    page: z.number().int().min(1).default(1),
    kinds: z.array(z.enum(['Event', 'Conference', 'Course', 'Call'])).optional(),
    when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const page = input.page ?? 1;
    const when = input.when ?? 'upcoming';
    const params: unknown[] = [];
    let where = `"status" = 'Published'`;
    if (input.kinds?.length) { params.push(input.kinds); where += ` AND "kind" = ANY($${params.length})`; }
    if (when === 'upcoming') where += ` AND COALESCE("endAt", "startAt", NOW()) >= NOW()`;
    if (when === 'past') where += ` AND COALESCE("endAt", "startAt") < NOW()`;
    const order = when === 'upcoming' ? 'ASC' : 'DESC';
    const [rows, count] = await Promise.all([
      zite.sql({
        query: `SELECT "id", "title", "slug", "summary", "coverUrl", "kind", "startAt", "endAt", "location" FROM "Events"
          WHERE ${where} ORDER BY "startAt" ${order} NULLS LAST LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
        params,
      }),
      zite.sql({ query: `SELECT COUNT(*)::int AS "total" FROM "Events" WHERE ${where}`, params }),
    ]);
    const total = Number(count.rows[0]?.total ?? 0);
    return { events: rows.rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
  },
});
