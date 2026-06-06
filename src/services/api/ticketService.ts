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
  if (params.entityId        !== undefined) q['searchText[entities_id]']       = params.entityId;
  if (params.status          !== undefined) q['searchText[status]']             = params.status;
  if (params.requesterId     !== undefined) q['searchText[users_id_recipient]'] = params.requesterId;
  if (params.assignedUserId  !== undefined) q['searchText[_users_id_assign]']   = params.assignedUserId;
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined));
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
  const { data } = await glpiClient.post<{ id: number }>(GLPI_ENDPOINTS.TICKET, {
    input: {
      name: payload.name,
      content: payload.content,
      type: payload.type ?? 1,
      priority: payload.priority ?? 3,
      urgency: payload.urgency ?? 3,
      entities_id: payload.entitiesId ?? 0,
      itilcategories_id: payload.itilcategoriesId,
      users_id_recipient: payload.usersIdRecipient,
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
