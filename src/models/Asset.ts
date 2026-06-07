/**
 * Modèles GLPI : Actifs / Inventory
 * Endpoints API :
 *   GET /apirest.php/Computer
 *   GET /apirest.php/Monitor
 *   GET /apirest.php/Printer
 */

// ─── Types communs ────────────────────────────────────────────────────────────

export type AssetType = 'computer' | 'monitor' | 'printer' | 'phone' | 'network';

/**
 * MODÈLE ASSET COMPLET
 * Compatible avec l'API GLPI et le composant Vue
 */
export interface Asset {
  id: number;
  name: string;
  itemtype: string;
  entities_id?: number;
  states_id?: number;      // Statut GLPI
  locations_id?: number;   // Localisation GLPI
  users_id?: number;       // Utilisateur GLPI
  serial?: string;
  otherserial?: string;    // Numéro d'inventaire
  date_mod?: string;
  is_deleted?: number;
  // Alias pour compatibilité avec le composant
  status?: number;
  locationId?: number;
  userId?: number;
  entityId?: number;
  inventoryNumber?: string;
  updatedAt?: string;
  type?: AssetType;
  [key: string]: any;
}

// ─── Mapper principal ─────────────────────────────────────────────────────────

/**
 * Transforme un objet brut de l'API en Asset
 */
export function mapRawToAsset(raw: any, itemtype: string): Asset {
  return {
    id: raw.id,
    name: raw.name || `Asset #${raw.id}`,
    itemtype: itemtype,
    entities_id: raw.entities_id || 0,
    states_id: raw.states_id || 1,
    locations_id: raw.locations_id,
    users_id: raw.users_id,
    serial: raw.serial,
    otherserial: raw.otherserial,
    date_mod: raw.date_mod,
    is_deleted: raw.is_deleted || 0,
    // Alias pour compatibilité avec le composant
    status: raw.states_id || 1,
    locationId: raw.locations_id,
    userId: raw.users_id,
    entityId: raw.entities_id || 0,
    inventoryNumber: raw.otherserial,
    updatedAt: raw.date_mod,
    type: itemtype.toLowerCase() as AssetType,
  };
}

/**
 * Version compatible avec le composant (avec champs normalisés)
 */
export function mapToAssetCompatible(raw: any, itemtype: string): Asset {
  return mapRawToAsset(raw, itemtype);
}

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

/**
 * Extrait la valeur d'un champ de recherche GLPI
 */
export function getSearchValue(row: Record<string, any>, field: number): string {
  const value = row[field] ?? row[String(field)];
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Normalise un asset pour garantir tous les champs requis
 */
export function normalizeAsset(asset: Partial<Asset>): Asset {
  return {
    id: asset.id || 0,
    name: asset.name || `Asset #${asset.id}`,
    itemtype: asset.itemtype || 'Computer',
    entities_id: asset.entities_id || 0,
    states_id: asset.states_id || 1,
    locations_id: asset.locations_id,
    users_id: asset.users_id,
    serial: asset.serial,
    otherserial: asset.otherserial,
    date_mod: asset.date_mod,
    is_deleted: asset.is_deleted || 0,
    status: asset.status || asset.states_id || 1,
    locationId: asset.locationId || asset.locations_id,
    userId: asset.userId || asset.users_id,
    entityId: asset.entityId || asset.entities_id || 0,
    inventoryNumber: asset.inventoryNumber || asset.otherserial,
    updatedAt: asset.updatedAt || asset.date_mod,
    type: asset.type || (asset.itemtype?.toLowerCase() as AssetType),
  };
}