import { httpClient } from '@/services/httpClient'
import { localHttpClient } from '@/services/localHttpClient'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

export interface ResetResult {
  category: string
  success: boolean
  count?: number
  message?: string
  error?: string
}

export class ReinitialisationService {
  /**
   * Vérifie l'authentification et configure le client HTTP
   */
  private setupAuth() {
    const token = dolibarrAuthService.getToken()
    if (!token) throw new Error('Non authentifié')
    httpClient.setApiKey(token)
  }

  /**
   * Supprime tous les utilisateurs (employés) sauf l'administrateur
   */
  async resetUser(): Promise<ResetResult> {
    try {
      this.setupAuth()
      const users = await httpClient.get<any[]>('/users').catch(() => [])
      
      const idsToDelete = users
        .filter(u => u.login !== 'dolibarr' && u.login !== 'admin')
        .map(u => parseInt(u.id))
      
      if (idsToDelete.length === 0) {
        return { category: 'Utilisateurs (employés)', success: true, count: 0, message: 'Aucun utilisateur à supprimer' }
      }

      let successCount = 0
      for (const id of idsToDelete) {
        try {
          await httpClient.delete(`/users/${id}`)
          successCount++
        } catch (e) {
          console.warn(`Erreur lors de la suppression de l'utilisateur ${id}`)
        }
      }

      return {
        category: 'Utilisateurs (employés)',
        success: successCount === idsToDelete.length,
        count: successCount,
        message: `${successCount}/${idsToDelete.length} utilisateurs supprimés`
      }
    } catch (error: any) {
      return { category: 'Utilisateurs (employés)', success: false, error: error.message }
    }
  }

  /**
   * Supprime tous les salaires et les paiements associés
   */
  async resetSalairePayements(): Promise<ResetResult> {
    try {
      this.setupAuth()
      const salaries = await httpClient.get<any[]>('/salaries').catch(() => [])
      
      if (salaries.length === 0) {
        return { category: 'Salaires et Paiements', success: true, count: 0, message: 'Aucun salaire à supprimer' }
      }

      const allPayments = await httpClient.get<any[]>('/salaries/payments').catch(() => [])
      
      let successCount = 0
      for (const salary of salaries) {
        // Supprimer d'abord les paiements de ce salaire
        const payments = allPayments.filter(p => Number(p.fk_salary) === Number(salary.id))
        for (const payment of payments) {
          try {
            await httpClient.delete(`/salaries/${payment.id}/payments`)
          } catch (e) {}
        }
        
        // Ensuite supprimer le salaire
        try {
          await httpClient.delete(`/salaries/${salary.id}`)
          successCount++
        } catch (e) {}
      }

      return {
        category: 'Salaires et Paiements',
        success: successCount === salaries.length,
        count: successCount,
        message: `${successCount}/${salaries.length} salaires (et leurs paiements) supprimés`
      }
    } catch (error: any) {
      return { category: 'Salaires et Paiements', success: false, error: error.message }
    }
  }

  /**
   * Supprime toutes les données SQLite locales (jours fériés)
   */
  async resetDonneesSqlite(): Promise<ResetResult> {
    try {
      const items = await localHttpClient.get<any[]>('/jours-feries').catch(() => [])
      
      let successCount = 0
      for (const item of items) {
        try {
          await localHttpClient.delete(`/jours-feries/${item.id}`)
          successCount++
        } catch (e) {}
      }
      
      return { category: 'Jours Fériés (SQLite)', success: true, count: successCount, message: `${successCount} données locales supprimées` }
    } catch (e: any) {
      return { category: 'Jours Fériés (SQLite)', success: false, error: e.message }
    }
  }

  /**
   * Lance la réinitialisation complète
   */
  async resetAll(): Promise<ResetResult[]> {
    const res1 = await this.resetSalairePayements()
    const res2 = await this.resetUser()
    const res3 = await this.resetDonneesSqlite()
    return [res1, res2, res3]
  }

  /**
   * Récupère des statistiques sur les données actuelles
   */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      'Salaires': 0,
      'Paiements': 0,
      'Utilisateurs (employés)': 0
    }
    
    try {
      this.setupAuth()
      const salaries = await httpClient.get<any[]>('/salaries').catch(() => [])
      stats['Salaires'] = salaries.length
      
      const payments = await httpClient.get<any[]>('/salaries/payments').catch(() => [])
      stats['Paiements'] = payments.length
      
      const users = await httpClient.get<any[]>('/users').catch(() => [])
      stats['Utilisateurs (employés)'] = users.filter(u => u.login !== 'dolibarr' && u.login !== 'admin').length
    } catch (e) {
      console.warn('Erreur lecture stats:', e)
    }
    
    return stats
  }
}

export const reinitialisationService = new ReinitialisationService()
