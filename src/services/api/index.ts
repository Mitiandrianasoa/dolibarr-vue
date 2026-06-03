/**
 * services/api/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel export — tous les services API GLPI
 *
 * Usage :
 *   import { initSession, fetchAllAssets, fetchAllTickets } from '@/services/api'
 */

export { initSession, killSession, getSessionToken, fetchAllPaginated, default as glpiClient } from './glpiClient';
export * from './userService';
export * from './assetService';
export * from './ticketService';
export * from './entityService';
export * from './locationService';
