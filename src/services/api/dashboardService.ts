// src/services/api/dashboardService.ts

import { glpiClient } from './glpiClient';

export interface DashboardStats {
  assets: {
    total: number;
    byType: Record<string, number>;
  };
  tickets: {
    total: number;
    byType: Record<number, number>;  // 1=Incident, 2=Demande
    openCount: number;
  };
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  'Computer': 'Ordinateurs',
  'Monitor': 'Écrans',
  'Printer': 'Imprimantes',
  'Phone': 'Téléphones',
  'NetworkEquipment': 'Réseau'
};

export const TICKET_TYPE_LABELS: Record<number, string> = {
  1: 'Incidents',
  2: 'Demandes'
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [assetsStats, ticketsStats] = await Promise.all([
    getAssetsStats(),
    getTicketsStats()
  ]);
  
  return {
    assets: assetsStats,
    tickets: ticketsStats
  };
}

async function getAssetsStats(): Promise<{ total: number; byType: Record<string, number> }> {
  const urlParams = new URLSearchParams();
  urlParams.append('expand_dropdowns', 'true');
  urlParams.append('range', '0-999');
  
  const { data } = await glpiClient.get(`/search/AllAssets?${urlParams.toString()}`);
  
  const byType: Record<string, number> = {};
  let total = 0;
  
  (data.data || []).forEach((item: any) => {
    const type = item.itemtype || 'Unknown';
    byType[type] = (byType[type] || 0) + 1;
    total++;
  });
  
  return { total, byType };
}

async function getTicketsStats(): Promise<{ total: number; byType: Record<number, number>; openCount: number }> {
  // Utiliser fetchAllPaginated ou directement l'API
  const { data } = await glpiClient.get('/Ticket?expand_dropdowns=true&range=0-999');
  
  const byType: Record<number, number> = { 1: 0, 2: 0 };
  let total = 0;
  let openCount = 0;
  
  // Vérifier si data est un tableau (GET /Ticket) ou un objet avec data (si via search)
  const tickets = Array.isArray(data) ? data : (data.data || []);
  
  tickets.forEach((ticket: any) => {
    // Récupérer le type - peut être direct ou dans un objet
    let typeId = ticket.type;
    if (typeof typeId === 'object' && typeId !== null) {
      typeId = typeId.id;
    }
    typeId = Number(typeId);
    
    // Si typeId n'est pas 1 ou 2, essayer de le déterminer autrement
    if (typeId !== 1 && typeId !== 2) {
      // Par défaut, si c'est 0 ou autre, on considère comme Incident (1)
      typeId = 1;
    }
    
    // Récupérer le statut
    let statusId = ticket.status;
    if (typeof statusId === 'object' && statusId !== null) {
      statusId = statusId.id;
    }
    statusId = Number(statusId) || 1;
    
    // Compter par type
    byType[typeId] = (byType[typeId] || 0) + 1;
    total++;
    
    // Tickets ouverts = status 1,2,3,4 (Nouveau, En cours, Planifié, En attente)
    if (statusId >= 1 && statusId <= 4) {
      openCount++;
    }
  });
  
  console.log('📊 Stats tickets:', { total, byType, openCount });
  
  return { total, byType, openCount };
}