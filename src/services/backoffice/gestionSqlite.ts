import { localHttpClient } from '@/services/localHttpClient'

export interface JourFerie {
  id: number
  dateFerie: string
  libelle: string
  creeLe?: string
  pourcentage: number
  fixe: number
}

export class GestionSqliteService {
  /**
   * Récupère la liste de tous les jours fériés stockés en local (SQLite)
   */
  async getJoursFeries(): Promise<JourFerie[]> {
    return await localHttpClient.get<JourFerie[]>('/jours-feries')
  }

  /**
   * Récupère un jour férié par sa date
   * - Si fixe === 1: compare seulement jour et mois (s'applique à toutes les années)
   * - Si fixe === 0: compare jour, mois et année
   */
  async getJourFerieByDate(date: string): Promise<JourFerie | undefined> {
    const joursFeries = await this.getJoursFeries()
    
    const dateToCheck = new Date(date)
    const dayToCheck = dateToCheck.getDate()
    const monthToCheck = dateToCheck.getMonth()
    const yearToCheck = dateToCheck.getFullYear()
    
    return joursFeries.find(jourFerie => {
      const jourFerieDate = new Date(jourFerie.dateFerie)
      const dayMatch = jourFerieDate.getDate() === dayToCheck
      const monthMatch = jourFerieDate.getMonth() === monthToCheck
      
      if (jourFerie.fixe === 1) {
        return dayMatch && monthMatch
      } else {
        const yearMatch = jourFerieDate.getFullYear() === yearToCheck
        return dayMatch && monthMatch && yearMatch
      }
    })
  }

  /**
   * Crée un nouveau jour férié
   */
  async createJourFerie(payload: { dateFerie: string, libelle: string, pourcentage: number, fixe: number }): Promise<any> {
    return await localHttpClient.post('/jours-feries', payload)
  }

  /**
   * Met à jour un jour férié existant
   */
  async updateJourFerie(id: number, payload: { dateFerie: string, libelle: string, pourcentage: number, fixe: number }): Promise<any> {
    return await localHttpClient.put(`/jours-feries/${id}`, payload)
  }

  /**
   * Supprime un jour férié par son identifiant
   */
  async deleteJourFerie(id: number): Promise<any> {
    return await localHttpClient.delete(`/jours-feries/${id}`)
  }
}

export const gestionSqliteService = new GestionSqliteService()
