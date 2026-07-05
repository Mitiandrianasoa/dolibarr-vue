import { localHttpClient } from '@/services/localHttpClient'
import { DateUtils } from '@/utils/dateUtils'

// mode: 0 = jour, 1 = nuit, 2 = jour et nuit
export interface JourFerie {
  id: number
  dateFerie: string
  libelle: string
  creeLe?: string
  pourcentage: number
  fixe: number
  mode: number
}

export class GestionSqliteService {
  /**
   * Récupère la liste de tous les jours fériés stockés en local (SQLite)
   */
  async getJoursFeries(): Promise<JourFerie[]> {
    return await localHttpClient.get<JourFerie[]>('/jours-feries')
  }

    /**
   * Retourne tous les jours fériés qui tombent entre datesp et dateep (inclus)
   * - fixe = 1 : on teste le jour/mois du férié pour CHAQUE année couverte par la période
   * - fixe = 0 : on teste la date exacte (jour+mois+année) du férié
   */
  async getJoursFeriesInRange(datesp: string, dateep: string): Promise<JourFerie[]> {
    const joursFeries = await this.getJoursFeries()

    return joursFeries.filter(jourFerie => {
      if (jourFerie.fixe === 1) {
        const ferieDate = DateUtils.parseLocalDate(jourFerie.dateFerie)
        return DateUtils.isFixedHolidayInRange(ferieDate.getMonth(), ferieDate.getDate(), datesp, dateep)
      } else {
        return DateUtils.isInRange(jourFerie.dateFerie, datesp, dateep)
      }
    })
  }

  /**
   * Récupère un jour férié par sa date
   * - Si fixe === 1: compare seulement jour et mois (s'applique à toutes les années)
   * - Si fixe === 0: compare jour, mois et année
   */
  async getJourFerieByDate(date: string): Promise<JourFerie | undefined> {
    const joursFeries = await this.getJoursFeries()

    const d = DateUtils.parseLocalDate(date)
    const dayToCheck   = d.getDate()
    const monthToCheck = d.getMonth()
    const yearToCheck  = d.getFullYear()

    return joursFeries.find(jourFerie => {
      const f = DateUtils.parseLocalDate(jourFerie.dateFerie)
      const dayMatch   = f.getDate()     === dayToCheck
      const monthMatch = f.getMonth()    === monthToCheck

      if (jourFerie.fixe === 1) {
        return dayMatch && monthMatch
      } else {
        return dayMatch && monthMatch && f.getFullYear() === yearToCheck
      }
    })
  }

  /**
   * Crée un nouveau jour férié
   */
  async createJourFerie(payload: { dateFerie: string, libelle: string, pourcentage: number, fixe: number, mode: number }): Promise<any> {
    return await localHttpClient.post('/jours-feries', payload)
  }

  /**
   * Met à jour un jour férié existant
   */
  async updateJourFerie(id: number, payload: { dateFerie: string, libelle: string, pourcentage: number, fixe: number, mode: number }): Promise<any> {
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
