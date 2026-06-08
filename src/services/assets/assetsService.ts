// src/services/assets/assetsService.ts

import { glpiClient } from '../api/glpiClient';

// ============================================================
// 1. TYPES
// ============================================================

export interface AssetSearchParams {
  text?: string;
  type?: string;
  entityId?: number;
  locationId?: number;
  userId?: number;
  status?: string;
  serial?: string;
  inventoryNumber?: string;
  includeDeleted?: boolean;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  status: string;
  entityId: number;
  entityName: string;
  locationId: number;
  locationName: string;
  userId: number;
  userName: string;
  serial: string | null;
  inventoryNumber: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  comment?: string | null;
}

// Cache pour la liste des assets (AllAssets)
let cachedAssetsList: { id: number; name: string; type: string; status?: string; serial?: string }[] | null = null;

// ============================================================
// 2. GET ASSETS - Récupère la liste de tous les assets (1 appel)
// ============================================================

export async function GetAssets(): Promise<{ id: number; name: string; type: string; status?: string; serial?: string }[]> {
  if (cachedAssetsList) {
    return cachedAssetsList;
  }

  console.log('🔄 Chargement de la liste des assets depuis AllAssets...');
  
  const urlParams = new URLSearchParams();
  urlParams.append('expand_dropdowns', 'true');
  urlParams.append('range', '0-999');
  
  const { data } = await glpiClient.get(`/search/AllAssets?${urlParams.toString()}`);
  
  const assetsList = (data.data || []).map((item: any) => ({
    id: item.id,
    name: item['1'] || 'Sans nom',
    type: item.itemtype || 'Unknown',
    status: item['31'] || undefined,
    serial: item['40'] || undefined
  }));
  
  console.log(`✅ ${assetsList.length} assets trouvés`);
  
  cachedAssetsList = assetsList;
  return assetsList;
}

// ============================================================
// 3. GET ASSET DETAILS - Récupère TOUS les détails d'un asset
//    Utilise l'endpoint /{itemtype}/{id} avec expand_dropdowns=true
// ============================================================

async function GetAssetDetails(itemtype: string, id: number): Promise<Asset | null> {
  try {
    // C'est CET endpoint qui donne TOUS les détails !
    const url = `/${itemtype}/${id}`;
    const urlParams = new URLSearchParams();
    urlParams.append('expand_dropdowns', 'true');
    
    const { data } = await glpiClient.get(`${url}?${urlParams.toString()}`);
    
    console.log(`📦 Détails ${itemtype}#${id}:`, {
      id: data.id,
      name: data.name,
      status: data.states_id,
      entity: data.entities_id,
      location: data.locations_id,
      user: data.users_id
    });
    
    return transformAsset(data, itemtype);
  } catch (error) {
    console.error(`Erreur chargement ${itemtype}#${id}:`, error);
    return null;
  }
}

// ============================================================
// 4. TRANSFORMATION - Adaptée à la réponse de /{itemtype}/{id}
// ============================================================
function transformAsset(item: any, defaultType?: string): Asset {
  const type = item.itemtype || defaultType || 'Unknown';
  const name = item.name || 'Sans nom';
  
  // Statut
  let status = 'Inconnu';
  const statusField = item.states_id || item.state || item.status;
  if (typeof statusField === 'object' && statusField !== null) {
    status = statusField.name || statusField.completename || 'Inconnu';
  } else if (typeof statusField === 'string') {
    status = statusField;
  } else if (typeof statusField === 'number') {
    const statusMap: Record<number, string> = {
      1: 'En service', 2: 'En stock', 3: 'Réformé',
      4: 'En maintenance', 5: 'En panne'
    };
    status = statusMap[statusField] || 'Inconnu';
  }
  
  // Entité, Localisation, Utilisateur - directement les strings
  const entityName = item.entity || item.entities_id || '-';
  const locationName = item.location || item.locations_id || '-';
  const userName = item.user || item.users_id || '-';
  
  return {
    id: item.id,
    name,
    type,
    status,
    entityId: 0,  // Pas d'ID car on a direct le nom
    entityName: typeof entityName === 'string' ? entityName : (entityName?.name || '-'),
    locationId: 0,
    locationName: typeof locationName === 'string' ? locationName : (locationName?.name || '-'),
    userId: 0,
    userName: typeof userName === 'string' ? userName : (userName?.name || '-'),
    serial: item.serial || null,
    inventoryNumber: item.otherserial || null,
    updatedAt: item.date_mod || null,
    createdAt: item.date_creation || null,
    comment: item.comment || null
  };
}

