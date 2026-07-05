import { httpClient } from '@/services/httpClient'
import { DateUtils } from '../../utils/dateUtils'

export interface Payment {
  id: number
  fk_salary: number
  datep: string | number
  amount: number
  num_payment: string
  note: string
}

export interface Salary {
  id: number
  fk_user: number
  employee_name: string
  label: string
  amount: number
  paye: number
  datesp: string | number
  dateep: string | number
  total_paye: number
  reste_a_payer: number
  status_label: string
  payments: Payment[]
}

export class SalaireService {
  /**
   * Récupère la liste de tous les salaires avec les informations de l'employé
   */
  async getSalaries(): Promise<Salary[]> {
    const [salaries, users] = await Promise.all([
      httpClient.get<any[]>('/salaries').catch(() => []),
      httpClient.get<any[]>('/users').catch(() => [])
    ])
    
    const userMap = new Map(users.map(u => [parseInt(u.id) || u.id, `${u.lastname || ''} ${u.firstname || ''}`.trim() || u.login]))

    return salaries.map(s => ({
      id: parseInt(s.id),
      fk_user: parseInt(s.fk_user),
      employee_name: userMap.get(parseInt(s.fk_user)) || 'Inconnu',
      label: s.label || '',
      amount: parseFloat(s.amount) || 0,
      paye: s.paye ? 1 : 0,
      datesp: s.datesp,
      dateep: s.dateep,
      total_paye: 0,
      reste_a_payer: parseFloat(s.amount) || 0,
      status_label: s.paye ? 'Payé' : 'Dû',
      payments: []
    }))
  }

  /**
   * Récupère les détails d'un salaire (incluant l'historique des paiements)
   */
  async getSalary(id: number): Promise<Salary | null> {
    try {
      const [salary, users, paymentsData] = await Promise.all([
        httpClient.get<any>(`/salaries/${id}`),
        httpClient.get<any[]>('/users').catch(() => []),
        this.getPaymentHistory(id)
      ])
      
      const user = users.find(u => (parseInt(u.id) || u.id) === parseInt(salary.fk_user))
      const employeeName = user ? `${user.lastname || ''} ${user.firstname || ''}`.trim() || user.login : 'Inconnu'
      
      const amount = parseFloat(salary.amount) || 0
      const total_paye = paymentsData.reduce((sum, p) => sum + p.amount, 0)
      const reste_a_payer = Math.max(0, amount - total_paye)
      
      let status_label = 'Dû'
      if (total_paye >= amount) status_label = 'Payé'
      else if (total_paye > 0) status_label = 'Partiellement payé'

      return {
        id: parseInt(salary.id),
        fk_user: parseInt(salary.fk_user),
        employee_name: employeeName,
        label: salary.label || '',
        amount: amount,
        paye: salary.paye ? 1 : 0,
        datesp: salary.datesp,
        dateep: salary.dateep,
        total_paye,
        reste_a_payer,
        status_label,
        payments: paymentsData
      }
    } catch (e) {
      console.error(`Erreur récupération du salaire ${id}:`, e)
      return null
    }
  }

  /**
   * Crée un nouveau salaire
   */
  async createSalary(data: { fk_user: number, label: string, amount: number, datesp: string, dateep: string }) {
    const datesp = new Date(data.datesp).getTime() / 1000
    const dateep = new Date(data.dateep).getTime() / 1000
    
    return await httpClient.post<any>('/salaries', {
      fk_user: data.fk_user,
      label: data.label,
      amount: data.amount,
      datesp: datesp,
      dateep: dateep,
      paye: 0
    })
  }

  /**
   * Met à jour un salaire
   */
  async updateSalary(id: number, data: { label?: string, amount?: number, datesp?: string, dateep?: string }) {
    const payload: any = { ...data }
    if (data.datesp) payload.datesp = new Date(data.datesp).getTime() / 1000
    if (data.dateep) payload.dateep = new Date(data.dateep).getTime() / 1000
    
    return await httpClient.put(`/salaries/${id}`, payload)
  }

  /**
   * Supprime un salaire
   */
  async deleteSalary(id: number) {
    return await httpClient.delete(`/salaries/${id}`)
  }

  // --- PAIEMENTS ---

  /**
   * Récupère l'historique des paiements pour un salaire donné
   */
  async getPaymentHistory(salaryId: number): Promise<Payment[]> {
    try {
      const allPayments = await httpClient.get<any[]>('/salaries/payments')
      const payments = allPayments.filter(p => Number(p.fk_salary) === salaryId)
      return payments.map(p => ({
        id: parseInt(p.id),
        fk_salary: parseInt(p.fk_salary),
        datep: p.datep || '',
        amount: parseFloat(p.amount) || 0,
        num_payment: p.chid || p.num_payment || '',
        note: p.note_public || ''
      }))
    } catch (e) {
      return []
    }
  }

  /**
   * Ajoute un paiement à un salaire
   */
  async createPayment(salaryId: number, data: { datep: string, amount: number, note?: string }) {
    const payload = {
      paiementtype: 6,
      datepaye: new Date(data.datep).getTime() / 1000,
      chid: `CHQ-${Date.now()}`,
      amounts: { [salaryId]: data.amount },
      note_public: data.note || ''
    }
    return await httpClient.post<any>(`/salaries/${salaryId}/payments`, payload)
  }

  /**
   * Supprime un paiement
   */
  async deletePayment(salaryId: number, paymentId: number) {
    return await httpClient.delete(`/salaries/${paymentId}/payments`)
  }

  /**
   * Paie intégralement le reste à payer d'un salaire
   */
  async payRest(salaryId: number, datep: string) {
    const detail = await this.getSalary(salaryId)
    if (!detail || detail.reste_a_payer <= 0) return
    return await this.createPayment(salaryId, { datep, amount: detail.reste_a_payer, note: 'Solde restant' })
  }

  /**
   * Récupère tous les salaires et paiements pour un employé spécifique
   */
  async getSalaryByEmployee(employeeId: number): Promise<Salary[]> {
    const allSalaries = await this.getSalaries()
    const employeeSalaries = allSalaries.filter(s => s.fk_user === employeeId)
    
    // Enrichir avec les paiements pour avoir le reste à payer exact
    const results = []
    for (const s of employeeSalaries) {
      const detail = await this.getSalary(s.id)
      if (detail) results.push(detail)
    }
    
    return results
  }

  /**
   * Récupère le montant du salaire d'un employé pour un mois donné ('YYYY-MM')
   * Utilisé pour calculer le pourcentage d'augmentation à partir du salaire réel du mois en cours
   */
  async getSalaireDuMois(employeeId: number, mois: string): Promise<number> {
    const salaires = await this.getSalaryByEmployee(employeeId)
    const salaireDuMois = salaires.find(s => DateUtils.getYearMonth(s.datesp) === mois)
    return salaireDuMois ? salaireDuMois.amount : 0
  }
}

export const salaireService = new SalaireService()
