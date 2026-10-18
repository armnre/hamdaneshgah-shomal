import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { getSettingsMap } from '../lib/server';

export default createEndpoint({
  description: 'Returns public site settings (name, contact info, links)',
  inputSchema: z.object({}),
  outputSchema: z.object({ settings: z.record(z.string()) }),
  execute: async () => ({ settings: await getSettingsMap() }),
});
