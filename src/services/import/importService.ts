/**
 * importService.ts
 * Import CSV → GLPI avec :
 *  - Validation complète au chargement (date, nombre positif, champs requis)
 *  - Logs détaillés avec numéro de ligne, timestamp, champ exact
 *  - Logique "tout ou rien" : reset automatique si une erreur survient durant l'import
 *  - Création automatique des entités manquantes (User, Location, Manufacturer, Model)
 */

import glpiClient from '../api/glpiClient'
import { resetService } from '../api/resetService'

// ─── Types publics ────────────────────────────────────────────────────────────

export interface ImportLogEntry {
  level: 'info' | 'success' | 'warning' | 'error' | 'debug'
  message: string
  timestamp: string
  /** Numéro de ligne CSV (1-based, sans compter l'en-tête) */
  lineNumber?: number
  /** Nom du champ concerné par l'erreur */
  field?: string
  details?: unknown
}

export interface CsvValidationError {
  lineNumber: number   // 1-based (hors en-tête)
  field: string
  value: string
  reason: string
}

export interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
  /** Erreurs de validation détectées à l'analyse */
  errors: CsvValidationError[]
  /** true si le CSV est jugé importable (0 erreur bloquante) */
  valid: boolean
}

export interface ImportResult {
  success: boolean
  logs: ImportLogEntry[]
  stats: {
    assets:  { total: number; created: number; skipped: number; errors: number }
    tickets: { total: number; created: number; skipped: number; errors: number }
    costs:   { total: number; created: number; errors: number }
    photos:  { total: number; uploaded: number; errors: number }
    users:   { total: number; created: number; errors: number }
  }
}

// ─── Correspondances statuts / types ─────────────────────────────────────────

const ASSET_STATUS_MAP: Record<string, number> = {
  'En production': 1,
  'En stock':      2,
  'Réformé':       3,
  'Maintenance':   4,
  'En panne':      5,
  'Hors service':  6,
}

export const ITEM_TYPE_MAP: Record<string, string> = {
  'Computer':          'Computer',
  'Monitor':           'Monitor',
  'Printer':           'Printer',
  'Phone':             'Phone',
  'Peripheral':        'Peripheral',
  'NetworkEquipment':  'NetworkEquipment',
  // 'Software':          'Software',
  // 'SoftwareLicense':   'SoftwareLicense',
  // 'SoftwareVersion':   'SoftwareVersion',
  // 'CartridgeItem':     'CartridgeItem',
  // 'ConsumableItem':    'ConsumableItem',
  // 'Certificate':       'Certificate',
  // 'Contract':          'Contract',
  // 'Document':          'Document',
  // 'Line':              'Line',
  // 'Rack':              'Rack',
  // 'Enclosure':         'Enclosure',
  // 'PDU':               'PDU',
  // 'UPS':               'UPS',
  // 'Datacenter':        'Datacenter',
}

const TICKET_STATUS_MAP: Record<string, number> = {
  'New':      1,
  'Assigned': 2,
  'Planned':  3,
  'Pending':  4,
  'Solved':   5,
  'Closed':   6,
}

const TICKET_PRIORITY_MAP: Record<string, number> = {
  'Very Low': 1,
  'Low':      2,
  'Medium':   3,
  'High':     4,
  'Very High':5,
  'Major':    6,
}

const TICKET_TYPE_MAP: Record<string, number> = {
  'Incident': 1,
  'Request':  2,
  'Demande':  2,
}

// ─── Utilitaires CSV ──────────────────────────────────────────────────────────

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = values[idx]?.trim() ?? '' })
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsText(file, 'UTF-8')
  })
}

// ─── Validation CSV ───────────────────────────────────────────────────────────

/** Vérifie que la valeur est une date au format DD/MM/YYYY */
function isValidDate(value: string): boolean {
  if (!value) return false
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false
  const [, d, m, y] = match.map(Number)
  const date = new Date(y, m - 1, d)
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
}

/** Vérifie que la valeur est un nombre positif ou nul */
function isPositiveNumber(value: string): boolean {
  const n = parseFloat(value.replace(',', '.'))
  return !isNaN(n) && n >= 0
}

/** Vérifie le format HH:MM */
function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value)
}

/**
 * Valide un CSV de feuille 1 (Assets)
 * Colonnes requises : Name, Status, Item_Type, Inventory_Number
 */
export function validateAssetsCsv(rows: Record<string, string>[]): CsvValidationError[] {
  const errors: CsvValidationError[] = []
  const requiredFields = ['Name', 'Status', 'Item_Type', 'Inventory_Number']

  rows.forEach((row, idx) => {
    const lineNumber = idx + 1
    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        errors.push({ lineNumber, field, value: row[field] ?? '', reason: 'Champ obligatoire manquant' })
      }
    }
    if (row['Item_Type'] && !ITEM_TYPE_MAP[row['Item_Type']]) {
      errors.push({ lineNumber, field: 'Item_Type', value: row['Item_Type'], reason: `Type inconnu. Valeurs valides : ${Object.keys(ITEM_TYPE_MAP).join(', ')}` })
    }
    if (row['Status'] && !ASSET_STATUS_MAP[row['Status']]) {
      errors.push({ lineNumber, field: 'Status', value: row['Status'], reason: `Statut inconnu. Valeurs valides : ${Object.keys(ASSET_STATUS_MAP).join(', ')}` })
    }
  })
  return errors
}

