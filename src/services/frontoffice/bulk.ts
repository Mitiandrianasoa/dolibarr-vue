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
   * mode: 0 = jour, 1 = nuit, 2 = jour et nuit (mode de travail du lot généré)
   */
  async createBulkSalary(
    employees: Employee[],
    payload: { datesp: string, dateep: string, amount: number, mode: number}
  ): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []
    // payload.datesp est une chaîne 'YYYY-MM-DD' (input date), pas un timestamp Dolibarr :
    // DateUtils.getYearMonth ferait un parseInt('2026-07-01') = 2026 et casserait le calcul,
    // il faut la variante "input" dédiée aux strings de formulaire.
    const moisCourant = DateUtils.getYearMonthFromInput(payload.datesp)

    for (const employee of employees) {
      try {
      const employeeName = `${employee.prenom} ${employee.nom}`.trim()
      const label = `Salaire ${DateUtils.parseLocalDate(payload.datesp).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`

      // Créer le salaire principal
      await salaireService.createSalary({
        fk_user: employee.id,
        label: label,
        amount: payload.amount,
        datesp: payload.datesp,
        dateep: payload.dateep
      });

      // getJoursFeriesInRange renvoie un TABLEAU (il peut y avoir plusieurs fériés dans la période)
      const feriesDansLaPeriode = await gestionSqliteService.getJoursFeriesInRange(payload.datesp, payload.dateep);

      // Ne garder que les fériés compatibles avec le mode du lot généré
      // mode 2 (jour et nuit) matche toujours, sinon il faut une correspondance exacte de mode
      const feriesApplicables = feriesDansLaPeriode.filter(ferie =>
        ferie.pourcentage > 0 && (ferie.mode === 2 || payload.mode === 2 || ferie.mode === payload.mode)
      );

      let message = 'Salaire généré avec succès';

      if (feriesApplicables.length > 0) {

        // Relire le montant réel du salaire du mois qu'on vient de créer
        const salaireMoisCourant = await salaireService.getSalaireDuMois(employee.id, moisCourant);
        console.log(`Salaire du mois courant pour ${employeeName}: ${salaireMoisCourant}`);
        // const datespMoisSuivant = DateUtils.getNextMonth(payload.datesp);
        // const dateepMoisSuivant = DateUtils.getNextMonth(payload.dateep);

        // Une ligne de prime par jour férié applicable (gère le cas de plusieurs fériés dans la période)
        for (const ferie of feriesApplicables) {
          console.log("Apply Ferie pourcentage next Month", ferie.libelle)
          // NOUR NORMAL
          if(payload.mode == 0){
              await salaireService.createSalary({
              fk_user: employee.id,
              label: `Prime jour férié (${ferie.libelle}) - ${label} -mode jour`,
              amount: salaireMoisCourant * (ferie.pourcentage / 100),
              datesp: payload.datesp,
              dateep: payload.dateep
            });
          }
          //NUIT X 2
          if(payload.mode == 1){
            await salaireService.createSalary({
              fk_user: employee.id,
              label: `Prime jour férié (${ferie.libelle}) - ${label} - mode nuit`,
              amount: (salaireMoisCourant * (ferie.pourcentage / 100)) * 2,
              datesp: payload.datesp,
              dateep: payload.dateep
            });
          }
          //NUIT ET JOUR
          if(payload.mode == 2){
             await salaireService.createSalary({
              fk_user: employee.id,
              label: `Prime jour férié (${ferie.libelle}) - ${label}- mode jour et nuit`,
              amount: salaireMoisCourant * 2,
              datesp: payload.datesp,
              dateep: payload.dateep
            });
          }
        }

        message = `Salaire généré avec succès + ${feriesApplicables.length} prime(s) de jour férié pour le mois suivant`;
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


  /**
   * Génère les salaires en masse pour les employés sélectionnés
   */
  async createBulkSalaryWithNextMonthAugmentation(
    employees: Employee[], 
    payload: { datesp: string, dateep: string, amount: number }
  ): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []

    for (const employee of employees) {
      try {
      const employeeName = `${employee.prenom} ${employee.nom}`.trim()
      const label = `Salaire ${DateUtils.parseLocalDate(payload.datesp).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
      const ferie = await gestionSqliteService.getJourFerieByDate(payload.datesp);

      // Convertir les dates en objets Date pour pouvoir extraire l'année
      const datespDate = DateUtils.parseLocalDate(payload.datesp);
      let shouldApplyFerie = false;
      let message = 'Salaire généré avec succès';

      if (ferie && ferie.pourcentage > 0) {
        if (ferie.fixe === 1) {
          // Férié fixe : s'applique tous les ans
          shouldApplyFerie = true;
          message = 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant';
        } else if (ferie.fixe === 0) {
          // Férié non fixe : vérifier que l'année correspond
          const ferieDate = DateUtils.parseLocalDate(ferie.dateFerie);
          if (datespDate.getFullYear() === ferieDate.getFullYear()) {
            shouldApplyFerie = true;
            message = 'Salaire généré avec succès + pourcentage du jour férié pour le mois suivant';
          }
        }
      }
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
