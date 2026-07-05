import { httpClient } from '@/services/httpClient'
import { DateUtils } from '@/utils/dateUtils'

export interface Employee {
  id: number
  login: string
  nom: string
  prenom: string
  genre: string
  weeklyhours: number | null
  employee: string | null
  date_embauche: string | null
  photo: string | null
  poste: string | null
  email: string | null
  telephone: string | null
}

export class EmployeeService {
  /**
   * Récupère la liste de tous les employés (utilisateurs marqués comme 'employee')
   */
  async getAllEmployee(): Promise<Employee[]> {
    try {
      const users = await httpClient.get<any[]>('/users')
      
      return users
        .filter(u => u.employee === '1' || u.employee === 1)
        .map(u => ({
          id: parseInt(u.id) || u.id,
          login: u.login || '',
          nom: u.lastname || '',
          prenom: u.firstname || '',
          genre: this.normalizeGenre(u.gender),
          weeklyhours: u.weeklyhours ? parseFloat(u.weeklyhours) : null,
          employee: u.employee || null,
          date_embauche: u.dateemployment ? DateUtils.toDisplayFormat(u.dateemployment) : null,
          photo: u.photo_vignette || u.photo || null,
          poste: u.job || u.poste || null,
          email: u.email || null,
          telephone: u.office_phone || u.user_mobile || null
        }))
    } catch (error) {
      console.error('Erreur récupération des employés:', error)
      return []
    }
  }

  private normalizeGenre(gender: string | null): string {
    if (!gender) return 'Non spécifié'
    const g = gender.toLowerCase()
    if (['homme', 'h', 'm', 'male', 'man'].includes(g)) return 'Homme'
    if (['femme', 'f', 'w', 'female', 'woman'].includes(g)) return 'Femme'
    return gender.charAt(0).toUpperCase() + gender.slice(1)
  }
}

export const employeeService = new EmployeeService()
