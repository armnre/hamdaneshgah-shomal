import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const PAGE = 9;

export default createEndpoint({
  description: 'Lists published news, paginated, with optional category and search',
  inputSchema: z.object({ page: z.number().int().min(1).default(1), categoryId: z.string().optional(), q: z.string().optional() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const page = input.page ?? 1;
    const params: unknown[] = [];
    let where = `n."status" = 'Published' AND (n."publishAt" IS NULL OR n."publishAt" <= NOW())`;
    if (input.categoryId) { params.push(input.categoryId); where += ` AND c."id" = $${params.length}`; }
    if (input.q) { params.push(`%${input.q}%`); where += ` AND (n."title" ILIKE $${params.length} OR n."excerpt" ILIKE $${params.length})`; }
    const from = `FROM "News" n LEFT JOIN "CategoriesNews" cn ON cn."newsId" = n."id" LEFT JOIN "Categories" c ON c."id" = cn."categoriesId"`;
    const [rows, count, cats] = await Promise.all([
      zite.sql({
        query: `SELECT n."id", n."title", n."slug", n."excerpt", n."coverUrl", n."publishAt", n."isAnnouncement", c."name" AS "categoryName"
          ${from} WHERE ${where} ORDER BY n."publishAt" DESC NULLS LAST LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
        params,
      }),
      zite.sql({ query: `SELECT COUNT(*)::int AS "total" ${from} WHERE ${where}`, params }),
      zite.sql({ query: `SELECT "id", "name" FROM "Categories" ORDER BY "name"` }),
    ]);
    const total = Number(count.rows[0]?.total ?? 0);
    return { news: rows.rows, total, pages: Math.max(1, Math.ceil(total / PAGE)), categories: cats.rows };
  },
});
