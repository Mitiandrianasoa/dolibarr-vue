<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-blob b1" /><div class="bg-blob b2" /><div class="bg-blob b3" />
    </div>
    <div class="login-card">
      <!-- Logo - Changé pour Dolibarr -->
      <div class="login-brand">
        <div class="login-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <path d="M7 3v2M17 3v2"/>
            <path d="M3 9h18"/>
            <circle cx="9" cy="13" r="1.5"/>
            <circle cx="15" cy="13" r="1.5"/>
          </svg>
        </div>
        <div class="login-brand-block">
          <span class="login-brand-name">Dolibarr</span>
          <span class="login-brand-tag">Gestion RH</span>
        </div>
      </div>

      <!-- Titre adapté -->
      <h1 class="login-title">Accès Backoffice</h1>
      <p class="login-subtitle">Entrez votre code unique pour accéder à l'espace de gestion</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <!-- ⚠️ SUPPRESSION du champ "Identifiant" - Plus de login -->
        
        <!--  UNIQUEMENT le champ "Code unique" (ancien password) -->
        <div class="field">
          <label for="login-code">Code d'accès unique</label>
          <div class="input-wrap">
            <input
              id="login-code"
              v-model="form.code"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Entrez votre code unique"
              autocomplete="current-password"
              :disabled="loading"
              @focus="error = ''"
            />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <!-- ✅ Indication du code par défaut -->
          <span class="field-hint">
             Code par défaut : <strong>{{ DEFAULT_CODE }}</strong>
          </span>
        </div>

        <div v-if="error" class="error-msg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>

        <button type="submit" class="btn-login" :disabled="loading || !form.code">
          <svg v-if="loading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
        </button>
      </form>

      <!-- Status de connexion -->
      <div class="login-meta">
        <span class="status-dot" :class="{ connected: isConnected }"></span>
        <code>{{ apiUrl }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
// 🔍 LOG POUR DEBUG - Afficher les valeurs réelles
console.log('🔍 === DEBUG DES VARIABLES D\'ENVIRONNEMENT ===')
console.log('VITE_DOLIBARR_BASE_URL:', import.meta.env.VITE_DOLIBARR_BASE_URL)
console.log('VITE_DOLIBARR_API_KEY:', import.meta.env.VITE_DOLIBARR_API_KEY)
console.log('VITE_BACKOFFICE_CODE:', import.meta.env.VITE_BACKOFFICE_CODE)
console.log('Longueur de VITE_BACKOFFICE_CODE:', import.meta.env.VITE_BACKOFFICE_CODE?.length)
console.log('🔍 === FIN DEBUG ===')

const DEFAULT_CODE = import.meta.env.VITE_BACKOFFICE_CODE || 'dolibarr'
const apiUrl = import.meta.env.VITE_DOLIBARR_BASE_URL ?? 'http://localhost/dolibarr-23.0.3/htdocs/api/index.php'

// ─── ROUTER ──────────────────────────────────────────────────────────────────
const router = useRouter()

// ─── ÉTATS ───────────────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const isConnected = ref(false)

// ✅ Formulaire avec le code pré-rempli
const form = ref({ 
  code: DEFAULT_CODE
})

// 🔍 LOG - Voir ce qui est dans le formulaire
console.log('📝 Code pré-rempli dans le formulaire:', form.value.code)
console.log('📝 Longueur du code:', form.value.code.length)

async function handleLogin() {
  loading.value = true
  error.value = ''
  
  // 🔍 LOG - Ce qui est envoyé
  console.log('🔐 Tentative de login')
  console.log('  - Code saisi:', form.value.code)
  console.log('  - Longueur du code:', form.value.code.length)
  console.log('  - Code attendu (DOLAPIKEY):', import.meta.env.VITE_DOLIBARR_API_KEY)
  console.log('  - Comparaison:', form.value.code === import.meta.env.VITE_DOLIBARR_API_KEY ? '✅ ÉGAL' : '❌ DIFFÉRENT')
  
  try {
    await dolibarrAuthService.login(form.value.code)
    console.log('✅ Login réussi')
    isConnected.value = true
    router.push('/dashboard')
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Code incorrect ou service indisponible'
    console.error('❌ Erreur de login:', errorMessage)
    error.value = errorMessage
    isConnected.value = false
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  console.log('🔍 Vérification de session au chargement')
  if (dolibarrAuthService.isAuthenticated()) {
    console.log('✅ Session valide, redirection vers dashboard')
    router.push('/dashboard')
  } else {
    console.log('❌ Pas de session valide')
  }
})
</script>

<style scoped>
@import '../styles/LoginView.css';

/* ─── STYLES ADDITIONNELS ─────────────────────────────────────────────────── */
.field-hint {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 6px;
  font-style: italic;
}

.field-hint strong {
  color: #2563eb;
  font-weight: 600;
}

.login-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  padding: 10px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.7rem;
  color: #6b7280;
  word-break: break-all;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  display: inline-block;
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.status-dot.connected {
  background: #22c55e;
}

/* Style pour le champ code */
.field input {
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  font-weight: 500;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>