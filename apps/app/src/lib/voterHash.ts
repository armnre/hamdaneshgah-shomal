// Server-side only. The raw national ID is never stored — only a per-election SHA-256 hash and the last 4 digits.
export async function hashNationalId(electionId: string, nationalId: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`hamdaneshgahi:${electionId}:${nationalId}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
