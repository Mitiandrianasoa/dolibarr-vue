/**
 * Constantes GLPI — endpoints, statuts, types
 */

// ─── Endpoints REST GLPI ──────────────────────────────────────────────────────

export const GLPI_ENDPOINTS = {
  // Session
  INIT_SESSION: '/initSession',
  KILL_SESSION: '/killSession',
  GET_FULL_SESSION: '/getFullSession',

  // Modules principaux
  COMPUTER: '/Computer',
  MONITOR: '/Monitor',
  PRINTER: '/Printer',
  PHONE: '/Phone',
  NETWORK_EQUIPMENT: '/NetworkEquipment',
  SOFTWARE: '/Software',

  USER: '/User',
  GROUP: '/Group',
  PROFILE: '/Profile',

  TICKET: '/Ticket',
  TICKET_FOLLOWUP: '/ITILFollowup',
  TICKET_SOLUTION: '/ITILSolution',
  ITIL_CATEGORY: '/ITILCategory',

  ENTITY: '/Entity',
  LOCATION: '/Location',

  // Utilitaires
  LIST_SEARCH_OPTIONS: (itemType: string) => `/listSearchOptions/${itemType}`,
  SEARCH: (itemType: string) => `/search/${itemType}`,
} as const;

// ─── Statuts des actifs ───────────────────────────────────────────────────────

export const ASSET_STATUS = {
  IN_USE: 1,
  IN_STOCK: 2,
  RETIRED: 3,
  PENDING: 4,
  OUT_OF_SERVICE: 5,
} as const;

export const ASSET_STATUS_LABELS: Record<number, string> = {
  1: 'En service',
  2: 'En stock',
  3: 'Réformé',
  4: 'En attente',
  5: 'Hors service',
};

// ─── Statuts des tickets ──────────────────────────────────────────────────────

export const TICKET_STATUS = {
  NEW: 1,
  IN_PROGRESS_ASSIGNED: 2,
  IN_PROGRESS_PLANNED: 3,
  PENDING: 4,
  SOLVED: 5,
  CLOSED: 6,
} as const;

// ─── Types de tickets ─────────────────────────────────────────────────────────

export const TICKET_TYPE = {
  INCIDENT: 1,
  REQUEST: 2,
} as const;

// ─── Pagination par défaut ────────────────────────────────────────────────────

export const GLPI_PAGINATION = {
  DEFAULT_RANGE_START: 0,
  DEFAULT_RANGE_END: 49,     // 50 items max par requête
  MAX_PAGE_SIZE: 100,
} as const;
