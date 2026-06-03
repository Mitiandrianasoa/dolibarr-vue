/**
 * Modèle GLPI : Entité (Entity / Organisation)
 * Endpoint API : GET /apirest.php/Entity
 */

// ─── Interface brute API GLPI ─────────────────────────────────────────────────

export interface GlpiEntity {
  id: number;
  name: string;
  entities_id: number;        // entité parente (0 = racine)
  completename?: string;      // chemin complet ex: "Root > Dept > Service"
  level?: number;             // niveau hiérarchique (0 = racine)
  comment?: string;
  address?: string;
  postcode?: string;
  town?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_deleted: number;
  date_creation?: string;
  date_mod?: string;
}

// ─── Modèle local (store / SQLite) ───────────────────────────────────────────

export interface Entity {
  id: number;
  name: string;
  parentId: number;           // 0 = entité racine
  fullPath?: string;          // chemin complet hiérarchique
  level?: number;
  comment?: string;
  address?: string;
  postcode?: string;
  town?: string;
  country?: string;
  phone?: string;
  email?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

export function mapGlpiEntityToEntity(raw: GlpiEntity): Entity {
  return {
    id: raw.id,
    name: raw.name,
    parentId: raw.entities_id,
    fullPath: raw.completename,
    level: raw.level,
    comment: raw.comment,
    address: raw.address,
    postcode: raw.postcode,
    town: raw.town,
    country: raw.country,
    phone: raw.phone,
    email: raw.email,
    isDeleted: raw.is_deleted === 1,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}
