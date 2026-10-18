import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists active faculties with their majors and associations',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const [f, m, a] = await Promise.all([
      zite.sql({ query: `SELECT "id", "name", "slug", "description", "imageUrl", "verified" FROM "Faculties" WHERE "active" = true ORDER BY "sortOrder" NULLS LAST, "name"` }),
      zite.sql({ query: `SELECT m."id", m."name", fm."facultiesId" AS "facultyId" FROM "Majors" m JOIN "FacultiesMajors" fm ON fm."majorsId" = m."id" WHERE m."active" = true ORDER BY m."name"` }),
      zite.sql({ query: `SELECT a."name", a."slug", af."facultiesId" AS "facultyId" FROM "Associations" a JOIN "AssociationsFaculties" af ON af."associationsId" = a."id" WHERE a."active" = true ORDER BY a."name"` }),
    ]);
    return {
      faculties: f.rows.map((row) => ({
        ...row,
        majors: m.rows.filter((x) => x.facultyId === row.id),
        associations: a.rows.filter((x) => x.facultyId === row.id),
      })),
    };
  },
});
