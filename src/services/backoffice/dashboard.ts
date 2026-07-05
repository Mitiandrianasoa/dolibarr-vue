// src/services/backoffice/dashboard.ts
import { httpClient } from '@/services/httpClient'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

export class DashboardService {
  private async getUsers() {
    const token = dolibarrAuthService.getToken()
    if (!token) throw new Error('Non authentifié')
    httpClient.setApiKey(token)
    const users = await httpClient.get<any[]>('/users')
    return users.filter(u => u.employee === '1' || u.employee === 1)
  }

  private async getSalaries() {
    const token = dolibarrAuthService.getToken()
    if (!token) throw new Error('Non authentifié')
    httpClient.setApiKey(token)
    try {
      return await httpClient.get<any[]>('/salaries')
    } catch {
      return []
    }
  }

  private async getPayments() {
    const token = dolibarrAuthService.getToken()
    if (!token) throw new Error('Non authentifié')
    httpClient.setApiKey(token)
    try {
      return await httpClient.get<any[]>('/salaries/payments')
    } catch {
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

  async GetSalaryByGender() {
    const users = await this.getUsers()
    const salaries = await this.getSalaries()
    
    const userGenreMap: Record<number, string> = {}
    users.forEach(u => { userGenreMap[u.id] = this.normalizeGenre(u.gender) })

    const genreMap: Record<string, number> = {}
    salaries.forEach(s => {
      const genre = userGenreMap[s.fk_user] || 'Non spécifié'
      if (!genreMap[genre]) genreMap[genre] = 0
      genreMap[genre] += parseFloat(s.amount) || 0
    })

    return Object.entries(genreMap).map(([genre, total_salary]) => ({ genre, total_salary }))
  }

  async GetPaymentByGender() {
    const users = await this.getUsers()
    const salaries = await this.getSalaries()
    const payments = await this.getPayments()

    const userGenreMap: Record<number, string> = {}
    users.forEach(u => { userGenreMap[u.id] = this.normalizeGenre(u.gender) })

    const salaryUserMap: Record<number, number> = {}
    salaries.forEach(s => { salaryUserMap[s.id] = s.fk_user })

    const genreMap: Record<string, number> = {}
    payments.forEach(p => {
      const userId = salaryUserMap[p.fk_salary]
      const genre = userId ? (userGenreMap[userId] || 'Non spécifié') : 'Non spécifié'
      if (!genreMap[genre]) genreMap[genre] = 0
      genreMap[genre] += parseFloat(p.amount) || 0
    })

    return Object.entries(genreMap).map(([genre, total_paid]) => ({ genre, total_paid }))
  }

  async CountByGender() {
    const users = await this.getUsers()
    const genreMap: Record<string, number> = {}
    users.forEach(u => {
      const genre = this.normalizeGenre(u.gender)
      if (!genreMap[genre]) genreMap[genre] = 0
      genreMap[genre]++
    })
    return Object.entries(genreMap).map(([genre, count]) => ({ genre, count }))
  }

  async GetSalaryPerMonth() {
    const salaries = await this.getSalaries()
    const moisMap: Record<string, { total_amount: number; count: number }> = {}

    salaries.forEach(s => {
      if (!s.datesp) return
      const ts = typeof s.datesp === 'number' ? s.datesp : parseInt(s.datesp)
      if (isNaN(ts) || ts <= 0) return
      
      // Ajout de 12h (43200s) pour éviter les décalages de fuseau horaire
      const d = new Date((ts + 43200) * 1000)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const mois = `${year}-${month}`
      
      const amount = parseFloat(s.amount) || 0

      if (!moisMap[mois]) {
        moisMap[mois] = { total_amount: 0, count: 0 }
      }
      moisMap[mois].total_amount += amount
      moisMap[mois].count++
    })

    const formatMonthLabel = (mois: string) => {
      const [year, month] = mois.split('-')
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
      return `${months[parseInt(month) - 1]} ${year}`
    }

    return Object.entries(moisMap)
      .map(([mois, data]) => ({
        mois,
        mois_label: formatMonthLabel(mois),
        total_amount: Math.round(data.total_amount * 100) / 100,
        count: data.count
      }))
      .sort((a, b) => a.mois.localeCompare(b.mois))
  }
  

  async getSalaireByMois(mois: string) {
    const salaries = await this.getSalaries()
    const users = await this.getUsers()

    const userMap: Record<string | number, any> = {}
    users.forEach(u => { 
      userMap[u.id] = u 
    })

    const results = salaries
      .filter(s => {
        const ts = typeof s.datesp === 'number' ? s.datesp : parseInt(s.datesp)
        if (isNaN(ts) || ts <= 0) return false
        
        // Ajout de 12h (43200s)
        const d = new Date((ts + 43200) * 1000)
        const sMois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return sMois === mois
      })
      .map(s => {
        const user = userMap[s.fk_user] || null
        
        const ts = typeof s.datesp === 'number' ? s.datesp : parseInt(s.datesp)
        const d = new Date((ts + 43200) * 1000)
        const dateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        
        return {
          salary_id: s.id,
          montant: parseFloat(s.amount) || 0,
          date_salaire: dateFormatted,
          label: s.label || '',
          est_paye: s.paye === '1' || s.paye === 1,
          employe_id: user?.id || null,
          employe_nom: user ? `${user.nom || ''} ${user.prenom || ''}`.trim() || user.login : 'Inconnu',
          genre: user ? this.normalizeGenre(user.gender) : 'Non spécifié'
        }
      })
      .sort((a, b) => new Date(b.date_salaire).getTime() - new Date(a.date_salaire).getTime())

    return results
  }

  // async getPaiementsByMois(mois: string) {
  //   const payments = await this.getPayments()
  //   const users = await this.getUsers()
  //   const salaries = await this.getSalaries()

  //   const salaryMap: Record<number, any> = {}
  //   salaries.forEach(s => { salaryMap[s.id] = s })

  //   const userMap: Record<number, any> = {}
  //   users.forEach(u => { userMap[u.id] = u })

  //   const results = payments
  //     .filter(p => {
  //       if (!p.datep) return false
  //       const ts = typeof p.datep === 'number' ? p.datep : parseInt(p.datep)
  //       if (isNaN(ts) || ts <= 0) return false
  //       const dateFormatted = new Date(ts * 1000).toISOString().split('T')[0]
  //       return dateFormatted.substring(0, 7) === mois
  //     })
  //     .map(p => {
  //       const salary = salaryMap[p.fk_salary]
  //       const user = salary ? userMap[salary.fk_user] : null
  //       const ts = typeof p.datep === 'number' ? p.datep : parseInt(p.datep)
  //       const dateFormatted = new Date(ts * 1000).toISOString().split('T')[0]
        
  //       return {
  //         payment_id: p.id,
  //         salary_id: p.fk_salary,
  //         montant: parseFloat(p.amount) || 0,
  //         date_reglement: dateFormatted,
  //         employe_id: user?.id || null,
  //         employe_nom: user ? `${user.lastname || ''} ${user.firstname || ''}`.trim() || user.login : 'Inconnu',
  //         genre: user ? this.normalizeGenre(user.gender) : 'Non spécifié'
  //       }
  //     })
  //     .sort((a, b) => new Date(b.date_reglement).getTime() - new Date(a.date_reglement).getTime())

  //   return results
  // }
}

export const dashboardService = new DashboardService()