// ============================================================
// 5. SEARCH ASSETS - Recherche multicritère
// ============================================================

export async function SearchAssets(params: AssetSearchParams = {}): Promise<Asset[]> {
  console.log('🔍 Recherche avec paramètres:', params);
  
  // 1. Récupérer la liste de tous les assets (AllAssets)
  const allAssets = await GetAssets();
  
  // 2. Filtrage rapide sur les données d'AllAssets
  let filtered = [...allAssets];
  
  if (params.type && params.type !== '') {
    filtered = filtered.filter(a => a.type === params.type);
  }
  
  if (params.text?.trim()) {
    const searchText = params.text.trim().toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(searchText));
  }
  
  if (params.status?.trim()) {
    const searchStatus = params.status.trim().toLowerCase();
    filtered = filtered.filter(a => a.status?.toLowerCase().includes(searchStatus));
  }
  
  if (params.serial?.trim()) {
    const searchSerial = params.serial.trim().toLowerCase();
    filtered = filtered.filter(a => a.serial?.toLowerCase().includes(searchSerial));
  }
  
  console.log(`📊 Après filtrage rapide: ${filtered.length} assets`);
  
  // 3. Pour chaque asset, récupérer les détails complets
  const assets: Asset[] = [];
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(asset => GetAssetDetails(asset.type, asset.id))
    );
    assets.push(...batchResults.filter(a => a !== null));
  }
  
  // On retourne TOUS les résultats (sans filtrer entité/location/user)
  // Ces filtres seront appliqués dans le composant Vue
  return assets;
}

// ============================================================
// 6. FONCTIONS UTILITAIRES
// ============================================================

export async function GetAssetTypes(): Promise<{ value: string; label: string; count: number }[]> {
  const assets = await GetAssets();
  const counts = new Map<string, number>();
  
  assets.forEach(asset => {
    counts.set(asset.type, (counts.get(asset.type) || 0) + 1);
  });
  
  const results = Array.from(counts.entries())
    .map(([type, count]) => ({
      value: type,
      label: getTypeLabel(type),
      count
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  const totalCount = results.reduce((sum, t) => sum + t.count, 0);
  
  return [
    { value: '', label: 'Tous les types', count: totalCount },
    ...results
  ];
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'Computer': 'Ordinateurs',
    'Monitor': 'Écrans',
    'Printer': 'Imprimantes',
    'Phone': 'Téléphones',
    'NetworkEquipment': 'Réseau',
    'Peripheral': 'Périphériques'
  };
  return labels[type] || type;
}

export async function GetStatusOptions(): Promise<{ value: string; label: string }[]> {
  const assets = await GetAssets();
  const statusSet = new Set<string>();
  
  assets.forEach(asset => {
    if (asset.status && asset.status !== 'Inconnu') {
      statusSet.add(asset.status);
    }
  });
  
  const statuses = Array.from(statusSet).sort();
  
  return [
    { value: '', label: 'Tous les statuts' },
    ...statuses.map(s => ({ value: s, label: s }))
  ];
}

export async function RefreshCache(): Promise<void> {
  cachedAssetsList = null;
  await GetAssets();
}

export async function GetAssetById(type: string, id: number): Promise<Asset | null> {
  return GetAssetDetails(type, id);
}