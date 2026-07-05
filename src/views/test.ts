// Tester l'ajout de paiement directement
import { salaryService } from '@/services/salaryService'

try {
  const result = await salaryService.addPayment(7, {
    datep: '2026-06-29',
    amount: 100,
    note: 'Test'
  })
  console.log('✅ Succès:', result)
} catch (e) {
  console.error('❌ Erreur:', e.response?.data || e.message)
}