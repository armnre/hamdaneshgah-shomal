// Typed-by-name client for the Fastify backend (server/src/api/*). Each call is POST /api/rpc/<name>.
// Regenerate the list with: node server/scripts/gen-client.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  code: string;
  userFacingMessage?: string;
  constructor(message: string, code: string, userFacingMessage?: string) {
    super(message);
    this.code = code;
    this.userFacingMessage = userFacingMessage;
  }
}

export async function call(name: string, input: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}/api/rpc/${name}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: input ?? {} }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json?.error ?? {};
    throw new ApiError(err.userFacingMessage ?? `Request failed (${res.status})`, err.code ?? String(res.status), err.userFacingMessage);
  }
  return json.data;
}

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export const adminDashboard = (input?: any): Promise<any> => call('adminDashboard', input);
export type AdminDashboardInputType = any;
export type AdminDashboardOutputType = any;
export const adminDelete = (input?: any): Promise<any> => call('adminDelete', input);
export type AdminDeleteInputType = any;
export type AdminDeleteOutputType = any;
export const adminDemoData = (input?: any): Promise<any> => call('adminDemoData', input);
export type AdminDemoDataInputType = any;
export type AdminDemoDataOutputType = any;
export const adminElectionStage = (input?: any): Promise<any> => call('adminElectionStage', input);
export type AdminElectionStageInputType = any;
export type AdminElectionStageOutputType = any;
export const adminList = (input?: any): Promise<any> => call('adminList', input);
export type AdminListInputType = any;
export type AdminListOutputType = any;
export const adminOptions = (input?: any): Promise<any> => call('adminOptions', input);
export type AdminOptionsInputType = any;
export type AdminOptionsOutputType = any;
export const adminSave = (input?: any): Promise<any> => call('adminSave', input);
export type AdminSaveInputType = any;
export type AdminSaveOutputType = any;
export const adminTally = (input?: any): Promise<any> => call('adminTally', input);
export type AdminTallyInputType = any;
export type AdminTallyOutputType = any;
export const castVote = (input?: any): Promise<any> => call('castVote', input);
export type CastVoteInputType = any;
export type CastVoteOutputType = any;
export const claimSuperAdmin = (input?: any): Promise<any> => call('claimSuperAdmin', input);
export type ClaimSuperAdminInputType = any;
export type ClaimSuperAdminOutputType = any;
export const getAssociation = (input?: any): Promise<any> => call('getAssociation', input);
export type GetAssociationInputType = any;
export type GetAssociationOutputType = any;
export const getEvent = (input?: any): Promise<any> => call('getEvent', input);
export type GetEventInputType = any;
export type GetEventOutputType = any;
export const getMyAccess = (input?: any): Promise<any> => call('getMyAccess', input);
export type GetMyAccessInputType = any;
export type GetMyAccessOutputType = any;
export const getNews = (input?: any): Promise<any> => call('getNews', input);
export type GetNewsInputType = any;
export type GetNewsOutputType = any;
export const getPublicHome = (input?: any): Promise<any> => call('getPublicHome', input);
export type GetPublicHomeInputType = any;
export type GetPublicHomeOutputType = any;
export const getSiteSettings = (input?: any): Promise<any> => call('getSiteSettings', input);
export type GetSiteSettingsInputType = any;
export type GetSiteSettingsOutputType = any;
export const getStructure = (input?: any): Promise<any> => call('getStructure', input);
export type GetStructureInputType = any;
export type GetStructureOutputType = any;
export const importVoters = (input?: any): Promise<any> => call('importVoters', input);
export type ImportVotersInputType = any;
export type ImportVotersOutputType = any;
export const listAssociations = (input?: any): Promise<any> => call('listAssociations', input);
export type ListAssociationsInputType = any;
export type ListAssociationsOutputType = any;
export const listEvents = (input?: any): Promise<any> => call('listEvents', input);
export type ListEventsInputType = any;
export type ListEventsOutputType = any;
export const listFaculties = (input?: any): Promise<any> => call('listFaculties', input);
export type ListFacultiesInputType = any;
export type ListFacultiesOutputType = any;
export const listNews = (input?: any): Promise<any> => call('listNews', input);
export type ListNewsInputType = any;
export type ListNewsOutputType = any;
export const listPublicElections = (input?: any): Promise<any> => call('listPublicElections', input);
export type ListPublicElectionsInputType = any;
export type ListPublicElectionsOutputType = any;
export const submitContact = (input?: any): Promise<any> => call('submitContact', input);
export type SubmitContactInputType = any;
export type SubmitContactOutputType = any;
export const verifyVoter = (input?: any): Promise<any> => call('verifyVoter', input);
export type VerifyVoterInputType = any;
export type VerifyVoterOutputType = any;
