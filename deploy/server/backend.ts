// Drop-in replacement for `zitejs/backend` on Netlify.
import type { z } from 'zod';

export class ZiteError extends Error {
  code: string;
  userFacingMessage?: string;
  constructor(opts: { code: string; message: string; userFacingMessage?: string }) {
    super(opts.message);
    this.code = opts.code;
    this.userFacingMessage = opts.userFacingMessage;
  }
}

export type SessionUser = { id: string; email: string; firstName?: string; lastName?: string };

export type EndpointConfig = {
  description?: string;
  authenticated?: boolean;
  stream?: boolean;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: { input: any; context: { user: any } }) => Promise<unknown>;
};

export function createEndpoint<T extends EndpointConfig>(config: T): T {
  return config;
}
