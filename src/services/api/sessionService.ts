import { glpiClient } from './glpiClient';

export interface GlpiSession {
  session_token: string;
  glpiID: number;
  glpiname: string;
  glpifirstname: string;
  glpirealname: string;
  glpiactiveprofile: {
    id: number;
    name: string;
  };
  glpiactive_entity: number;
}

let activeSession: GlpiSession | null = null;

export async function fetchFullSession(): Promise<GlpiSession> {
  const { data } = await glpiClient.get('/getFullSession');
  activeSession = data.session;
  return activeSession as GlpiSession;
}

export function getCurrentSession(): GlpiSession | null {
  return activeSession;
}

export function clearCurrentSession() {
  activeSession = null;
}
