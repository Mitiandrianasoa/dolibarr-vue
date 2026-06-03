/**
 * userService.ts
 * Fetch et gestion des utilisateurs GLPI
 * Endpoint : GET /apirest.php/User
 */

import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS } from '@/constants/glpi';
import {
  type GlpiUser,
  type User,
  mapGlpiUserToUser,
} from '@/models/User';

// ─── Paramètres de recherche ──────────────────────────────────────────────────

export interface UserSearchParams {
  entityId?: number;
  isActive?: boolean;
  /** Champs à retourner (ex: ['id','name','email']) */
  fields?: string[];
}

// ─── Fetch tous les utilisateurs ─────────────────────────────────────────────

export async function fetchAllUsers(params: UserSearchParams = {}): Promise<User[]> {
  const queryParams: Record<string, unknown> = {
    is_deleted: 0,
  };

  if (params.entityId !== undefined) {
    queryParams['searchText[entities_id]'] = params.entityId;
  }
  if (params.isActive !== undefined) {
    queryParams['searchText[is_active]'] = params.isActive ? 1 : 0;
  }

  const rawUsers = await fetchAllPaginated<GlpiUser>(
    GLPI_ENDPOINTS.USER,
    queryParams,
  );

  return rawUsers.map(mapGlpiUserToUser);
}

// ─── Fetch un utilisateur par ID ──────────────────────────────────────────────

export async function fetchUserById(id: number): Promise<User> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiUser>(`${GLPI_ENDPOINTS.USER}/${id}`);
  return mapGlpiUserToUser(data);
}

// ─── Fetch l'utilisateur connecté ────────────────────────────────────────────

export async function fetchCurrentUser(): Promise<User> {
  const { default: glpiClient } = await import('./glpiClient');
  // getFullSession retourne les infos de la session active
  const { data } = await glpiClient.get('/getFullSession');
  const glpiUserData = data.session?.glpiID
    ? await fetchUserById(data.session.glpiID as number)
    : null;

  if (!glpiUserData) {
    throw new Error('[GLPI] Impossible de récupérer l\'utilisateur courant.');
  }
  return glpiUserData;
}
