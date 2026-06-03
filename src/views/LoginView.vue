<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-blob b1" /><div class="bg-blob b2" /><div class="bg-blob b3" />
    </div>
    <div class="login-card">
      <!-- Logo -->
      <div class="login-brand">
        <div class="login-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="#3b82f6"/>
            <rect x="13" y="3" width="8" height="8" rx="2" fill="#06b6d4" opacity="0.8"/>
            <rect x="3" y="13" width="8" height="8" rx="2" fill="#a855f7" opacity="0.8"/>
            <rect x="13" y="13" width="8" height="8" rx="2" fill="#22c55e" opacity="0.6"/>
          </svg>
        </div>
        <span class="login-brand-name">GLPI Vue</span>
      </div>

      <h1 class="login-title">Connexion</h1>
      <p class="login-subtitle">Accédez à votre interface GLPI</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label for="login-username">Identifiant</label>
          <input
            id="login-username"
            v-model="form.username"
            type="text"
            placeholder="glpi"
            autocomplete="username"
            :disabled="loading"
          />
        </div>
        <div class="field">
          <label for="login-password">Mot de passe</label>
          <div class="input-wrap">
            <input
              id="login-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="loading"
            />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="error" class="error-msg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <button type="submit" class="btn-login" :disabled="loading || !form.username || !form.password">
          <svg v-if="loading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
        </button>
      </form>

      <div class="login-meta">
        <code>{{ apiUrl }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { initSession } from '@/services/api/glpiClient'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const apiUrl = import.meta.env.VITE_GLPI_BASE_URL ?? 'http://glpi.local:8081/apirest.php'

const form = ref({ username: '', password: '' })

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await initSession()
    router.push('/dashboard')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de connexion à l\'API GLPI'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
  position: relative; overflow: hidden;
}

/* ─── Animated blobs ─────────────────────────────────────────────────────────── */
.login-bg { position: absolute; inset: 0; pointer-events: none; }
.bg-blob {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: 0.12;
}
.b1 { width: 500px; height: 500px; background: var(--accent-blue);   top: -150px; left: -100px; }
.b2 { width: 400px; height: 400px; background: var(--accent-purple); bottom: -100px; right: -80px; }
.b3 { width: 300px; height: 300px; background: var(--accent-cyan);   top: 50%; left: 55%; transform: translate(-50%,-50%); }

/* ─── Card ───────────────────────────────────────────────────────────────────── */
.login-card {
  position: relative; z-index: 1;
  width: 380px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 40px 36px;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.4s ease both;
}

/* ─── Brand ──────────────────────────────────────────────────────────────────── */
.login-brand {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 28px;
}
.login-logo {
  width: 44px; height: 44px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
}
.login-brand-name {
  font-size: 1.2rem; font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(135deg, #3b82f6, #a855f7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.login-title    { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; }
.login-subtitle { font-size: 0.83rem; color: var(--text-secondary); margin-top: 4px; margin-bottom: 28px; }

/* ─── Form ───────────────────────────────────────────────────────────────────── */
.login-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }

.field input, .input-wrap input {
  width: 100%; padding: 10px 14px;
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary);
  font-family: inherit; font-size: 0.9rem;
  transition: all var(--transition); outline: none;
}
.field input:focus, .input-wrap input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}
.field input::placeholder { color: var(--text-muted); }
.field input:disabled { opacity: 0.5; cursor: not-allowed; }

.input-wrap { position: relative; }
.input-wrap input { padding-right: 40px; }
.eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; padding: 0; display: flex;
  transition: color var(--transition);
}
.eye-btn:hover { color: var(--text-secondary); }

/* ─── Error ──────────────────────────────────────────────────────────────────── */
.error-msg {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: var(--radius-md);
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
  color: #f87171; font-size: 0.82rem;
}

/* ─── Button ─────────────────────────────────────────────────────────────────── */
.btn-login {
  margin-top: 4px;
  padding: 12px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-dim));
  color: white; border: none; border-radius: var(--radius-md);
  font-family: inherit; font-size: 0.9rem; font-weight: 700;
  cursor: pointer; transition: all var(--transition);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 16px rgba(59,130,246,0.35);
}
.btn-login:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(59,130,246,0.5); }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
.spin-icon { animation: spin 0.8s linear infinite; }

/* ─── Meta ───────────────────────────────────────────────────────────────────── */
.login-meta {
  margin-top: 20px; text-align: center;
  font-size: 0.7rem; color: var(--text-muted);
}
.login-meta code {
  background: var(--bg-elevated); padding: 2px 6px;
  border-radius: 4px; font-family: monospace;
}
</style>
