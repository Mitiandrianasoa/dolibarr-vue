import { employeeService, type Employee } from './employee'
import { salaireService, type Salary } from './salaire'
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
      console.log(`Fériés dans la période pour ${employeeName}:`, feriesDansLaPeriode);
      // Ne garder que les fériés compatibles avec le mode du lot généré
      // mode 2 (jour et nuit) matche toujours, un mode non défini (ferié pas encore configuré) matche aussi,
      // sinon il faut une correspondance exacte de mode
      // const feriesApplicables = feriesDansLaPeriode.filter(ferie =>
      //   ferie.pourcentage > 0 && (ferie.mode == null || ferie.mode === 2 || payload.mode === 2 || ferie.mode === payload.mode)
      // );
      
      const feriesApplicables = feriesDansLaPeriode
      let message = 'Salaire généré avec succès';

      if (feriesApplicables.length > 0) {

        // Total de TOUS les salaires du mois pour cet employé (salaire de base + heures sup/primes
        // déjà existantes ce mois-ci, y compris celui qu'on vient de créer juste au-dessus).
        // getSalaireDuMois fait maintenant un vrai total (.reduce), plus un simple .find() qui ne
        // remontait que le premier enregistrement trouvé.
        const moisCourant = DateUtils.getYearMonthFromInput(payload.datesp);
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
            console.log(`salaire du mois courant: ${salaireMoisCourant} * pourcentage du jour férié: ${ferie.pourcentage} / 100 = ${salaireMoisCourant * (ferie.pourcentage / 100)}`);
            console.log(`Prime jour férié pour ${employeeName}: montant = ${salaireMoisCourant * (ferie.pourcentage / 100)}`);
          }
          //NUIT X 2
          if(payload.mode == 1){
            await salaireService.createSalary({
              fk_user: employee.id,
              label: `Prime jour férié (${ferie.libelle}) - ${label} - mode nuit`,
              amount: (salaireMoisCourant * (ferie.pourcentage / 100)) + 10,
              datesp: payload.datesp,
              dateep: payload.dateep
            });
            console.log(`salaire du mois courant: ${salaireMoisCourant} * pourcentage du jour férié: ${ferie.pourcentage} / 100 + 10 = ${salaireMoisCourant * (ferie.pourcentage / 100) + 10}`);
            console.log(`Prime jour férié pour ${employeeName}: montant = ${salaireMoisCourant * (ferie.pourcentage / 100) + 10}`);
          }
          //NUIT ET JOUR
          if(payload.mode == 2){
             await salaireService.createSalary({
              fk_user: employee.id,
              label: `Prime jour férié (${ferie.libelle}) - ${label}- mode jour et nuit`,
              amount:  (salaireMoisCourant * (ferie.pourcentage / 100)) + 20,
              datesp: payload.datesp,
              dateep: payload.dateep
            });
            console.log(`salaire du mois courant: ${salaireMoisCourant} * pourcentage du jour férié: ${ferie.pourcentage} / 100 + 20 = ${salaireMoisCourant * (ferie.pourcentage / 100) + 20}`);
            console.log(`Prime jour férié pour ${employeeName}: montant = ${salaireMoisCourant * (ferie.pourcentage / 100) + 20}`);
          }
        }

        message = `Salaire généré avec succès + ${feriesApplicables.length} prime(s) de jour férié`;
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
   * Retourne les intervalles de dates du mois qui NE SONT PAS déjà couverts
   * par un salaire existant.
   * @param salaires  salaires déjà présents pour le mois (datesp/dateep en timestamp Dolibarr)
   * @param annee     année (ex: 2026)
   * @param mois      mois 1-12 (ex: 7 pour juillet)
   */
  getIntervalleDate(
    salaires: Salary[],
    annee: number,
    mois: number
  ): { datesp: string, dateep: string, nbJours: number }[] {
    const lastDay = new Date(annee, mois, 0).getDate() // dernier jour du mois
    const pad = (n: number) => String(n).padStart(2, '0')
    const ymd = (day: number) => `${annee}-${pad(mois)}-${pad(day)}`

    // Marquer les jours déjà couverts par un salaire existant
    const occupe: boolean[] = new Array(lastDay + 1).fill(false)
    for (const s of salaires) {
      const debut = DateUtils.parseLocalDate(DateUtils.toInputFormat(s.datesp))
      const fin   = DateUtils.parseLocalDate(DateUtils.toInputFormat(s.dateep))
      for (let day = 1; day <= lastDay; day++) {
        const courant = new Date(annee, mois - 1, day)
        if (courant >= debut && courant <= fin) occupe[day] = true
      }
    }

    // Construire les intervalles de jours consécutifs NON occupés
    const intervalles: { datesp: string, dateep: string, nbJours: number }[] = []
    let start: number | null = null
    for (let day = 1; day <= lastDay; day++) {
      if (!occupe[day]) {
        if (start === null) start = day
      } else if (start !== null) {
        intervalles.push({ datesp: ymd(start), dateep: ymd(day - 1), nbJours: day - start })
        start = null
      }
    }
    if (start !== null) {
      intervalles.push({ datesp: ymd(start), dateep: ymd(lastDay), nbJours: lastDay - start + 1 })
    }
    return intervalles
  }

  /**
   * Génère les salaires du mois par intervalle de dates non encore couvert.
   * - salaireParJour  : salaire pour une journée
   * - pourcentageFerie: majoration (en %) appliquée par jour férié trouvé dans l'intervalle
   * Salaire d'une ligne = nbJours * salaireParJour + (nbFeries * salaireParJour * pourcentageFerie/100)
   */
  async createBulkSalaryByMonth(
    employees: Employee[],
    payload: { annee: number, mois: number, salaireParJour: number, pourcentageFerie: number }
  ): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []
    const pad = (n: number) => String(n).padStart(2, '0')
    const moisStr = `${payload.annee}-${pad(payload.mois)}`
    const moisLabel = DateUtils.parseLocalDate(`${moisStr}-01`)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    for (const employee of employees) {
      try {
        const employeeName = `${employee.prenom} ${employee.nom}`.trim()

        // Salaires déjà présents qui touchent ce mois
        const tousSalaires = await salaireService.getSalaryByEmployee(employee.id)
        const salairesDuMois = tousSalaires.filter(s => {
          const ymDebut = DateUtils.getYearMonth(s.datesp)
          const ymFin   = DateUtils.getYearMonth(s.dateep)
          return ymDebut !== null && ymFin !== null && ymDebut <= moisStr && moisStr <= ymFin
        })

        // Intervalles de dates NON couverts par un salaire existant
        const intervalles = this.getIntervalleDate(salairesDuMois, payload.annee, payload.mois)
        console.log(`Intervalles libres pour ${employeeName}:`, intervalles)

        if (intervalles.length === 0) {
          results.push({ employeeId: employee.id, employeeName, success: true, message: 'Aucun jour à générer (mois déjà couvert)' })
          continue
        }

        let nbLignes = 0
        for (const intervalle of intervalles) {
          const feries = await gestionSqliteService.getJoursFeriesInRange(intervalle.datesp, intervalle.dateep)
          const base = intervalle.nbJours * payload.salaireParJour
          const majoration = feries.length * payload.salaireParJour * (payload.pourcentageFerie / 100)
          const montant = base + majoration
          console.log(`[${employeeName}] ${intervalle.datesp} -> ${intervalle.dateep} : ${intervalle.nbJours}j x ${payload.salaireParJour} = ${base} | ${feries.length} ferie(s) majoration ${payload.pourcentageFerie}% = ${majoration} | total = ${montant}`)

          await salaireService.createSalary({
            fk_user: employee.id,
            label: `Salaire ${moisLabel} (${intervalle.datesp} au ${intervalle.dateep})`,
            amount: montant,
            datesp: intervalle.datesp,
            dateep: intervalle.dateep
          })
          nbLignes++
        }

        results.push({ employeeId: employee.id, employeeName, success: true, message: `${nbLignes} salaire(s) généré(s)` })
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

  
   /**
   * Bulk Salaire Normal
   */
  async createBulkSalaryNormal(
    employees: Employee[],
    payload: { datesp: string, dateep: string, amount: number, mode: number}
  ): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []

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

      let message = 'Salaire généré avec succès';
      console.log(`Paiement pour ${employeeName}: montant à payer = ${payload.amount},`)
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
   * Répartit un montant unique sur plusieurs salaires sélectionnés.
   * Priorité : salaires normaux (label "Salaire ...") d'abord, triés par date de début ASC (le plus ancien payé en premier),
   * puis les primes/heures sup ensuite (même tri par date). On paie chaque ligne jusqu'à épuisement du montant.
   */
  async BulkPayment(listSalaire: number[], montant: number): Promise<BulkSalaryResult[]> {
    const results: BulkSalaryResult[] = []

    const details = await Promise.all(listSalaire.map(id => salaireService.getSalary(id)))
    const aPayer = details.filter((s): s is Salary => s !== null && s.reste_a_payer > 0)

    const isSalaireNormal = (s: Salary) => s.label.startsWith('Salaire ')
    const tries = [...aPayer].sort((a, b) => {
      const prioriteA = isSalaireNormal(a) ? 0 : 1
      const prioriteB = isSalaireNormal(b) ? 0 : 1
      if (prioriteA !== prioriteB) return prioriteA - prioriteB
      // datesp est un timestamp Dolibarr (secondes) : comparaison numérique directe, pas de parsing de date nécessaire
      return Number(a.datesp) - Number(b.datesp)
    })

    let restant = montant
    const today = DateUtils.todayAsInput()

    for (const salaire of tries) {
      if (restant <= 0) break
      const montantPaye = Math.min(restant, salaire.reste_a_payer)
      if (montantPaye <= 0) continue
      console.log(`Paiement pour ${salaire.employee_name}: montant à payer = ${montantPaye}, restant = ${restant}`)
      try {
        await salaireService.createPayment(salaire.id, { datep: today, amount: montantPaye })
        restant -= montantPaye
        results.push({
          employeeId: salaire.id,
          employeeName: salaire.label,
          success: true,
          message: `Payé ${montantPaye.toFixed(2)} €`
        })
      } catch (error: any) {
        results.push({
          employeeId: salaire.id,
          employeeName: salaire.label,
          success: false,
          message: error.message || 'Erreur lors du paiement'
        })
      }
    }

    return results
  }



}

export const bulkService = new BulkService()
