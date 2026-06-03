/**
 * locationService.ts
 * Fetch des localisations GLPI
 * Endpoint : GET /apirest.php/Location
 */

import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS } from '@/constants/glpi';
import {
  type GlpiLocation,
  type Location,
  mapGlpiLocationToLocation,
} from '@/models/Location';

// ─── Fetch toutes les localisations ──────────────────────────────────────────

export async function fetchAllLocations(
  entityId?: number,
  includeDeleted = false,
): Promise<Location[]> {
  const params: Record<string, unknown> = {
    is_deleted: includeDeleted ? undefined : 0,
  };
  if (entityId !== undefined) params['searchText[entities_id]'] = entityId;

  const raw = await fetchAllPaginated<GlpiLocation>(
    GLPI_ENDPOINTS.LOCATION,
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)),
  );
  return raw.map(mapGlpiLocationToLocation);
}

// ─── Fetch une localisation par ID ───────────────────────────────────────────

export async function fetchLocationById(id: number): Promise<Location> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiLocation>(`${GLPI_ENDPOINTS.LOCATION}/${id}`);
  return mapGlpiLocationToLocation(data);
}

// ─── Fetch localisations enfants ──────────────────────────────────────────────

export async function fetchChildLocations(parentId: number): Promise<Location[]> {
  const all = await fetchAllLocations();
  return all.filter((l) => l.parentId === parentId);
}
