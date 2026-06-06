/**
 * ticketService.ts
 * Fetch et gestion des tickets GLPI (Support / Helpdesk)
 * Endpoint : GET /apirest.php/Ticket
 */

import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS, TICKET_STATUS } from '@/constants/glpi';
import {
  type GlpiTicket,
  type Ticket,
  type TicketStatus,
  mapGlpiTicketToTicket,
} from '@/models/Ticket';

// ─── Paramètres de recherche ──────────────────────────────────────────────────

export interface TicketSearchParams {
  entityId?: number;
  status?: TicketStatus;
  requesterId?: number;
  assignedUserId?: number;
  includeDeleted?: boolean;
}

function buildTicketParams(params: TicketSearchParams): Record<string, unknown> {
  const q: Record<string, unknown> = {
    is_deleted: params.includeDeleted ? undefined : 0,
  };
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined));
}

// ─── Recherche multicritère des tickets ────────────────────────────────────────

export async function searchTickets(criteria: Array<{ field: string; searchtype: string; value: string }>): Promise<Ticket[]> {
  const { default: glpiClient } = await import('./glpiClient');
  
  // Construit l'objet param attendu par /search/Ticket
  // e.g. criteria[0][field]=12 & criteria[0][searchtype]=contains & criteria[0][value]=xyz
  const params: Record<string, string> = {};
  criteria.forEach((c, index) => {
    params[`criteria[${index}][field]`] = c.field;
    params[`criteria[${index}][searchtype]`] = c.searchtype;
    params[`criteria[${index}][value]`] = c.value;
  });

  // fetchAllPaginated can be used with /search/Ticket
  const raw = await fetchAllPaginated<Record<string, any>>(
    GLPI_ENDPOINTS.SEARCH('Ticket'),
    params
  );

  // Les endpoints de recherche (/search/xxx) renvoient des objets avec les identifiants des champs en clés
  // Il faut re-mapper cela pour obtenir des Ticket (ou bien utiliser GET /Ticket si possible)
  // Pour la consistance, ici on retourne un array vide si mapping complexe ou on peut relire via GET /Ticket/{id}
  // Pour l'instant, faisons un simple re-fetch par ID ou utilisons un format raw minimal
  const tickets: Ticket[] = [];
  for (const item of raw) {
    if (item[1]) { // field 1 is often ID or name, depends on searchOptions
      // Idéalement on fetch le ticket complet
      const t = await fetchTicketById(Number(item[2] || item.id || Object.values(item)[0]));
      if(t) tickets.push(t);
    }
  }
  return tickets;
}

// ─── Fetch tous les tickets ───────────────────────────────────────────────────

export async function fetchAllTickets(params: TicketSearchParams = {}): Promise<Ticket[]> {
  const raw = await fetchAllPaginated<GlpiTicket>(
    GLPI_ENDPOINTS.TICKET,
    buildTicketParams(params),
  );
  return raw.map(mapGlpiTicketToTicket);
}

// ─── Fetch un ticket par ID ───────────────────────────────────────────────────

export async function fetchTicketById(id: number): Promise<Ticket> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiTicket>(`${GLPI_ENDPOINTS.TICKET}/${id}`);
  return mapGlpiTicketToTicket(data);
}

// ─── Fetch les éléments liés à un ticket ──────────────────────────────────────

export async function fetchTicketItems(ticketId: number): Promise<any[]> {
  const { default: glpiClient } = await import('./glpiClient');
  // GLPI API : GET /Ticket/{id}/Item_Ticket
  const { data } = await glpiClient.get(`${GLPI_ENDPOINTS.TICKET}/${ticketId}/Item_Ticket`);
  return data;
}


// ─── Fetch tickets par statut (raccourcis utiles) ─────────────────────────────

export async function fetchOpenTickets(entityId?: number): Promise<Ticket[]> {
  const tickets = await fetchAllTickets({ entityId });
  return tickets.filter(
    (t) => t.status !== TICKET_STATUS.SOLVED && t.status !== TICKET_STATUS.CLOSED,
  );
}

export async function fetchSolvedTickets(entityId?: number): Promise<Ticket[]> {
  return fetchAllTickets({ status: TICKET_STATUS.SOLVED as TicketStatus, entityId });
}

export async function fetchClosedTickets(entityId?: number): Promise<Ticket[]> {
  return fetchAllTickets({ status: TICKET_STATUS.CLOSED as TicketStatus, entityId });
}

// ─── Créer un ticket ──────────────────────────────────────────────────────────

export interface CreateTicketPayload {
  name: string;
  content: string;
  type?: 1 | 2;         // 1=Incident, 2=Demande
  priority?: number;    // 1–6
  urgency?: number;     // 1–6
  entitiesId?: number;
  itilcategoriesId?: number;
  usersIdRecipient?: number;
}

export async function createTicket(payload: CreateTicketPayload): Promise<{ id: number }> {
  const { default: glpiClient } = await import('./glpiClient');
  const { getCurrentSession } = await import('./sessionService');
  
  const session = getCurrentSession();
  const currentEntityId = session ? session.glpiactive_entity : 0;
  const currentUserId = session ? session.glpiID : 0;

  const { data } = await glpiClient.post<{ id: number }>(GLPI_ENDPOINTS.TICKET, {
    input: {
      name: payload.name,
      content: payload.content,
      type: payload.type ?? 1,
      status: 1, // Nouveau
      urgency: payload.urgency ?? 3,
      impact: 3,
      priority: payload.priority ?? 3,
      entities_id: currentEntityId,
      requesttypes_id: 1,
      _users_id_requester: currentUserId,
      users_id_recipient: currentUserId,
    },
  });
  return data;
}

// ─── Associer un élément à un ticket ─────────────────────────────────────────

export async function associateItemToTicket(ticketId: number, itemType: string, itemId: number): Promise<void> {
  const { default: glpiClient } = await import('./glpiClient');
  // GLPI utilise l'endpoint /Item_Ticket pour lier du matériel à un ticket
  await glpiClient.post('/Item_Ticket', {
    input: {
      tickets_id: ticketId,
      itemtype: itemType,
      items_id: itemId,
    },
  });
}
