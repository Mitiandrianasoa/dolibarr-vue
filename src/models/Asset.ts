/**
 * Modèles GLPI : Actifs / Inventory
 * Endpoints API :
 *   GET /apirest.php/Computer
 *   GET /apirest.php/Monitor
 *   GET /apirest.php/Printer
 */

// ─── Types communs ────────────────────────────────────────────────────────────

export type AssetType = 'computer' | 'monitor' | 'printer' | 'phone' | 'network';

export type AssetStatus =
  | 1   // En production / En service
  | 2   // En stock
  | 3   // Réformé
  | 4   // En attente
  | 5   // Hors service
  | number;

// ─── Interface brute API GLPI (Computer) ─────────────────────────────────────

export interface GlpiComputer {
  id: number;
  name: string;
  serial?: string;
  otherserial?: string;         // inventaire interne
  entities_id: number;
  locations_id?: number;
  users_id?: number;            // utilisateur affecté
  groups_id?: number;
  states_id?: AssetStatus;      // statut
  is_deleted: number;
  is_template: number;
  date_creation?: string;
  date_mod?: string;
  comment?: string;
  operatingsystems_id?: number;
  manufacturers_id?: number;
  computertypes_id?: number;
}

// ─── Interface brute API GLPI (Monitor) ──────────────────────────────────────

export interface GlpiMonitor {
  id: number;
  name: string;
  serial?: string;
  entities_id: number;
  locations_id?: number;
  users_id?: number;
  states_id?: AssetStatus;
  is_deleted: number;
  date_creation?: string;
  date_mod?: string;
  comment?: string;
}

// ─── Interface brute API GLPI (Printer) ──────────────────────────────────────

export interface GlpiPrinter {
  id: number;
  name: string;
  serial?: string;
  entities_id: number;
  locations_id?: number;
  users_id?: number;
  states_id?: AssetStatus;
  is_deleted: number;
  date_creation?: string;
  date_mod?: string;
  comment?: string;
  have_usb?: number;
  have_ethernet?: number;
}

// ─── Modèle local unifié (store / SQLite) ─────────────────────────────────────

export interface Asset {
  id: number;
  type: AssetType;
  name: string;
  serial?: string;
  inventoryNumber?: string;
  entityId: number;
  locationId?: number;
  userId?: number;            // utilisateur affecté
  groupId?: number;
  status: AssetStatus;
  isDeleted: boolean;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapGlpiComputerToAsset(raw: GlpiComputer): Asset {
  return {
    id: raw.id,
    type: 'computer',
    name: raw.name,
    serial: raw.serial,
    inventoryNumber: raw.otherserial,
    entityId: raw.entities_id,
    locationId: raw.locations_id,
    userId: raw.users_id,
    groupId: raw.groups_id,
    status: raw.states_id ?? 0,
    isDeleted: raw.is_deleted === 1,
    comment: raw.comment,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}

export function mapGlpiMonitorToAsset(raw: GlpiMonitor): Asset {
  return {
    id: raw.id,
    type: 'monitor',
    name: raw.name,
    serial: raw.serial,
    entityId: raw.entities_id,
    locationId: raw.locations_id,
    userId: raw.users_id,
    status: raw.states_id ?? 0,
    isDeleted: raw.is_deleted === 1,
    comment: raw.comment,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}

export function mapGlpiPrinterToAsset(raw: GlpiPrinter): Asset {
  return {
    id: raw.id,
    type: 'printer',
    name: raw.name,
    serial: raw.serial,
    entityId: raw.entities_id,
    locationId: raw.locations_id,
    userId: raw.users_id,
    status: raw.states_id ?? 0,
    isDeleted: raw.is_deleted === 1,
    comment: raw.comment,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}