/**
 * Valide un CSV de feuille 2 (Tickets)
 * Colonnes requises : Ref_Ticket, Date, Heure, Type, Titre, Status, Priority
 */
export function validateTicketsCsv(rows: Record<string, string>[]): CsvValidationError[] {
  const errors: CsvValidationError[] = []
  const requiredFields = ['Ref_Ticket', 'Date', 'Heure', 'Type', 'Titre', 'Status', 'Priority']
  const seenRefs = new Map<string, number>()

  rows.forEach((row, idx) => {
    const lineNumber = idx + 1
    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        errors.push({ lineNumber, field, value: row[field] ?? '', reason: 'Champ obligatoire manquant' })
      }
    }
    if (row['Date'] && !isValidDate(row['Date'])) {
      errors.push({ lineNumber, field: 'Date', value: row['Date'], reason: 'Format invalide, attendu : JJ/MM/AAAA' })
    }
    if (row['Heure'] && !isValidTime(row['Heure'])) {
      errors.push({ lineNumber, field: 'Heure', value: row['Heure'], reason: 'Format invalide, attendu : HH:MM' })
    }
    if (row['Type'] && !TICKET_TYPE_MAP[row['Type']]) {
      errors.push({ lineNumber, field: 'Type', value: row['Type'], reason: `Type inconnu. Valeurs valides : ${Object.keys(TICKET_TYPE_MAP).join(', ')}` })
    }
    if (row['Status'] && !TICKET_STATUS_MAP[row['Status']]) {
      errors.push({ lineNumber, field: 'Status', value: row['Status'], reason: `Statut inconnu. Valeurs valides : ${Object.keys(TICKET_STATUS_MAP).join(', ')}` })
    }
    if (row['Priority'] && !TICKET_PRIORITY_MAP[row['Priority']]) {
      errors.push({ lineNumber, field: 'Priority', value: row['Priority'], reason: `Priorité inconnue. Valeurs valides : ${Object.keys(TICKET_PRIORITY_MAP).join(', ')}` })
    }
    // Doublons de référence
    const ref = row['Ref_Ticket']?.trim()
    if (ref) {
      if (seenRefs.has(ref)) {
        errors.push({ lineNumber, field: 'Ref_Ticket', value: ref, reason: `Référence dupliquée (déjà vue ligne ${seenRefs.get(ref)})` })
      } else {
        seenRefs.set(ref, lineNumber)
      }
    }
  })
  return errors
}

/**
 * Valide un CSV de feuille 3 (Coûts)
 * Colonnes requises : Num_Ticket, Duration_second, Time_Cost, Fixed_Cost
 */
export function validateCostsCsv(rows: Record<string, string>[]): CsvValidationError[] {
  const errors: CsvValidationError[] = []
  const requiredFields = ['Num_Ticket', 'Duration_second', 'Time_Cost', 'Fixed_Cost']

  rows.forEach((row, idx) => {
    const lineNumber = idx + 1
    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        errors.push({ lineNumber, field, value: row[field] ?? '', reason: 'Champ obligatoire manquant' })
      }
    }
    if (row['Duration_second'] && !isPositiveNumber(row['Duration_second'])) {
      errors.push({ lineNumber, field: 'Duration_second', value: row['Duration_second'], reason: 'Doit être un nombre entier positif (secondes)' })
    }
    if (row['Time_Cost'] && !isPositiveNumber(row['Time_Cost'])) {
      errors.push({ lineNumber, field: 'Time_Cost', value: row['Time_Cost'], reason: 'Doit être un nombre positif' })
    }
    if (row['Fixed_Cost'] && !isPositiveNumber(row['Fixed_Cost'])) {
      errors.push({ lineNumber, field: 'Fixed_Cost', value: row['Fixed_Cost'], reason: 'Doit être un nombre positif' })
    }
  })
  return errors
}

/**
 * Construit un CsvPreview complet pour afficher dans le front.
 */
export async function buildCsvPreview(
  file: File,
  sheet: 'assets' | 'tickets' | 'costs'
): Promise<CsvPreview> {
  const content = await readFileAsText(file)
  const rows = parseCSV(content)
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  let errors: CsvValidationError[] = []
  if (sheet === 'assets')  errors = validateAssetsCsv(rows)
  if (sheet === 'tickets') errors = validateTicketsCsv(rows)
  if (sheet === 'costs')   errors = validateCostsCsv(rows)

  return { headers, rows, errors, valid: errors.length === 0 }
}

// ─── Gestion des Utilisateurs ─────────────────────────────────────────────────

function parseFullName(fullName: string): { firstname: string; lastname: string; login: string } {
  const trimmed = fullName.trim()
  const parts = trimmed.split(' ')
  if (parts.length === 1) {
    return { firstname: '', lastname: trimmed, login: trimmed.toLowerCase().replace(/[^a-z0-9]/g, '') }
  }
  const lastname  = parts[0]
  const firstname = parts.slice(1).join(' ')
  let login = firstname
    ? `${firstname.toLowerCase()}.${lastname.toLowerCase()}`
    : lastname.toLowerCase()
  login = login.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9.]/g, '')
  return { firstname, lastname, login }
}

