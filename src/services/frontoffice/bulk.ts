import { employeeService, type Employee } from './employee'
import { salaireService } from './salaire'
import { gestionSqliteService } from '../backoffice/gestionSqlite'
import { DateUtils } from '../../utils/dateUtils'

export interface BulkSalaryResult {
  employeeId: number
  employeeName: string
  success: boolean
  message?: string
}

export class BulkService {
  /**
   * Récupère la liste des postes uniques
   */
  async getPostes(): Promise<string[]> {
    const employees = await employeeService.getAllEmployee()
    const postes = employees.map(e => e.poste).filter((p): p is string => !!p)
    return [...new Set(postes)].sort()
  }

  /**
   * Récupère les employés filtrés
   */
  async getFilteredEmployees(filters: {
    poste?: string
    genre?: string
    weeklyhoursMin?: number | null
    weeklyhoursMax?: number | null
  }): Promise<Employee[]> {
    let results = await employeeService.getAllEmployee()

    if (filters.poste && filters.poste !== 'Tous') {
      results = results.filter(e => e.poste === filters.poste)
    }

    if (filters.genre && filters.genre !== 'Tous') {
      results = results.filter(e => e.genre === filters.genre)
    }

    if (filters.weeklyhoursMin !== undefined && filters.weeklyhoursMin !== null) {
      results = results.filter(e => e.weeklyhours !== null && e.weeklyhours >= filters.weeklyhoursMin!)
    }

    if (filters.weeklyhoursMax !== undefined && filters.weeklyhoursMax !== null) {
      results = results.filter(e => e.weeklyhours !== null && e.weeklyhours <= filters.weeklyhoursMax!)
    }

    return results
  }

  /**
   * Génère les salaires en masse pour les employés sélectionnés
   */
  async createBulkSalary(
    employees: Employee[], 
    payload: { datesp: string, dateep: string, amount: number }
  ): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []

    for (const employee of employees) {
      try {
        const employeeName = `${employee.prenom} ${employee.nom}`.trim()
        
        // Vérifier si un salaire existe déjà
        // const existingSalaries = await salaireService.getSalaryByEmployee(employee.id)
        // const datespTimestamp = new Date(payload.datesp).getTime() / 1000
        // const dateepTimestamp = new Date(payload.dateep).getTime() / 1000
        
        // const existing = existingSalaries.find(s => {
        //   const sDatesp = typeof s.datesp === 'string' ? parseInt(s.datesp) : s.datesp
        //   const sDateep = typeof s.dateep === 'string' ? parseInt(s.dateep) : s.dateep
        //   return Math.abs(sDatesp - datespTimestamp) < 86400 && Math.abs(sDateep - dateepTimestamp) < 86400
        // })

        // if (existing) {
        //   results.push({
        //     employeeId: employee.id,
        //     employeeName,
        //     success: false,
        //     message: `Un salaire existe déjà pour cette période (#${existing.id})`
        //   })
        //   continue
        // }

      const label = `Salaire ${new Date(payload.datesp).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
      const ferie = await gestionSqliteService.getJourFerieByDate(payload.datesp);
      // Convertir les dates en objets Date pour pouvoir extraire l'année
      const datespDate = new Date(payload.datesp);
      let shouldApplyFerie = false;
      let message = 'Salaire généré avec succès';

      if (ferie && ferie.pourcentage > 0) {
        if (ferie.fixe === 1) {
          // Férié fixe : s'applique tous les ans
          shouldApplyFerie = true;
          message = 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant';
        } else if (ferie.fixe === 0) {
          // Férié non fixe : vérifier que l'année correspond
          const ferieDate = new Date(ferie.dateFerie);
          if (datespDate.getFullYear() === ferieDate.getFullYear()) {
            shouldApplyFerie = true;
            message = 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant';
          }
        }
      }
      // if (ferie && ferie.fixe === 1 && ferie.pourcentage > 0) {
      //   await salaireService.createSalary({
      //     fk_user: employee.id,
      //     label: label,
      //     amount: payload.amount ,
      //     datesp: payload.datesp,
      //     dateep: payload.dateep
      //   })
        
        
      //   await salaireService.createSalary({
      //     fk_user: employee.id,
      //     label: 'next-month-pourcentage-salary of' + label,
      //     amount: payload.amount * ferie.pourcentage / 100,
      //     datesp: DateUtils.getNextMonth(payload.datesp),
      //     dateep: DateUtils.getNextMonth(payload.dateep)
      //   })

      //   results.push({
      //     employeeId: employee.id,
      //     employeeName,
      //     success: true,
      //     message: 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant'
      //   })
      // } 
      // if (ferie && ferie.fixe === 0 && ferie.pourcentage > 0 && (payload.datesp.getYear() === dateFerie.getYear())) {
      //     await salaireService.createSalary({
      //       fk_user: employee.id,
      //       label: label,
      //       amount: payload.amount ,
      //       datesp: payload.datesp,
      //       dateep: payload.dateep
      //     })
          
          
      //     await salaireService.createSalary({
      //       fk_user: employee.id,
      //       label: 'next-month-pourcentage-salary of' + label,
      //       amount: payload.amount * ferie.pourcentage / 100,
      //       datesp: DateUtils.getNextMonth(payload.datesp),
      //       dateep: DateUtils.getNextMonth(payload.dateep)
      //     })

      //     results.push({
      //       employeeId: employee.id,
      //       employeeName,
      //       success: true,
      //       message: 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant'
      //     })
      //   } 
      // else {
      //   await salaireService.createSalary({
      //     fk_user: employee.id,
      //     label: label,
      //     amount: payload.amount,
      //     datesp: payload.datesp,
      //     dateep: payload.dateep
      //   })

      //   results.push({
      //     employeeId: employee.id,
      //     employeeName,
      //     success: true,
      //     message: 'Salaire généré avec succès'
      //   })
      // }
      // Créer le salaire principal
      await salaireService.createSalary({
        fk_user: employee.id,
        label: label,
        amount: payload.amount,
        datesp: payload.datesp,
        dateep: payload.dateep
      });

      // Si c'est un férié applicable, créer le salaire du mois suivant avec pourcentage
      if (shouldApplyFerie) {
        console.log("Apply Ferie pourcentage next Month")
        await salaireService.createSalary({
          fk_user: employee.id,
          label: `next-month-pourcentage-salary of ${label}`,
          amount: payload.amount * (ferie!.pourcentage / 100),
          datesp: DateUtils.getNextMonth(payload.datesp),
          dateep: DateUtils.getNextMonth(payload.dateep)
        });
      }

      results.push({
          employeeId: employee.id,
          employeeName,
          success: true,
          message: message
        });

      } catch (error: any) {
        results.push({
          employeeId: employee.id,
          employeeName: `${employee.prenom} ${employee.nom}`.trim(),
          success: false,
          message: error.message || 'Erreur lors de la création'
        })
      }
    }

    return results
  }
}

export const bulkService = new BulkService()
