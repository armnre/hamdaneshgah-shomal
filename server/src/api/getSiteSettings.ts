import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getSettingsMap } from '../lib/server';

export default createEndpoint({
  description: 'Returns public site settings (name, contact info, links) and whether demo data is present',
  inputSchema: z.object({}),
  outputSchema: z.object({ settings: z.record(z.string()), hasDemo: z.boolean() }),
  execute: async () => {
    const [settings, demo] = await Promise.all([
      getSettingsMap(),
      zite.sql({ query: `SELECT (EXISTS (SELECT 1 FROM "Elections" WHERE "isDemo") OR EXISTS (SELECT 1 FROM "Associations" WHERE "isDemo") OR EXISTS (SELECT 1 FROM "News" WHERE "isDemo") OR EXISTS (SELECT 1 FROM "Events" WHERE "isDemo")) AS d` }),
    ]);
    return { settings, hasDemo: demo.rows[0]?.d === true };
  },
});