async function resolveOrCreateUser(
  fullName: string,
  cache: Map<string, number>,
  addLog: (level: ImportLogEntry['level'], message: string, details?: unknown) => void,
  userStats: { total: number; created: number; errors: number }
): Promise<number | undefined> {
  if (!fullName?.trim()) return undefined
  const trimmedName = fullName.trim()
  if (cache.has(trimmedName)) {
    addLog('debug', `[User] Cache hit pour "${trimmedName}" → ID=${cache.get(trimmedName)}`)
    return cache.get(trimmedName)!
  }
  addLog('debug', `[User] Recherche/création de l'utilisateur "${trimmedName}"...`)
  userStats.total++
  const { firstname, lastname, login } = parseFullName(trimmedName)
  addLog('debug', `[User] Parsing → firstname="${firstname}", lastname="${lastname}", login="${login}"`)
  try {
    const { data: searchByLogin } = await glpiClient.get('/User', {
      params: { 'searchText[name]': login, range: '0-1' },
    })
    if (Array.isArray(searchByLogin) && searchByLogin.length > 0) {
      addLog('success', `[User] Trouvé par login: "${trimmedName}" (ID=${searchByLogin[0].id})`)
      cache.set(trimmedName, searchByLogin[0].id)
      return searchByLogin[0].id
    }
    const { data: searchByName } = await glpiClient.get('/User', {
      params: { 'searchText[realname]': lastname, 'searchText[firstname]': firstname, range: '0-10' },
    })
    if (Array.isArray(searchByName)) {
      const match = searchByName.find((u: Record<string, string>) =>
        (u.realname || '').toLowerCase() === lastname.toLowerCase() &&
        (u.firstname || '').toLowerCase() === firstname.toLowerCase()
      )
      if (match) {
        addLog('success', `[User] Trouvé par nom/prénom: "${lastname} ${firstname}" (ID=${match.id})`)
        cache.set(trimmedName, match.id)
        return match.id
      }
    }
    addLog('info', `[User] Non trouvé, création: "${lastname} ${firstname}" (login: ${login})`)
    const userPayload = {
      name: login, realname: lastname, firstname,
      password: '123', password2: '123',
      is_active: 1, profiles_id: 0, entities_id: 0,
    }
    addLog('debug', `[User] Payload: ${JSON.stringify(userPayload)}`)
    const { data: created } = await glpiClient.post('/User', { input: userPayload })
    addLog('success', `[User] Créé: "${lastname} ${firstname}" (login: ${login}, ID=${created.id})`)
    cache.set(trimmedName, created.id)
    userStats.created++
    return created.id
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown; status?: number }; message?: string }
    const msg = (err.response?.data as { message?: string })?.[0]?.message ?? ''
    if (msg.includes('name already exists') || err.response?.status === 400) {
      addLog('warning', `[User] Login "${login}" déjà pris, tentative avec variante...`)
      const alternativeLogin = `${login}${Date.now()}`.slice(0, 50)
      try {
        const { data: created } = await glpiClient.post('/User', {
          input: { name: alternativeLogin, realname: lastname, firstname, password: '123', password2: '123', is_active: 1, profiles_id: 0, entities_id: 0 },
        })
        addLog('success', `[User] Créé avec login alternatif "${alternativeLogin}" (ID=${created.id})`)
        cache.set(trimmedName, created.id)
        userStats.created++
        return created.id
      } catch (e2: unknown) {
        const err2 = e2 as { message?: string; response?: { data?: unknown } }
        addLog('error', `[User] Erreur variante pour "${trimmedName}": ${err2.message}`, err2.response?.data)
        userStats.errors++
        return undefined
      }
    }
    addLog('error', `[User] Erreur pour "${trimmedName}": ${err.message}`, err.response?.data)
    userStats.errors++
    return undefined
  }
}

// ─── Helpers GLPI ─────────────────────────────────────────────────────────────

async function resolveOrCreate<T extends { id: number }>(
  endpoint: string,
  name: string,
  cache: Map<string, number>,
  addLog: (msg: string, details?: unknown) => void,
  extraFields?: Record<string, unknown>
): Promise<number | undefined> {
  if (!name) return undefined
  if (cache.has(name)) { addLog(`[${endpoint}] Cache hit pour "${name}"`); return cache.get(name)! }
  addLog(`[${endpoint}] Recherche de "${name}"...`)
  try {
    const { data } = await glpiClient.get(`/${endpoint}`, { params: { 'searchText[name]': name, range: '0-1' } })
    if (Array.isArray(data) && data.length > 0) {
      addLog(`[${endpoint}] Trouvé: "${name}" (ID=${data[0].id})`)
      cache.set(name, data[0].id)
      return data[0].id
    }
    addLog(`[${endpoint}] Création de "${name}"...`)
    const { data: created } = await glpiClient.post<T>(`/${endpoint}`, { input: { name, entities_id: 0, ...extraFields } })
    addLog(`[${endpoint}] Créé: ID=${created.id}`)
    cache.set(name, created.id)
    return created.id
  } catch (e: unknown) {
    const err = e as { message?: string }
    addLog(`[${endpoint}] Erreur pour "${name}": ${err.message}`)
    return undefined
  }
}

