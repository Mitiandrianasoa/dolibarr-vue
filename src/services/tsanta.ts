/**
 * salaires.ts
 * Gestion des salaires et paiements Dolibarr
 * Endpoint : /salaries
 */

import api from './api'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Salaire {
  id: number | string
  label: string
  amount: number | string
  fk_user: number | string
  datesp: number
  dateep: number
}

export interface Payment {
  id: number
  fk_salary?: number | string
  amount: number | string
  datep: number | string
}

export interface SalairePayload {
  fk_user: number
  label: string
  amount: number
  datesp?: number
  dateep?: number
  datep?: number
  paye?: number
}

export interface PaymentPayload {
  paiementtype: string
  datepaye: number
  chid: number | string
  amounts: Record<string | number, number>
}

// ─── Salaires ─────────────────────────────────────────────────────────────────

/**
 * Récupère tous les salaires
 */
export async function getAll(): Promise<Salaire[]> {
  try {
    const { data } = await api.get('/salaries', { params: { limit: 500 } })
    return data
  } catch (error) {
    console.error('[Salaires] Erreur chargement salaires:', error)
    return []
  }
}

/**
 * Crée un nouveau salaire
 */
export async function create(payload: SalairePayload): Promise<number> {
  const { data } = await api.post('/salaries', payload)
  console.log('[Salaires] Salaire créé, id:', data)
  return Number(data)
}

/**
 * Supprime un salaire par son id
 */
export async function remove(id: number | string): Promise<void> {
  await api.delete(`/salaries/${id}`)
  console.log(`[Salaires] Salaire #${id} supprimé`)
}

// ─── Paiements ────────────────────────────────────────────────────────────────

/**
 * Récupère tous les paiements de salaires
 */
export async function getPayments(): Promise<Payment[]> {
  try {
    const { data } = await api.get('/salaries/payments', { params: { limit: 500 } })
    return data
  } catch (error) {
    console.error('[Salaires] Erreur chargement paiements:', error)
    return []
  }
}

/**
 * Ajoute un paiement à un salaire
 */
export async function createPayment(salaryId: number | string, payload: PaymentPayload): Promise<void> {
  await api.post(`/salaries/${salaryId}/payments`, payload)
  console.log(`[Salaires] Paiement ajouté au salaire #${salaryId}`)
}

/**
 * Supprime un paiement par son id
 */
export async function removePayment(id: number | string): Promise<void> {
  await api.delete(`/salaries/${id}/payments`)
  console.log(`[Salaires] Paiement #${id} supprimé`)
}