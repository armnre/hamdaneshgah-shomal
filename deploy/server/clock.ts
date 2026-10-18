// Netlify Scheduled Function: opens/closes elections on time and writes AuditLogs.
// Runs every minute. The on-visit check in listPublicElections/verifyVoter stays as a backup.
// close_election / open_election are locked and idempotent in SQL (migration 0006), so a
// scheduled run racing a visitor-triggered run cannot double-seal or double-open.
import { syncAllDue } from '../.build/app/src/lib/electionClock';

export default async () => {
  try {
    const acted = await syncAllDue();
    if (acted) console.log(`[clock] ${acted} election(s) moved`);
  } catch (e) {
    console.error('[clock] failed', e instanceof Error ? e.message : 'unknown');
  }
  return new Response(null, { status: 204 });
};

export const config = { schedule: '* * * * *' };
