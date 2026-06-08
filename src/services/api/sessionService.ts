// src/services/api/sessionService.ts
import { glpiClient, initSession, getSessionToken, clearSessionToken } from './glpiClient';

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

// Vérifie et initialise la session si nécessaire
export async function ensureSession(): Promise<string> {
  let token = getSessionToken();
  
  if (!token) {
    token = await initSession();
  }
  
  // Récupère les infos de session si pas déjà fait
  if (!activeSession) {
    await fetchFullSession();
  }
  
  return token;
}

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
  clearSessionToken();
}