import {
  saveTicketCost,
  deleteLatestTicketCost,
  getAllTicketCostsByIdTicket
} from '../api/ticketCostService'
import { glpiClient } from '../api/glpiClient'

export interface TicketInfo {
  id: number
  title: string
  types: string[]
}

export interface ProcessResult {
  success: boolean
  message: string
  cost?: number
}

/**
 * Met à jour le statut d'un ticket dans GLPI
 */
async function updateTicketStatus(ticketId: number, status: number): Promise<void> {
  try {
    await glpiClient.put(`/Ticket/${ticketId}`, {
      input: { status: status }
    })
    console.log(`[TicketCost] Ticket #${ticketId} → statut ${status}`)
  } catch (error) {
    console.error(`[TicketCost] Erreur mise à jour statut ticket #${ticketId}:`, error)
    throw error
  }
}

export async function processTicketCost(
  info: TicketInfo,
  mvt: 'open' | 'cancel' | 'closed',
  valeur: number | null,
  mode: number = 1
): Promise<ProcessResult> {

  console.log(`[TicketCost] Traitement ticket #${info.id} - mvt: ${mvt}, valeur: ${valeur}, mode: ${mode}`)

  // ─── CANCEL ─────────────────────────────────────────────────────
  if (mvt === 'cancel') {
    try {
      await deleteLatestTicketCost(info.id)
      await updateTicketStatus(info.id, 2)
      return { success: true, message: `Ticket #${info.id} annulé, dernier coût supprimé` }
    } catch (error) {
      return { success: false, message: `Erreur suppression: ${error}` }
    }
  }

  // ─── CLOSED ────────────────────────────────────────────────────
  if (mvt === 'closed') {
    // ✅ TOUJOURS enregistrer le supercost, même si valeur = 0 ou null
    // Le 0 est important : il entre dans la base de calcul des modes 3/4
    const cost = (valeur === null || isNaN(valeur as number)) ? 0 : valeur
    //version qui n'enregistre pas les valeur 0 
    // if (cost === 0) {
    //   try {
    //     await updateTicketStatus(info.id, 6)
    //     return {
    //       success: true,
    //       message: `Ticket #${info.id} fermé sans coût (valeur: ${valeur})`
    //     }
    //   } catch (error) {
    //     return { success: false, message: `Erreur fermeture ticket: ${error}` }
    //   }
    // }

    try {
      await saveTicketCost({
        ticketId: info.id,
        ticketTitle: info.title,
        fixedCost: cost,
        itemCount: info.types.length || 1,
        itemTypes: JSON.stringify(info.types),
        source: 'kanban',
      })

      await updateTicketStatus(info.id, 6)

      return {
        success: true,
        message: `Ticket #${info.id} fermé avec coût ${cost} Ar`,
        cost: cost
      }
    } catch (error) {
      return { success: false, message: `Erreur fermeture ticket: ${error}` }
    }
  }

  // ─── OPEN ──────────────────────────────────────────────────────
  if (mvt === 'open') {
    if (valeur === null || valeur <= 0) {
      return { success: false, message: `Pourcentage invalide: ${valeur}%` }
    }

    if (![1, 2, 3, 4].includes(mode)) {
      mode = 1
    }

    try {
      let baseCost = 0
      let modeLabel = ''

      // Récupérer tous les coûts du ticket et filtrer uniquement les supercosts (kanban)
      // Les modes 1/2/3/4 se basent UNIQUEMENT sur les supercosts, pas les reopen
      const allCosts = await getAllTicketCostsByIdTicket(info.id)
      const kanbanCosts = allCosts.filter(c => c.source === 'kanban')

      if (!kanbanCosts || kanbanCosts.length === 0) {
        return { success: false, message: 'Aucun supercost trouvé pour ce ticket' }
      }

      // Mode 1 : Dernier supercost (incluant les 0)
      if (mode === 1) {
        const latest = kanbanCosts[kanbanCosts.length - 1]
        baseCost = Number(latest.fixedCost) || 0
        modeLabel = `dernier supercost ${baseCost} Ar`
      }

      // Mode 2 : Premier supercost (incluant les 0)
      else if (mode === 2) {
        const first = kanbanCosts[0]
        baseCost = Number(first.fixedCost) || 0
        modeLabel = `premier supercost ${baseCost} Ar`
      }

      // Mode 3 : Moyenne des supercosts (tous inclus, même les 0)
      else if (mode === 3) {
        const sum = kanbanCosts.reduce((acc, t) => acc + (Number(t.fixedCost) || 0), 0)
        baseCost = sum / kanbanCosts.length   // divise par TOUS, y compris les 0
        modeLabel = `moyenne supercosts ${baseCost} Ar (${kanbanCosts.length} entrées)`
      }

      // Mode 4 : Somme des supercosts (tous inclus, même les 0)
      else if (mode === 4) {
        baseCost = kanbanCosts.reduce((acc, t) => acc + (Number(t.fixedCost) || 0), 0)
        modeLabel = `somme supercosts ${baseCost} Ar (${kanbanCosts.length} entrées)`
      }

      // Vérifier que baseCost est valide (peut être 0 si tous les supercosts sont 0)
      if (isNaN(baseCost) || baseCost < 0) {
        return {
          success: false,
          message: `Base de calcul invalide: ${baseCost} Ar`
        }
      }

      // ✅ Pas de Math.round : on stocke la valeur exacte pour éviter les erreurs cumulées
      const reopenCost = baseCost * (valeur / 100)

      await saveTicketCost({
        ticketId: info.id,
        ticketTitle: info.title,
        fixedCost: reopenCost,
        itemCount: info.types.length || 1,
        itemTypes: JSON.stringify(info.types),
        source: 'reopen',
      })

      await updateTicketStatus(info.id, 2)

      return {
        success: true,
        message: `${modeLabel} × ${valeur}% = ${reopenCost} Ar`,
        cost: reopenCost
      }

    } catch (error) {
      return { success: false, message: `Erreur: ${error}` }
    }
  }

  return { success: false, message: `Mouvement inconnu: ${mvt}` }
}