import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getAccess, ROLE_ENTITIES } from '../lib/server';

export default createEndpoint({
  description: 'Returns the signed-in user\'s admin role and permitted sections',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const access = await getAccess(context.user.id);
    let canBootstrap = false;
    if (!access) {
      const any = await zite.adminMembers.findAll({ limit: 1 });
      canBootstrap = any.records.length === 0;
    }
    return {
      role: access?.role ?? null,
      associationId: access?.associationId ?? null,
      entities: access ? ROLE_ENTITIES[access.role] : [],
      canBootstrap,
    };
  },
});
