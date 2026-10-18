// Shared RPC caller used by the generated `zitejs/api` shim.
export async function call(name: string, input: unknown) {
  const res = await fetch(`/api/rpc/${name}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: input ?? {} }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json?.error ?? {};
    throw Object.assign(new Error(err.userFacingMessage ?? `Request failed (${res.status})`), {
      code: err.code ?? String(res.status),
      userFacingMessage: err.userFacingMessage,
    });
  }
  return json.data;
}