async function resolveModel(
  name: string,
  itemtype: string,
  cache: Map<string, number>,
  logDebug: (msg: string, details?: unknown) => void
): Promise<number | undefined> {
  if (!name) return undefined
  const typesWithModels = ['Computer','Monitor','Printer','Phone','Peripheral','NetworkEquipment','Rack','Enclosure','PDU','UPS']
  if (!typesWithModels.includes(itemtype)) return undefined
  return resolveOrCreate(`${itemtype}Model`, name, cache, logDebug, { is_recursive: 0 })
}

async function findAssetByInventory(inventoryNumber: string, itemtype: string, logDebug: (msg: string) => void): Promise<number | null> {
  if (!inventoryNumber) return null
  logDebug(`[Asset] Recherche par inventaire "${inventoryNumber}" dans ${itemtype}...`)
  try {
    const { data } = await glpiClient.get(`/${itemtype}`, { params: { 'searchText[otherserial]': inventoryNumber, range: '0-1' } })
    if (Array.isArray(data) && data.length > 0) { logDebug(`[Asset] Trouvé: ID=${data[0].id}`); return data[0].id }
  } catch { /* ignoré */ }
  return null
}

async function findAssetByName(
  name: string,
  nameToIdCache: Map<string, { itemtype: string; id: number }>,
  logDebug: (msg: string) => void
): Promise<{ itemtype: string; id: number } | null> {
  if (nameToIdCache.has(name)) return nameToIdCache.get(name)!
  const typesToSearch = ['Computer','Monitor','Printer','Phone','NetworkEquipment','Peripheral','Rack','Enclosure','PDU','UPS']
  for (const itemtype of typesToSearch) {
    try {
      const { data } = await glpiClient.get(`/${itemtype}`, { params: { 'searchText[name]': name, range: '0-1' } })
      if (Array.isArray(data) && data.length > 0) {
        const result = { itemtype, id: data[0].id }
        nameToIdCache.set(name, result)
        logDebug(`[Asset] Trouvé "${name}" dans ${itemtype} (ID=${data[0].id})`)
        return result
      }
    } catch { continue }
  }
  logDebug(`[Asset] "${name}" non trouvé dans GLPI`)
  return null
}

// ─── Import Feuille 1 : Assets ────────────────────────────────────────────────

interface AssetRow {
  Name: string; Status: string; Location: string; Manufacturer: string
  Item_Type: string; Model: string; Inventory_Number: string; User: string
}

async function importAssets(
  rows: AssetRow[],
  logs: ImportLogEntry[],
  nameToIdCache: Map<string, { itemtype: string; id: number }>,
  userStats: { total: number; created: number; errors: number }
): Promise<ImportResult['stats']['assets']> {
  const stats = { total: rows.length, created: 0, skipped: 0, errors: 0 }
  const addLog = (level: ImportLogEntry['level'], message: string, lineNumber?: number, field?: string, details?: unknown) => {
    logs.push({ level, message, timestamp: new Date().toISOString(), lineNumber, field, details })
  }
  const logDebug = (msg: string) => addLog('debug', msg)

  const locationCache    = new Map<string, number>()
  const manufacturerCache = new Map<string, number>()
  const modelCache       = new Map<string, number>()
  const userCache        = new Map<string, number>()

  addLog('info', `[Assets] Début de l'import — ${rows.length} ligne(s)`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNumber = i + 1
    addLog('debug', `[Assets] ─── Ligne ${lineNumber}: "${row.Name}" ───`, lineNumber)

    const itemtype = ITEM_TYPE_MAP[row.Item_Type] ?? row.Item_Type
    if (!itemtype) {
      addLog('warning', `[Assets] L.${lineNumber} — Type "${row.Item_Type}" inconnu pour "${row.Name}" → ignoré`, lineNumber, 'Item_Type')
      stats.skipped++
      continue
    }

    const existingId = await findAssetByInventory(row.Inventory_Number, itemtype, logDebug)
    if (existingId) {
      addLog('info', `[Assets] L.${lineNumber} — "${row.Name}" (N°inv ${row.Inventory_Number}) déjà présent (ID=${existingId}) → ignoré`, lineNumber)
      nameToIdCache.set(row.Name, { itemtype, id: existingId })
      stats.skipped++
      continue
    }

    try {
      const [locationId, manufacturerId, modelId, userId] = await Promise.all([
        resolveOrCreate('Location', row.Location, locationCache, logDebug),
        resolveOrCreate('Manufacturer', row.Manufacturer, manufacturerCache, logDebug),
        resolveModel(row.Model, itemtype, modelCache, logDebug),
        resolveOrCreateUser(row.User, userCache, (lvl, msg, det) => addLog(lvl, msg, lineNumber, 'User', det), userStats),
      ])

      addLog('debug', `[Assets] L.${lineNumber} — Résolutions: location=${locationId}, manufacturer=${manufacturerId}, model=${modelId}, user=${userId}`, lineNumber)

      const payload: Record<string, unknown> = {
        name:        row.Name,
        otherserial: row.Inventory_Number,
        states_id:   ASSET_STATUS_MAP[row.Status] ?? 1,
        entities_id: 0,
        is_recursive: 0,
      }
      if (locationId)     payload.locations_id     = locationId
      if (manufacturerId) payload.manufacturers_id = manufacturerId
      if (modelId) {
        const modelField = `${itemtype.toLowerCase()}models_id`
        payload[modelField] = modelId
      }
      if (userId) {
        payload.users_id      = userId
        payload.users_id_tech = userId
      }

      addLog('debug', `[Assets] L.${lineNumber} — Payload: ${JSON.stringify(payload)}`, lineNumber)
      const { data } = await glpiClient.post<{ id: number }>(`/${itemtype}`, { input: payload })
      nameToIdCache.set(row.Name, { itemtype, id: data.id })
      addLog('success', `[Assets] L.${lineNumber} — "${row.Name}" créé → ${itemtype} ID=${data.id}`, lineNumber)
      stats.created++
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: unknown } }
      addLog('error', `[Assets] L.${lineNumber} — Erreur pour "${row.Name}" : ${err.message}`, lineNumber, undefined, err.response?.data)
      stats.errors++
    }
  }

  addLog('info', `[Assets] Terminé — créés:${stats.created} ignorés:${stats.skipped} erreurs:${stats.errors}`)
  return stats
}

