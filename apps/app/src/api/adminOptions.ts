import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getAccess } from '../lib/server';

export default createEndpoint({
  description: 'Returns lookup options (faculties, majors, categories, associations) for admin forms',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const access = await getAccess(context.user.id);
    if (!access) throw new ZiteError({ code: 'FORBIDDEN', message: 'no admin', userFacingMessage: 'دسترسی ندارید.' });
    const [f, m, c, a, y, ay, p] = await Promise.all([
      zite.sql({ query: `SELECT "id", "name" FROM "Faculties" ORDER BY "sortOrder" NULLS LAST, "name"` }),
      zite.sql({ query: `SELECT m."id", m."name", fm."facultiesId" AS "facultyId" FROM "Majors" m LEFT JOIN "FacultiesMajors" fm ON fm."majorsId" = m."id" ORDER BY m."name"` }),
      zite.sql({ query: `SELECT "id", "name" FROM "Categories" ORDER BY "name"` }),
      zite.sql({ query: `SELECT "id", "name" FROM "Associations" ORDER BY "name"` }),
      zite.sql({ query: `SELECT "id", "title" AS "name" FROM "AcademicYears" ORDER BY "sortOrder" DESC NULLS LAST` }),
      zite.sql({ query: `SELECT "id", "title" AS "name" FROM "AssociationYears" ORDER BY "title"` }),
      zite.sql({ query: `SELECT "id", "name" FROM "Positions" ORDER BY "rank" NULLS LAST` }),
    ]);
    const assoc = access.role === 'Association Manager' ? a.rows.filter((r) => r.id === access.associationId) : a.rows;
    return { faculties: f.rows, majors: m.rows, categories: c.rows, associations: assoc, years: y.rows, associationYears: ay.rows, positions: p.rows };
  },
});
