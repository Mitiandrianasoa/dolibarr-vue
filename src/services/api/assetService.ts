/**
 * assetService.ts
 * Fetch des actifs GLPI : Computers, Monitors, Printers
 * Endpoints :
 *   GET /apirest.php/Computer
 *   GET /apirest.php/Monitor
 *   GET /apirest.php/Printer
 */

import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS } from '@/constants/glpi';
import {
  type Asset,
  type AssetType,
  type GlpiComputer,
  type GlpiMonitor,
  type GlpiPrinter,
  mapGlpiComputerToAsset,
  mapGlpiMonitorToAsset,
  mapGlpiPrinterToAsset,
} from '@/models/Asset';

// ─── Paramètres de recherche communs ─────────────────────────────────────────

export interface AssetSearchParams {
  entityId?: number;
  locationId?: number;
  userId?: number;
  status?: number;
  includeDeleted?: boolean;
}

function buildBaseParams(params: AssetSearchParams): Record<string, unknown> {
  const q: Record<string, unknown> = {
    is_deleted: params.includeDeleted ? undefined : 0,
  };
  if (params.entityId   !== undefined) q['searchText[entities_id]']  = params.entityId;
  if (params.locationId !== undefined) q['searchText[locations_id]'] = params.locationId;
  if (params.userId     !== undefined) q['searchText[users_id]']     = params.userId;
  if (params.status     !== undefined) q['searchText[states_id]']    = params.status;
  // Supprimer les clés undefined
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined));
}

// ─── Computers ────────────────────────────────────────────────────────────────

export async function fetchAllComputers(params: AssetSearchParams = {}): Promise<Asset[]> {
  const raw = await fetchAllPaginated<GlpiComputer>(
    GLPI_ENDPOINTS.COMPUTER,
    buildBaseParams(params),
  );
  return raw.map(mapGlpiComputerToAsset);
}

export async function fetchComputerById(id: number): Promise<Asset> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiComputer>(`${GLPI_ENDPOINTS.COMPUTER}/${id}`);
  return mapGlpiComputerToAsset(data);
}

// ─── Monitors ─────────────────────────────────────────────────────────────────

export async function fetchAllMonitors(params: AssetSearchParams = {}): Promise<Asset[]> {
  const raw = await fetchAllPaginated<GlpiMonitor>(
    GLPI_ENDPOINTS.MONITOR,
    buildBaseParams(params),
  );
  return raw.map(mapGlpiMonitorToAsset);
}

export async function fetchMonitorById(id: number): Promise<Asset> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiMonitor>(`${GLPI_ENDPOINTS.MONITOR}/${id}`);
  return mapGlpiMonitorToAsset(data);
}

// ─── Printers ─────────────────────────────────────────────────────────────────

export async function fetchAllPrinters(params: AssetSearchParams = {}): Promise<Asset[]> {
  const raw = await fetchAllPaginated<GlpiPrinter>(
    GLPI_ENDPOINTS.PRINTER,
    buildBaseParams(params),
  );
  return raw.map(mapGlpiPrinterToAsset);
}

export async function fetchPrinterById(id: number): Promise<Asset> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiPrinter>(`${GLPI_ENDPOINTS.PRINTER}/${id}`);
  return mapGlpiPrinterToAsset(data);
}

// ─── Fetch tous les actifs (toutes catégories) ────────────────────────────────

export async function fetchAllAssets(params: AssetSearchParams = {}): Promise<Asset[]> {
  const [computers, monitors, printers] = await Promise.all([
    fetchAllComputers(params),
    fetchAllMonitors(params),
    fetchAllPrinters(params),
  ]);
  return [...computers, ...monitors, ...printers];
}

// ─── Fetch un actif par type + id ────────────────────────────────────────────

export async function fetchAssetByTypeAndId(type: AssetType, id: number): Promise<Asset> {
  switch (type) {
    case 'computer': return fetchComputerById(id);
    case 'monitor':  return fetchMonitorById(id);
    case 'printer':  return fetchPrinterById(id);
    default:
      throw new Error(`[assetService] Type d'actif non supporté : ${type}`);
  }
}
