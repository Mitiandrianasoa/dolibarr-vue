/**
 * Modèles GLPI : Actifs / Inventory
 * Endpoints API :
 *   GET /apirest.php/Computer
 *   GET /apirest.php/Monitor
 *   GET /apirest.php/Printer
 */
// ─── Types communs ────────────────────────────────────────────────────────────

export type AssetType = 'computer' | 'monitor' | 'printer' | 'phone' | 'network';
export type AssetStatus = number;

/**
 * MODÈLE UNIQUE ET FLEXIBLE
 * On garde les noms de champs originaux de GLPI pour éviter les mappers complexes.
 */
export interface Asset {
  id: number;
  name: string;
  itemtype: string;     // 'Computer', 'Monitor', etc.
  entities_id?: number;
  states_id?: number;
  [key: string]: any;   // Autorise tous les autres champs (serial, otherserial, etc.)
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Transforme un objet brut de l'API en Asset flexible.
 */
export function mapRawToAsset(raw: any, itemtype: string): Asset {
  return {
    ...raw,
    itemtype
  };
}