// ─── Import Feuille 2 : Tickets ───────────────────────────────────────────────

interface TicketRow {
  Ref_Ticket: string; Date: string; Heure: string; Type: string
  Titre: string; Description: string; Status: string; Priority: string; Items: string
}

function parseGlpiDateTime(date: string, time: string): string {
  const [day, month, year] = date.split('/')
  const hm = time.length === 5 ? `${time}:00` : time
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')} ${hm}`
}

function parseItemsList(raw: string): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { /* fall through */ }
  return raw.replace(/^\[|\]$/g, '').split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
}

async function importTickets(
  rows: TicketRow[],
  logs: ImportLogEntry[],
  nameToIdCache: Map<string, { itemtype: string; id: number }>,
  refToGlpiId: Map<string, number>
): Promise<ImportResult['stats']['tickets']> {
  const stats = { total: rows.length, created: 0, skipped: 0, errors: 0 }
  const addLog = (level: ImportLogEntry['level'], message: string, lineNumber?: number, field?: string, details?: unknown) => {
    logs.push({ level, message, timestamp: new Date().toISOString(), lineNumber, field, details })
  }
  const logDebug = (msg: string) => addLog('debug', msg)

  addLog('info', `[Tickets] Début de l'import — ${rows.length} ligne(s)`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNumber = i + 1
    const ref = row.Ref_Ticket?.trim()

    addLog('debug', `[Tickets] ─── Ligne ${lineNumber}: Ref#${ref} ───`, lineNumber)

    if (!ref) {
      addLog('warning', `[Tickets] L.${lineNumber} — Ref_Ticket vide → ignoré`, lineNumber, 'Ref_Ticket')
      stats.skipped++
      continue
    }

    try {
      const datetime  = parseGlpiDateTime(row.Date, row.Heure)
      const itemNames = parseItemsList(row.Items)
      const finalStatus = TICKET_STATUS_MAP[row.Status] ?? 1  // Statut final souhaité (ex: Closed = 6)
      const initialStatus = 1  // Toujours "New" à la création

      addLog('debug', `[Tickets] L.${lineNumber} — datetime="${datetime}", items=${JSON.stringify(itemNames)}`, lineNumber)
      addLog('debug', `[Tickets] L.${lineNumber} — Statut initial: ${initialStatus} (New), statut final: ${finalStatus}`, lineNumber)

      // ÉTAPE 1 : Créer le ticket avec le statut "New" (1)
      const ticketPayload = {
        name:        row.Titre,
        content:     row.Description || row.Titre,
        type:        TICKET_TYPE_MAP[row.Type]        ?? 1,
        status:      initialStatus,  // ← FORCÉ à 1 (New)
        priority:    TICKET_PRIORITY_MAP[row.Priority] ?? 3,
        urgency:     3,
        impact:      3,
        date:        datetime,
        requesttypes_id: 1,
        entities_id: 0,
      }

      addLog('debug', `[Tickets] L.${lineNumber} — Création ticket avec payload: ${JSON.stringify(ticketPayload)}`, lineNumber)
      const { data } = await glpiClient.post<{ id: number }>('/Ticket', { input: ticketPayload })
      const ticketId = data.id
      refToGlpiId.set(ref, ticketId)
      addLog('success', `[Tickets] L.${lineNumber} — Ref#${ref} "${row.Titre}" créé (ID=${ticketId}, statut: New)`, lineNumber)
      stats.created++

      // ÉTAPE 2 : Lier les assets au ticket (possible car ticket est en statut New)
      for (const assetName of itemNames) {
        let assetRef = nameToIdCache.get(assetName)
        if (!assetRef) assetRef = await findAssetByName(assetName, nameToIdCache, logDebug) ?? undefined
        if (!assetRef) {
          addLog('warning', `[Tickets] L.${lineNumber} — Asset "${assetName}" introuvable → lien ignoré`, lineNumber, 'Items')
          continue
        }
        try {
          await glpiClient.post('/Item_Ticket', {
            input: { tickets_id: ticketId, itemtype: assetRef.itemtype, items_id: assetRef.id },
          })
          addLog('info', `[Tickets] L.${lineNumber} — Ticket#${ticketId} lié à "${assetName}" (${assetRef.itemtype}#${assetRef.id})`, lineNumber)
        } catch (e: unknown) {
          const err = e as { message?: string }
          addLog('warning', `[Tickets] L.${lineNumber} — Lien "${assetName}" impossible: ${err.message}`, lineNumber, 'Items')
        }
      }

      // ÉTAPE 3 : Appliquer le statut final (ex: Closed = 6) seulement si différent du statut initial
      if (finalStatus !== initialStatus) {
        addLog('debug', `[Tickets] L.${lineNumber} — Mise à jour du statut vers ${finalStatus}...`, lineNumber)
        try {
          await glpiClient.put(`/Ticket/${ticketId}`, {
            input: { status: finalStatus }
          })
          addLog('success', `[Tickets] L.${lineNumber} — Ticket#${ticketId} mis à jour (statut: ${finalStatus})`, lineNumber)
        } catch (e: unknown) {
          const err = e as { message?: string; response?: { data?: unknown } }
          addLog('warning', `[Tickets] L.${lineNumber} — Mise à jour du statut impossible: ${err.message}`, lineNumber, undefined, err.response?.data)
          // Note: Le ticket a quand même été créé avec les liens, seul le statut final n'a pas été appliqué
        }
      }

    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: unknown } }
      addLog('error', `[Tickets] L.${lineNumber} — Erreur Ref#${ref}: ${err.message}`, lineNumber, undefined, err.response?.data)
      stats.errors++
    }
  }

  addLog('info', `[Tickets] Terminé — créés:${stats.created} ignorés:${stats.skipped} erreurs:${stats.errors}`)
  return stats
}

