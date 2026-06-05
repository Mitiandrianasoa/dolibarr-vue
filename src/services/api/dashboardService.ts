import { fetchAllComputers, fetchAllMonitors } from './assetService';
import { fetchAllSoftware } from './softwareService';
// import { fetchAllSoftware } from './softwareService';
import type { DashboardMetrics } from '../../models/ticket'
import { fetchAllTickets } from './ticketService';

export async function getDashboardMetrics() {
  const [computers, monitors, software, tickets] = await Promise.all([
    fetchAllComputers(),
    fetchAllMonitors(),
    fetchAllSoftware(),
    fetchAllTickets(),
  ]);

  const totalAssets = computers.length + monitors.length + software.length;
  const assetsByType = {
    computers: computers.length,
    monitors: monitors.length,
    softwares: software.length,
  };

  const totalTickets = tickets.length;
  const ticketsByType = {
    incidents: tickets.filter(t => t.type === 1).length,
    demandes: tickets.filter(t => t.type === 2).length,
  };

  return {
    totalAssets,
    assetsByType,
    totalTickets,
    ticketsByType,
  };
}
