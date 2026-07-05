// src/services/dolibarrAuthService.ts
import { httpClient } from './httpClient.ts'

export interface DolibarrSession {
  token: string
  user: {
    id: number
    login: string
    name: string
    firstname: string
    email: string
    admin: boolean
  }
  expires: string
}

class DolibarrAuthService {
  private readonly STORAGE_KEY = 'dolibarr_session'

  async login(code: string): Promise<DolibarrSession> {
    console.log('🔐 [AuthService] Tentative de connexion')
    console.log('  - Code reçu:', code)
    
    // ✅ Le code unique attendu (mot de passe simple)
    const expectedCode = import.meta.env.VITE_BACKOFFICE_CODE || 'dolibarr'
    console.log('  - Code attendu:', expectedCode)
    
    // ✅ La DOLAPIKEY pour les appels API
    const apiKey = import.meta.env.VITE_DOLIBARR_API_KEY
    
    // Vérifier si le code saisi correspond au code attendu
    if (code !== expectedCode) {
      console.error('❌ [AuthService] Code invalide')
      throw new Error('Code d\'accès invalide')
    }

    try {
      console.log('✅ [AuthService] Code valide, appel à l\'API avec DOLAPIKEY...')
      
      // ⚠️ On utilise la DOLAPIKEY pour l'API, PAS le code saisi
      httpClient.setApiKey(apiKey)

      console.log('📡 [AuthService] GET /users...')
      const users = await httpClient.get<any[]>('/users')
      console.log('📥 [AuthService] Réponse reçue:', users)
      
      const userInfo = Array.isArray(users) && users.length > 0 ? users[0] : null

      if (!userInfo) {
        console.error('❌ [AuthService] Aucun utilisateur trouvé')
        throw new Error('Impossible de récupérer les informations utilisateur')
      }

      const session: DolibarrSession = {
        token: apiKey, // On stocke la DOLAPIKEY
        user: {
          id: userInfo.id || 1,
          login: userInfo.login || 'admin',
          name: userInfo.lastname || 'Administrateur',
          firstname: userInfo.firstname || 'Dolibarr',
          email: userInfo.email || 'admin@dolibarr.local',
          admin: true,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      console.log('✅ [AuthService] Session créée:', session)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
      
      return session

    } catch (error) {
      console.error('❌ [AuthService] Erreur:', error)
      throw new Error(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  logout(): void {
    console.log('🚪 [AuthService] Déconnexion')
    localStorage.removeItem(this.STORAGE_KEY)
    httpClient.setApiKey('')
  }

  isAuthenticated(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY)
        if (!stored) return false
        
        try {
            const session = JSON.parse(stored)
            if (session.expires && new Date(session.expires) > new Date()) {
            httpClient.setApiKey(session.token) // ⬅️ AJOUTEZ CETTE LIGNE
            return true
            }
            return false
        } catch {
            return false
        }
    }


  getSession(): DolibarrSession | null {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return null
    
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  getToken(): string | null {
    const session = this.getSession()
    return session ? session.token : null
  }
}

export const dolibarrAuthService = new DolibarrAuthService()