// ─── Import Feuille 3 : Coûts ─────────────────────────────────────────────────

interface CostRow {
  Num_Ticket: string; Duration_second: string; Time_Cost: string; Fixed_Cost: string
}

async function importCosts(
  rows: CostRow[],
  logs: ImportLogEntry[],
  refToGlpiId: Map<string, number>
): Promise<ImportResult['stats']['costs']> {
  const stats = { total: rows.length, created: 0, errors: 0 }
  const addLog = (level: ImportLogEntry['level'], message: string, lineNumber?: number, field?: string, details?: unknown) => {
    logs.push({ level, message, timestamp: new Date().toISOString(), lineNumber, field, details })
  }

  addLog('info', `[Coûts] Début de l'import — ${rows.length} ligne(s)`)
  const ticketCostsProcessed = new Map<number, Set<string>>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNumber = i + 1
    const ref = row.Num_Ticket?.trim()
    addLog('debug', `[Coûts] ─── Ligne ${lineNumber}: Ref#${ref} ───`, lineNumber)

    const ticketId = refToGlpiId.get(ref)
    if (!ticketId) {
      addLog('warning', `[Coûts] L.${lineNumber} — Ticket Ref#${ref} introuvable → ignoré`, lineNumber, 'Num_Ticket')
      stats.errors++
      continue
    }

    const costKey = `${row.Duration_second}|${row.Time_Cost}|${row.Fixed_Cost}`
    if (!ticketCostsProcessed.has(ticketId)) ticketCostsProcessed.set(ticketId, new Set())
    if (ticketCostsProcessed.get(ticketId)!.has(costKey)) {
      addLog('info', `[Coûts] L.${lineNumber} — Doublon ignoré pour Ticket#${ticketId}`, lineNumber)
      stats.created++
      continue
    }

    const actiontime = parseInt(row.Duration_second, 10)
    const cost_time  = parseFloat(row.Time_Cost.replace(',', '.'))
    const cost_fixed = parseFloat(row.Fixed_Cost.replace(',', '.'))

    if (isNaN(actiontime) || actiontime < 0) {
      addLog('error', `[Coûts] L.${lineNumber} — Duration_second invalide: "${row.Duration_second}"`, lineNumber, 'Duration_second')
      stats.errors++; continue
    }
    if (isNaN(cost_time) || cost_time < 0) {
      addLog('error', `[Coûts] L.${lineNumber} — Time_Cost invalide: "${row.Time_Cost}"`, lineNumber, 'Time_Cost')
      stats.errors++; continue
    }
    if (isNaN(cost_fixed) || cost_fixed < 0) {
      addLog('error', `[Coûts] L.${lineNumber} — Fixed_Cost invalide: "${row.Fixed_Cost}"`, lineNumber, 'Fixed_Cost')
      stats.errors++; continue
    }

    const cost_total = cost_time + cost_fixed
    addLog('debug', `[Coûts] L.${lineNumber} — actiontime=${actiontime}s cost_time=${cost_time} cost_fixed=${cost_fixed} total=${cost_total}`, lineNumber)

    try {
      await glpiClient.post('/TicketCost', {
        input: {
          tickets_id: ticketId,
          name:       `Coût import Ref#${ref}`,
          actiontime,
          cost_time,
          cost_fixed,
          cost_total,
          entities_id: 0,
        },
      })
      ticketCostsProcessed.get(ticketId)!.add(costKey)
      addLog('success', `[Coûts] L.${lineNumber} — Ticket#${ticketId} (Ref#${ref}): durée=${actiontime}s, temps=${cost_time}, fixe=${cost_fixed}`, lineNumber)
      stats.created++
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: unknown } }
      addLog('error', `[Coûts] L.${lineNumber} — Erreur Ref#${ref}: ${err.message}`, lineNumber, undefined, err.response?.data)
      stats.errors++
    }
  }

  addLog('info', `[Coûts] Terminé — créés:${stats.created} erreurs:${stats.errors}`)
  return stats
}

