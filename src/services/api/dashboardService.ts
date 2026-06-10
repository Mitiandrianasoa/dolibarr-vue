// src/services/api/dashboardService.ts

import { glpiClient } from './glpiClient';

export interface DashboardStats {
  assets: {
    total: number;
    byType: Record<string, number>;
     byStatus: Record<string, number>; 
  };
  tickets: {
    total: number;
    byType: Record<number, number>;  // 1=Incident, 2=Demande
    openCount: number;
     byStatus: Record<number, number>; 
  };
}


// Ajouter les labels des statuts d'assets
export const ASSET_STATUS_LABELS: Record<string, string> = {
  'En service': 'En service',
  'En production': 'En service',
  'En stock': 'En stock',
  'Réformé': 'Réformé',
  'En maintenance': 'En maintenance',
  'En panne': 'En panne'
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  'En service': 'green',
  'En production': 'green',
  'En stock': 'yellow',
  'Réformé': 'red',
  'En maintenance': 'orange',
  'En panne': 'red'
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  'Computer': 'Ordinateurs',
  'Monitor': 'Écrans',
  'Printer': 'Imprimantes',
  'Phone': 'Téléphones',
  'NetworkEquipment': 'Réseau',
  'Peripheral': 'Périphériques',
};

export const TICKET_TYPE_LABELS: Record<number, string> = {
  1: 'Incidents',
  2: 'Demandes'
};

export const TICKET_STATUS_LABELS: Record<number, string> = {
  1: 'Nouveau',
  2: 'En cours',
  3: 'Planifié',
  4: 'En attente',
  5: 'Résolu',
  6: 'Fermé'
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

async function getAssetsStats(): Promise<{ total: number; byType: Record<string, number>; byStatus: Record<string, number> }> {
  const urlParams = new URLSearchParams();
  urlParams.append('expand_dropdowns', 'true');
  urlParams.append('range', '0-999');
  
  const { data } = await glpiClient.get(`/search/AllAssets?${urlParams.toString()}`);
  
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let total = 0;
  
  (data.data || []).forEach((item: any) => {
    // Type
    const type = item.itemtype || 'Unknown';
    byType[type] = (byType[type] || 0) + 1;
    
    // Statut (champ '31' dans AllAssets)
    let status = item['31'] || 'Inconnu';
    if (typeof status === 'object' && status !== null) {
      status = status.name || status.completename || 'Inconnu';
    }
    // Normaliser le statut
    if (status === 'En production' || status === 'En service') {
      status = 'En service';
    }
    byStatus[status] = (byStatus[status] || 0) + 1;
    
    total++;
  });
  
  return { total, byType, byStatus };
}

async function getTicketsStats(): Promise<{ total: number; byType: Record<number, number>; openCount: number; byStatus: Record<number, number> }> {
  const { data } = await glpiClient.get('/Ticket?expand_dropdowns=true&range=0-999');
  
  const byType: Record<number, number> = { 1: 0, 2: 0 };
  const byStatus: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let total = 0;
  let openCount = 0;
  
  const tickets = Array.isArray(data) ? data : (data.data || []);
  
  tickets.forEach((ticket: any) => {
    // Type
    let typeId = ticket.type;
    if (typeof typeId === 'object' && typeId !== null) typeId = typeId.id;
    typeId = Number(typeId);
    if (typeId !== 1 && typeId !== 2) typeId = 1;
    byType[typeId] = (byType[typeId] || 0) + 1;
    
    // Statut
    let statusId = ticket.status;
    if (typeof statusId === 'object' && statusId !== null) statusId = statusId.id;
    statusId = Number(statusId) || 1;
    byStatus[statusId] = (byStatus[statusId] || 0) + 1;
    
    total++;
    
    // Tickets ouverts = statuts 1,2,3,4
    if (statusId >= 1 && statusId <= 4) openCount++;
  });
  
  console.log('📊 Stats tickets:', { total, byType, byStatus, openCount });
  
  return { total, byType, openCount, byStatus };
}