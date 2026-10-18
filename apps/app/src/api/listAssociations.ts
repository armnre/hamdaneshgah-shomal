import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists active scientific associations with optional search and faculty filter',
  inputSchema: z.object({ q: z.string().optional(), facultyId: z.string().optional() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const params: unknown[] = [];
    let where = `a."active" = true`;
    if (input.q) { params.push(`%${input.q}%`); where += ` AND (a."name" ILIKE $${params.length} OR a."shortDescription" ILIKE $${params.length})`; }
    if (input.facultyId) { params.push(input.facultyId); where += ` AND f."id" = $${params.length}`; }
    const res = await zite.sql({
      query: `SELECT a."id", a."name", a."slug", a."shortDescription", a."logoUrl", a."coverUrl", a."featured",
        f."id" AS "facultyId", f."name" AS "facultyName", m."name" AS "majorName"
        FROM "Associations" a
        LEFT JOIN "AssociationsFaculties" af ON af."associationsId" = a."id"
        LEFT JOIN "Faculties" f ON f."id" = af."facultiesId"
        LEFT JOIN "AssociationsMajors" am ON am."associationsId" = a."id"
        LEFT JOIN "Majors" m ON m."id" = am."majorsId"
        WHERE ${where} ORDER BY a."featured" DESC NULLS LAST, a."name" LIMIT 200`,
      params,
    });
    const faculties = await zite.sql({ query: `SELECT "id", "name" FROM "Faculties" WHERE "active" = true ORDER BY "sortOrder" NULLS LAST` });
    return { associations: res.rows, faculties: faculties.rows };
  },
});
