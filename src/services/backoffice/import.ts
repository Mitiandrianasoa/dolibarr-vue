import Papa from 'papaparse'
import JSZip from 'jszip'
import { httpClient } from '@/services/httpClient'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'
import { RefIdMapper } from './RefIdMapper'

export interface ImportResultItem {
  ref: string
  ok: boolean
  message: string
}

export interface ImportSummary {
  employes: ImportResultItem[]
  salaires: ImportResultItem[]
  photos: ImportResultItem[]
}

export class ImportService {
  /**
   * Vérifie l'authentification et configure le client HTTP
   */
  private setupAuth() {
    const token = dolibarrAuthService.getToken()
    if (!token) throw new Error('Non authentifié')
    httpClient.setApiKey(token)
  }

  // --- OUTILS DE LECTURE (CSV, ZIP) ---

  /** Lit un fichier CSV et le transforme en tableau d'objets JSON */
  private readCsv<T>(file: File): Promise<T[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      })
    })
  }

  /** Extrait les images d'un fichier ZIP sous forme de dictionnaire (nom -> fichier) */
  private async readZipPhotos(zipFile: File): Promise<Record<string, Blob>> {
    const zip = await JSZip.loadAsync(zipFile)
    const photos: Record<string, Blob> = {}
    for (const filename of Object.keys(zip.files)) {
      const entry = zip.files[filename]
      if (entry.dir || !/\.(png|jpe?g|gif|webp)$/i.test(filename)) continue
      const blob = await entry.async('blob')
      const key = filename.split('/').pop()!.replace(/\.[^.]+$/, '') // nom sans extension
      photos[key] = blob
    }
    return photos
  }

  /** Convertit une date française (JJ/MM/AA) en timestamp */
  private parseDate(value: string): number | null {
    if (!value) return null
    const parts = value.trim().split('/')
    if (parts.length !== 3) return null
    let [d, m, y] = parts
    if (y.length === 2) y = '20' + y
    return Math.floor(new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`).getTime() / 1000)
  }

  /** Convertit un montant texte en nombre (ex: "1 200,50" -> 1200.5) */
  private parseMontant(value: string): number {
    if (!value) return 0
    return parseFloat(value.toString().replace(/\s/g, '').replace(',', '.')) || 0
  }

  // --- LOGIQUE D'IMPORTATION ---

  /** 1. Importation des Employés */
  private async importEmployes(rows: any[]): Promise<{ results: ImportResultItem[], mapper: RefIdMapper }> {
    const results: ImportResultItem[] = []
    const mapper = new RefIdMapper()

    // Récupérer les employés existants pour éviter les doublons
    const existingUsers = await httpClient.get<any[]>('/users').catch(() => [])

    for (const row of rows) {
      try {
        const existUser = existingUsers.find(u => u.login === row.identifiant)
        if (existUser) {
          const id = parseInt(existUser.id)
          mapper.add(row.ref_employe, id)
          results.push({ ref: row.ref_employe, ok: true, message: `Employé déjà existant (id: ${existUser.id})` })
          continue
        }

        const payload = {
          login: row.identifiant,
          password: row.mdp,
          lastname: row.nom,
          firstname: '',
          gender: row.genre?.toLowerCase() === 'femme' ? 'woman' : 'man',
          employee: 1,
          weeklyhours: this.parseMontant(row.heure_travail_semaine),
          job: row.poste || ''
        }

        const newId = await httpClient.post<number>('/users', payload)
        mapper.add(row.ref_employe, Number(newId))
        results.push({ ref: row.ref_employe, ok: true, message: `Employé créé` })

      } catch (error: any) {
        results.push({ ref: row.ref_employe, ok: false, message: error.message || "Erreur" })
      }
    }

    return { results, mapper }
  }

  /** 2. Importation des Salaires et de leurs Paiements */
  private async importSalaires(rows: any[], mapper: RefIdMapper): Promise<ImportResultItem[]> {
    const results: ImportResultItem[] = []
    console.log("\n=== [DEBUG] importSalaires ===")
    mapper.debugLog("Mapper pour salaires")

    for (const row of rows) {
      const dolibarrUserId = mapper.getId(row.ref_employe)
      console.log(`\n- Traitement salaire ${row.ref_salaire} avec ref_employe = "${row.ref_employe}" → ID: ${dolibarrUserId}`)
      
      if (!dolibarrUserId) {
        results.push({ ref: row.ref_salaire, ok: false, message: "Employé introuvable" })
        continue
      }

      try {
        const montant = this.parseMontant(row.montant)
        
        // Lire le champ paiement du CSV "{05/01/24, 500}, {20/01/24, 700}"
        let paiements: {date: string, montant: number}[] = []
        if (row.paiement) {
          try {
            const inner = row.paiement.trim().replace(/^\{/, '').replace(/\}$/, '')
            const arr = JSON.parse(`[${inner}]`) as [string, number][]
            paiements = arr.map(([date, montant]) => ({ date, montant }))
          } catch(e) {}
        }

        const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0)

        // Création du salaire
        const salaireId = await httpClient.post<number>('/salaries', {
          fk_user: dolibarrUserId,
          datesp: this.parseDate(row.date_debut),
          dateep: this.parseDate(row.date_fin),
          amount: montant,
          label: `Salaire ${row.date_debut} - ${row.date_fin}`,
          paye: totalPaye >= montant ? 1 : 0
        })

        // Création des paiements associés
        for (const p of paiements) {
          const datepTimestamp = this.parseDate(p.date)
          if (!datepTimestamp) continue

          await httpClient.post(`/salaries/${salaireId}/payments`, {
            paiementtype: 6,
            datepaye: datepTimestamp,
            chid: `CHQ-${Date.now()}`,
            amounts: { [salaireId]: p.montant },
            note_public: `Paiement CSV`
          }).catch(() => {})
        }

        results.push({ ref: row.ref_salaire, ok: true, message: `Salaire créé avec ${paiements.length} paiements` })

      } catch (error: any) {
        results.push({ ref: row.ref_salaire, ok: false, message: error.message || "Erreur" })
      }
    }

    return results
  }

  /** 3. Importation des Photos */
  private async importPhotos(photos: Record<string, Blob>, mapper: RefIdMapper): Promise<ImportResultItem[]> {
    const results: ImportResultItem[] = []
    console.log("\n=== [DEBUG] importPhotos ===")
    mapper.debugLog("Mapper pour photos")

    for (const [ref, blob] of Object.entries(photos)) {
      const dolibarrUserId = mapper.getId(ref)
      console.log(`\n- Traitement photo avec ref = "${ref}" → ID: ${dolibarrUserId}`)

      if (!dolibarrUserId) {
        results.push({ ref, ok: false, message: "Employé introuvable" })
        continue
      }

      try {
        // Convertir le Blob de la photo en Base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        const filename = `${ref}.png`

        // 1. Uploader la photo comme document attaché
        // IMPORTANT : pour modulepart='user', Dolibarr NE supporte PAS le paramètre "ref"
        // (voir api_documents.class.php::post() : 'user' n'est pas dans la liste des modulepart
        // gérés quand $ref est fourni -> RestException 500 "Modulepart user not implemented yet.")
        // Il faut passer par "subdir" (= l'id de l'utilisateur), qui construit le chemin générique
        // documents/users/{id}/ (le même chemin utilisé en interne par viewimage.php pour l'avatar).
        await httpClient.post('/documents/upload', {
          filename,
          modulepart: 'user',
          ref: '',                        // <-- laisser vide, ne PAS mettre l'id ici
          subdir: String(dolibarrUserId),  // <-- l'id ici, dans subdir
          filecontent: base64,
          fileencoding: 'base64',
          overwriteifexists: '1',
          generateThumbs: 1                // génère aussi les miniatures small/mini
        })

        // 2. Assigner la photo au profil utilisateur
        await httpClient.put(`/users/${dolibarrUserId}`, { photo: filename })

        results.push({ ref, ok: true, message: "Photo importée avec succès" })
      } catch (error: any) {
        console.error(`Erreur upload photo pour user ${dolibarrUserId} (ref: ${ref}):`, error?.response?.data || error)
        results.push({ ref, ok: false, message: error?.response?.data?.error?.message || "Erreur lors de l'upload de la photo" })
      }
    }

    return results
  }
  // --- ORCHESTRATEUR PRINCIPAL ---

  /**
   * Fonction principale qui orchestre les imports (fichiers optionnels)
   */
  async importAll(
    employesFile?: File,
    salairesFile?: File,
    photosZip?: File,
    onProgress?: (msg: string) => void
  ): Promise<ImportSummary> {
    this.setupAuth()

    // D'abord, récupérer TOUS les utilisateurs depuis Dolibarr
    onProgress?.('Récupération des utilisateurs depuis Dolibarr...')
    const allUsers = await httpClient.get<any[]>('/users').catch(() => [])
    console.log("=== [DEBUG] importAll ===")
    console.log("- allUsers récupérés:", allUsers)
    
    // Filtrer pour ne garder que les employés (champ employee = 1, true ou "1")
    const employees = allUsers.filter(user => 
      user.employee === 1 || user.employee === true || user.employee === "1"
    )
    console.log("- Employés filtrés:", employees)
    
    const mapper = new RefIdMapper()
    let employesResults: ImportResultItem[] = []

    // Étape 1 : Construire mapper avec les employés EXISTANTS (utilisant la POSITION comme ref)
    console.log("\n- Ajout des employés existants au mapper:")
    employees.forEach((user, index) => {
      const position = (index + 1).toString() // Position commence à 1
      const id = parseInt(user.id)
      mapper.add(position, id)
      
      // Ajouter aussi le login comme ref pour compatibilité
      if (user.login) {
        mapper.add(user.login, id)
      }
      
      console.log(`  - Position "${position}" + Login "${user.login}" → ID ${id}`)
    })
    mapper.debugLog("Mapper après ajout employés existants")

    // Étape 2 : Import des nouveaux employés (si fichier fourni)
    if (employesFile) {
      onProgress?.('Lecture du fichier employés CSV...')
      const employesRows = await this.readCsv<any>(employesFile)
      console.log("\n- Employés CSV à importer:", employesRows)
      
      onProgress?.(`Import de ${employesRows.length} employés...`)
      const importResult = await this.importEmployes(employesRows)
      employesResults = importResult.results
      
      // Ajouter les nouveaux employés au mapper
      let newIndex = employees.length
      console.log("\n- Ajout des nouveaux employés au mapper:")
      
      // Parcourez le mapper retourné par importEmployes
      importResult.mapper.debugLog("Mapper de importEmployes")
      
      importResult.mapper.toRefToIdObject() && Object.entries(importResult.mapper.toRefToIdObject()).forEach(([refCsv, userId], index) => {
        const position = (newIndex + index + 1).toString()
        // Ajouter la position comme référence
        mapper.add(position, userId)
        // Ajouter la référence CSV pour compatibilité
        mapper.add(refCsv, userId)
        console.log(`  - Position "${position}" + Ref CSV "${refCsv}" → ID ${userId}`)
      })
    }
    mapper.debugLog("Mapper final avant import salaires/photos")

    // Étape 3 : Import des salaires (si fichier fourni ET mapper non vide)
    let salairesResults: ImportResultItem[] = []
    if (salairesFile && mapper.size > 0) {
      onProgress?.('Lecture du fichier salaires CSV...')
      const salairesRows = await this.readCsv<any>(salairesFile)
      onProgress?.(`Import de ${salairesRows.length} salaires...`)
      salairesResults = await this.importSalaires(salairesRows, mapper)
    } else if (salairesFile) {
      salairesResults = [{ ref: 'global', ok: false, message: 'Aucun employé trouvé pour lier les salaires' }]
    }

    // Étape 4 : Import des photos (si fichier fourni ET mapper non vide)
    let photosResults: ImportResultItem[] = []
    if (photosZip && mapper.size > 0) {
      onProgress?.('Lecture du fichier photos ZIP...')
      const photosMap = await this.readZipPhotos(photosZip)
      onProgress?.(`Import de ${Object.keys(photosMap).length} photos...`)
      photosResults = await this.importPhotos(photosMap, mapper)
    } else if (photosZip) {
      photosResults = [{ ref: 'global', ok: false, message: 'Aucun employé trouvé pour lier les photos' }]
    }

    onProgress?.('Importation terminée !')

    return {
      employes: employesResults,
      salaires: salairesResults,
      photos: photosResults
    }
  }
}

export const importService = new ImportService()
