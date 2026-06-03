/**
 * Modèle GLPI : Localisation (Location)
 * Endpoint API : GET /apirest.php/Location
 */

// ─── Interface brute API GLPI ─────────────────────────────────────────────────

export interface GlpiLocation {
  id: number;
  name: string;
  entities_id: number;
  locations_id: number;       // localisation parente
  completename?: string;      // ex: "Bâtiment A > Salle 101"
  level?: number;
  comment?: string;
  building?: string;
  room?: string;
  is_deleted: number;
  date_creation?: string;
  date_mod?: string;
}

// ─── Modèle local (store / SQLite) ───────────────────────────────────────────

export interface Location {
  id: number;
  name: string;
  entityId: number;
  parentId: number;
  fullPath?: string;
  level?: number;
  comment?: string;
  building?: string;
  room?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

export function mapGlpiLocationToLocation(raw: GlpiLocation): Location {
  return {
    id: raw.id,
    name: raw.name,
    entityId: raw.entities_id,
    parentId: raw.locations_id,
    fullPath: raw.completename,
    level: raw.level,
    comment: raw.comment,
    building: raw.building,
    room: raw.room,
    isDeleted: raw.is_deleted === 1,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}
