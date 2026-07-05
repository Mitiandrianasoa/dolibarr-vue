<template>
  <div>
    <h1>Import Jours Fériés (CSV)</h1>
    <p>Colonnes attendues : <code>date, pourcentage, libelle</code></p>

    <div>
      <input type="file" accept=".csv" @change="onFileChange" />
    </div>

    <button :disabled="!fichier || loading" @click="importer">
      {{ loading ? 'Import en cours...' : 'Importer' }}
    </button>

    <div v-if="resultats.length > 0">
      <p>{{ resultats.filter(r => r.ok).length }} / {{ resultats.length }} importés avec succès</p>
      <table>
        <thead>
          <tr>
            <th>Libellé</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in resultats" :key="r.libelle + r.date">
            <td>{{ r.libelle }}</td>
            <td>{{ r.date }}</td>
            <td>{{ r.ok ? 'OK' : 'Erreur' }}</td>
            <td>{{ r.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Papa from 'papaparse'
import { gestionSqliteService } from '@/services/backoffice/gestionSqlite'

const fichier = ref<File | null>(null)
const loading = ref(false)
const resultats = ref<{ libelle: string, date: string, ok: boolean, message: string }[]>([])

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  fichier.value = input.files?.[0] ?? null
}

function lireCsv(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results.data as any[]),
      error: (err) => reject(err)
    })
  })
}

async function importer() {
  if (!fichier.value) return
  loading.value = true
  resultats.value = []

  const rows = await lireCsv(fichier.value)

  for (const row of rows) {
    const libelle     = row.libelle?.trim()           || ''
    const date        = row.date?.trim()              || ''
    const pourcentage = parseFloat(row.pourcentage)   || 0

    if (!date || !libelle) {
      resultats.value.push({ libelle: libelle || '(vide)', date, ok: false, message: 'Libellé ou date manquant' })
      continue
    }

    try {
      await gestionSqliteService.createJourFerie({
        dateFerie: date,
        libelle,
        pourcentage,
        fixe: 1,
        mode: 0
      })
      resultats.value.push({ libelle, date, ok: true, message: 'Importé' })
    } catch (e: any) {
      resultats.value.push({ libelle, date, ok: false, message: e.message || 'Erreur' })
    }
  }

  loading.value = false
}
</script>