// ─── Import Photos (ZIP) ──────────────────────────────────────────────────────

async function importPhotos(
  zipFile: File,
  logs: ImportLogEntry[],
  nameToIdCache: Map<string, { itemtype: string; id: number }>
): Promise<ImportResult['stats']['photos']> {
  const stats = { total: 0, uploaded: 0, errors: 0 }
  const addLog = (level: ImportLogEntry['level'], message: string, details?: unknown) => {
    logs.push({ level, message, timestamp: new Date().toISOString(), details })
  }

  let JSZip: { loadAsync: (b: ArrayBuffer) => Promise<{ files: Record<string, unknown> }> }
  try {
    JSZip = (await import('jszip')).default as typeof JSZip
  } catch {
    addLog('warning', '[Photos] JSZip non installé. Exécutez : npm install jszip')
    return stats
  }

  async function convertPngToJpeg(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context indisponible')); return }
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(jpegBlob => {
          URL.revokeObjectURL(url)
          jpegBlob ? resolve(jpegBlob) : reject(new Error('Conversion PNG→JPEG échouée'))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erreur chargement image')) }
      img.src = url
    })
  }

  try {
    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const imageFiles = Object.entries(zip.files).filter(([fullPath, entry]: [string, unknown]) => {
      const e = entry as { dir: boolean }
      if (e.dir) return false
      if (fullPath.includes('__MACOSX/') || fullPath.startsWith('._')) return false
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(fullPath)
    })
    stats.total = imageFiles.length
    addLog('info', `[Photos] ${stats.total} image(s) dans le ZIP`)

    for (const [fullPath, zipEntry] of imageFiles as [string, { async: (t: string) => Promise<Blob> }][]) {
      const originalShortName = fullPath.replace(/^.*[\\/]/, '')
      let baseName = originalShortName.replace(/\.[^/.]+$/, '')
      addLog('debug', `[Photos] Traitement: ${originalShortName} → baseName="${baseName}"`)

      const assetRef = nameToIdCache.get(baseName)
      if (!assetRef) {
        addLog('warning', `[Photos] Asset "${baseName}" introuvable → ignoré`)
        stats.errors++; continue
      }

      try {
        let blob = await zipEntry.async('blob')
        let finalFilename = originalShortName
        let wasConverted = false
        if (originalShortName.toLowerCase().endsWith('.png')) {
          addLog('info', `[Photos] Conversion PNG→JPEG: ${originalShortName} (${(blob.size/1024).toFixed(1)}KB)`)
          try {
            blob = await convertPngToJpeg(blob)
            finalFilename = originalShortName.replace(/\.png$/i, '.jpg')
            baseName = finalFilename.replace(/\.[^/.]+$/, '')
            wasConverted = true
          } catch (e: unknown) {
            const err = e as { message?: string }
            addLog('error', `[Photos] Échec conversion PNG: ${err.message}`)
            stats.errors++; continue
          }
        }
        const mimeType = finalFilename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        const formData = new FormData()
        const manifest = {
          input: {
            name: baseName, entities_id: 0, documentcategories_id: 0,
            itemtype: assetRef.itemtype, items_id: assetRef.id,
          },
        }
        formData.append('uploadManifest', JSON.stringify(manifest))
        formData.append('filename', new File([blob], finalFilename, { type: mimeType }))

        const response = await glpiClient.post('/Document', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        addLog('success', `[Photos] "${finalFilename}" uploadé → ${assetRef.itemtype}#${assetRef.id} (Document ID: ${response.data?.id})${wasConverted ? ' (PNG→JPEG)' : ''}`)
        stats.uploaded++
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: unknown; status?: number } }
        addLog('error', `[Photos] Erreur "${originalShortName}": ${err.message}`, { response: err.response?.data, status: err.response?.status })
        stats.errors++
      }
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    addLog('error', `[Photos] Erreur lecture ZIP: ${err.message}`)
  }
  return stats
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export const importService = {

  /**
   * Analyse et valide un fichier CSV avant import.
   * Renvoie les en-têtes, les lignes et les erreurs détectées.
   */
  buildCsvPreview,
  parseCSV,
  readFileAsText,

  /**
   * Lance l'import complet.
   * Stratégie "tout ou rien" : si des erreurs surviennent durant l'import,
   * resetDatabase() est appelé automatiquement et success=false est retourné.
   */
  async runFullImport(
    sheet1: File,
    sheet2: File,
    sheet3: File,
    photosZip?: File | null,
    onProgress?: (pct: number, step: string) => void
  ): Promise<ImportResult> {
    const logs: ImportLogEntry[] = []
    const progress = (pct: number, step: string) => onProgress?.(pct, step)
    const log = (level: ImportLogEntry['level'], msg: string) =>
      logs.push({ level, message: msg, timestamp: new Date().toISOString() })

    const nameToIdCache = new Map<string, { itemtype: string; id: number }>()
    const refToGlpiId   = new Map<string, number>()
    const userStats     = { total: 0, created: 0, errors: 0 }

    log('info', '════════════════════════════════════')
    log('info', `  Début import — ${new Date().toLocaleString('fr-FR')}`)
    log('info', '════════════════════════════════════')
    progress(0, 'Lecture des fichiers CSV...')

    // ── Lecture fichiers ──
    const [csv1, csv2, csv3] = await Promise.all([
      readFileAsText(sheet1),
      readFileAsText(sheet2),
      readFileAsText(sheet3),
    ])
    const assetsRows  = parseCSV(csv1)  as unknown as AssetRow[]
    const ticketsRows = parseCSV(csv2)  as unknown as TicketRow[]
    const costsRows   = parseCSV(csv3)  as unknown as CostRow[]

    log('info', `Feuille 1 (Actifs)  : ${assetsRows.length} ligne(s)`)
    log('info', `Feuille 2 (Tickets) : ${ticketsRows.length} ligne(s)`)
    log('info', `Feuille 3 (Coûts)   : ${costsRows.length} ligne(s)`)

    // ── Validation préalable ──
    log('info', '─── Validation des CSV ───')
    const preValidErrors = [
      ...validateAssetsCsv(assetsRows).map(e => ({ ...e, sheet: 'Actifs' })),
      ...validateTicketsCsv(ticketsRows).map(e => ({ ...e, sheet: 'Tickets' })),
      ...validateCostsCsv(costsRows).map(e => ({ ...e, sheet: 'Coûts' })),
    ]
    if (preValidErrors.length > 0) {
      for (const e of preValidErrors) {
        logs.push({
          level: 'error',
          message: `[Validation ${e.sheet}] L.${e.lineNumber} — Champ "${e.field}" invalide (valeur: "${e.value}"): ${e.reason}`,
          timestamp: new Date().toISOString(),
          lineNumber: e.lineNumber,
          field: e.field,
        })
      }
      log('error', `Validation échouée — ${preValidErrors.length} erreur(s) détectée(s). Import annulé.`)
      return {
        success: false,
        logs,
        stats: {
          assets:  { total: assetsRows.length,  created: 0, skipped: 0, errors: preValidErrors.length },
          tickets: { total: ticketsRows.length, created: 0, skipped: 0, errors: 0 },
          costs:   { total: costsRows.length,   created: 0, errors: 0 },
          photos:  { total: 0, uploaded: 0, errors: 0 },
          users:   userStats,
        },
      }
    }
    log('success', 'Validation CSV réussie — aucune erreur de format')

    // ── Import assets ──
    progress(10, 'Import des actifs...')
    log('info', '─── Import Actifs ───')
    const assetsStats = await importAssets(assetsRows, logs, nameToIdCache, userStats)

    // ── Import tickets ──
    progress(50, 'Import des tickets...')
    log('info', '─── Import Tickets ───')
    const ticketsStats = await importTickets(ticketsRows, logs, nameToIdCache, refToGlpiId)

    // ── Import coûts ──
    progress(75, 'Import des coûts...')
    log('info', '─── Import Coûts ───')
    const costsStats = await importCosts(costsRows, logs, refToGlpiId)

    // ── Import photos ──
    let photosStats = { total: 0, uploaded: 0, errors: 0 }
    if (photosZip) {
      progress(85, 'Upload des photos...')
      log('info', '─── Import Photos ───')
      photosStats = await importPhotos(photosZip, logs, nameToIdCache)
    }

    progress(95, 'Vérification des résultats...')

    const hasErrors =
      assetsStats.errors > 0  ||
      ticketsStats.errors > 0 ||
      costsStats.errors > 0   ||
      photosStats.errors > 0  ||
      userStats.errors > 0

    if (hasErrors) {
      log('error', '════════ ERREURS DÉTECTÉES — RESET EN COURS ════════')
      log('error', `  Actifs: ${assetsStats.errors} erreur(s)`)
      log('error', `  Tickets: ${ticketsStats.errors} erreur(s)`)
      log('error', `  Coûts: ${costsStats.errors} erreur(s)`)
      log('error', `  Photos: ${photosStats.errors} erreur(s)`)
      log('error', `  Utilisateurs: ${userStats.errors} erreur(s)`)
      log('error', 'Rollback automatique : suppression de toutes les données importées...')
      try {
        const resetResults = await resetService.resetDatabase()
        for (const r of resetResults) {
          if (r.success) {
            log('info', `[Reset] ${r.itemtype} — ${r.message ?? 'purgé'}`)
          } else {
            log('warning', `[Reset] ${r.itemtype} — échec purge: ${JSON.stringify(r.error)}`)
          }
        }
        log('info', 'Reset terminé. Base revenue à son état initial.')
      } catch (resetErr: unknown) {
        const err = resetErr as { message?: string }
        log('error', `[Reset] Erreur critique lors du reset : ${err.message}`)
      }
    } else {
      log('success', '════════════════════════════════════')
      log('success', `  Import terminé avec succès — ${userStats.created} utilisateur(s) créé(s)`)
      log('success', '════════════════════════════════════')
    }

    progress(100, hasErrors ? 'Import annulé (reset effectué)' : 'Import terminé avec succès')

    return {
      success: !hasErrors,
      logs,
      stats: {
        assets:  assetsStats,
        tickets: ticketsStats,
        costs:   costsStats,
        photos:  photosStats,
        users:   userStats,
      },
    }
  },
}

export default importService