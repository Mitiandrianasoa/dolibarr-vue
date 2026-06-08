// // services/import/sqliteService.ts
// import sqlite3 from 'sqlite3'
// import { open, Database } from 'sqlite'

// // Interfaces
// export interface Asset {
//   id?: number
//   name: string
//   status: string
//   location: string
//   manufacturer: string
//   item_type: string
//   model: string
//   inventory_number: string
//   user_name: string
//   glpi_id?: number
//   created_at?: string
//   updated_at?: string
// }

// export interface Ticket {
//   id?: number
//   ref_ticket: string
//   date: string
//   heure: string
//   type: string
//   titre: string
//   description: string
//   status: string
//   priority: string
//   items: string
//   glpi_id?: number
//   created_at?: string
//   updated_at?: string
// }

// export interface Cost {
//   id?: number
//   num_ticket: string
//   duration_second: number
//   time_cost: number
//   fixed_cost: number
//   total_cost?: number
//   created_at?: string
// }

// export class SQLiteService {
//   private db: Database | null = null
//   private dbPath: string

//   constructor(dbPath: string = './glpi_backup.db') {
//     this.dbPath = dbPath
//   }

//   async initialize(): Promise<void> {
//     this.db = await open({
//       filename: this.dbPath,
//       driver: sqlite3.Database
//     })

//     await this.createTables()
//     console.log(`✅ SQLite initialisé: ${this.dbPath}`)
//   }

//   private async createTables(): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')

//     // Table des actifs
//     await this.db.exec(`
//       CREATE TABLE IF NOT EXISTS assets (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT UNIQUE NOT NULL,
//         status TEXT,
//         location TEXT,
//         manufacturer TEXT,
//         item_type TEXT,
//         model TEXT,
//         inventory_number TEXT UNIQUE,
//         user_name TEXT,
//         glpi_id INTEGER,
//         synced_at DATETIME,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
//       )
//     `)

//     // Table des tickets
//     await this.db.exec(`
//       CREATE TABLE IF NOT EXISTS tickets (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         ref_ticket TEXT UNIQUE NOT NULL,
//         date TEXT,
//         heure TEXT,
//         type TEXT,
//         titre TEXT,
//         description TEXT,
//         status TEXT,
//         priority TEXT,
//         items TEXT,
//         glpi_id INTEGER,
//         synced_at DATETIME,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
//       )
//     `)

//     // Table des coûts
//     await this.db.exec(`
//       CREATE TABLE IF NOT EXISTS costs (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         num_ticket TEXT NOT NULL,
//         duration_second INTEGER DEFAULT 0,
//         time_cost REAL DEFAULT 0,
//         fixed_cost REAL DEFAULT 0,
//         total_cost REAL DEFAULT 0,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (num_ticket) REFERENCES tickets(ref_ticket)
//       )
//     `)

//     // Table d'historique des synchronisations
//     await this.db.exec(`
//       CREATE TABLE IF NOT EXISTS sync_history (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         direction TEXT NOT NULL,
//         entity_type TEXT NOT NULL,
//         items_count INTEGER,
//         status TEXT,
//         error_message TEXT,
//         started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         completed_at DATETIME
//       )
//     `)

//     // Index pour performances
//     await this.db.exec(`
//       CREATE INDEX IF NOT EXISTS idx_assets_glpi_id ON assets(glpi_id);
//       CREATE INDEX IF NOT EXISTS idx_assets_inventory ON assets(inventory_number);
//       CREATE INDEX IF NOT EXISTS idx_tickets_glpi_id ON tickets(glpi_id);
//       CREATE INDEX IF NOT EXISTS idx_tickets_ref ON tickets(ref_ticket);
//       CREATE INDEX IF NOT EXISTS idx_sync_history_direction ON sync_history(direction);
//     `)
//   }

//   // ─── Assets ──────────────────────────────────────────────

//   async getAllAssets(onlyNotSynced: boolean = false): Promise<Asset[]> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     let query = 'SELECT * FROM assets'
//     if (onlyNotSynced) {
//       query += ' WHERE glpi_id IS NULL OR glpi_id = 0'
//     }
//     query += ' ORDER BY name'
    
//     return await this.db.all(query)
//   }

//   async getAssetById(id: number): Promise<Asset | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM assets WHERE id = ?', id)
//   }

//   async getAssetByGlpiId(glpiId: number): Promise<Asset | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM assets WHERE glpi_id = ?', glpiId)
//   }

//   async getAssetByName(name: string): Promise<Asset | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM assets WHERE name = ?', name)
//   }

//   async insertAsset(asset: Asset): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     const result = await this.db.run(
//       `INSERT INTO assets (
//         name, status, location, manufacturer, item_type, 
//         model, inventory_number, user_name, glpi_id
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         asset.name, asset.status, asset.location, asset.manufacturer,
//         asset.item_type, asset.model, asset.inventory_number, 
//         asset.user_name, asset.glpi_id || null
//       ]
//     )
//     return result.lastID!
//   }

//   async updateAssetGlpiId(name: string, glpiId: number): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     await this.db.run(
//       `UPDATE assets SET glpi_id = ?, synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
//        WHERE name = ?`,
//       [glpiId, name]
//     )
//   }

//   async updateAsset(asset: Asset): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     await this.db.run(
//       `UPDATE assets SET 
//         status = ?, location = ?, manufacturer = ?, item_type = ?,
//         model = ?, inventory_number = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP
//        WHERE name = ?`,
//       [
//         asset.status, asset.location, asset.manufacturer, asset.item_type,
//         asset.model, asset.inventory_number, asset.user_name, asset.name
//       ]
//     )
//   }

//   async deleteAsset(name: string): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
//     await this.db.run('DELETE FROM assets WHERE name = ?', name)
//   }

//   async getAssetsCount(): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
//     const result = await this.db.get('SELECT COUNT(*) as count FROM assets')
//     return result?.count || 0
//   }

//   async getAssetsNotSyncedCount(): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
//     const result = await this.db.get(
//       'SELECT COUNT(*) as count FROM assets WHERE glpi_id IS NULL OR glpi_id = 0'
//     )
//     return result?.count || 0
//   }

//   // ─── Tickets ──────────────────────────────────────────────

//   async getAllTickets(onlyNotSynced: boolean = false): Promise<Ticket[]> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     let query = 'SELECT * FROM tickets'
//     if (onlyNotSynced) {
//       query += ' WHERE glpi_id IS NULL OR glpi_id = 0'
//     }
//     query += ' ORDER BY ref_ticket'
    
//     return await this.db.all(query)
//   }

//   async getTicketById(id: number): Promise<Ticket | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM tickets WHERE id = ?', id)
//   }

//   async getTicketByRef(ref: string): Promise<Ticket | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM tickets WHERE ref_ticket = ?', ref)
//   }

//   async getTicketByGlpiId(glpiId: number): Promise<Ticket | undefined> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM tickets WHERE glpi_id = ?', glpiId)
//   }

//   async insertTicket(ticket: Ticket): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     const result = await this.db.run(
//       `INSERT INTO tickets (
//         ref_ticket, date, heure, type, titre, description, status, priority, items, glpi_id
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         ticket.ref_ticket, ticket.date, ticket.heure, ticket.type, ticket.titre,
//         ticket.description, ticket.status, ticket.priority, ticket.items, ticket.glpi_id || null
//       ]
//     )
//     return result.lastID!
//   }

//   async updateTicketGlpiId(ref: string, glpiId: number): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     await this.db.run(
//       `UPDATE tickets SET glpi_id = ?, synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
//        WHERE ref_ticket = ?`,
//       [glpiId, ref]
//     )
//   }

//   async updateTicket(ticket: Ticket): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     await this.db.run(
//       `UPDATE tickets SET 
//         date = ?, heure = ?, type = ?, titre = ?, description = ?,
//         status = ?, priority = ?, items = ?, updated_at = CURRENT_TIMESTAMP
//        WHERE ref_ticket = ?`,
//       [
//         ticket.date, ticket.heure, ticket.type, ticket.titre, ticket.description,
//         ticket.status, ticket.priority, ticket.items, ticket.ref_ticket
//       ]
//     )
//   }

//   async deleteTicket(ref: string): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
//     await this.db.run('DELETE FROM tickets WHERE ref_ticket = ?', ref)
//   }

//   async getTicketsCount(): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
//     const result = await this.db.get('SELECT COUNT(*) as count FROM tickets')
//     return result?.count || 0
//   }

//   async getTicketsNotSyncedCount(): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
//     const result = await this.db.get(
//       'SELECT COUNT(*) as count FROM tickets WHERE glpi_id IS NULL OR glpi_id = 0'
//     )
//     return result?.count || 0
//   }

//   // ─── Costs ───────────────────────────────────────────────

//   async getAllCosts(): Promise<Cost[]> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.all('SELECT * FROM costs ORDER BY num_ticket')
//   }

//   async getCostsByTicket(numTicket: string): Promise<Cost[]> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.all('SELECT * FROM costs WHERE num_ticket = ?', numTicket)
//   }

//   async insertCost(cost: Cost): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     const totalCost = (cost.time_cost || 0) + (cost.fixed_cost || 0)
    
//     const result = await this.db.run(
//       `INSERT INTO costs (
//         num_ticket, duration_second, time_cost, fixed_cost, total_cost
//       ) VALUES (?, ?, ?, ?, ?)`,
//       [cost.num_ticket, cost.duration_second || 0, cost.time_cost || 0, cost.fixed_cost || 0, totalCost]
//     )
//     return result.lastID!
//   }

//   async clearCosts(): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
//     await this.db.run('DELETE FROM costs')
//   }

//   async deleteCostsByTicket(numTicket: string): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
//     await this.db.run('DELETE FROM costs WHERE num_ticket = ?', numTicket)
//   }

//   async getCostsCount(): Promise<number> {
//     if (!this.db) throw new Error('Base non initialisée')
//     const result = await this.db.get('SELECT COUNT(*) as count FROM costs')
//     return result?.count || 0
//   }

//   // ─── Sync History ─────────────────────────────────────────

//   async addSyncHistory(
//     direction: 'GLPI_TO_SQLITE' | 'SQLITE_TO_GLPI',
//     entityType: 'assets' | 'tickets' | 'all',
//     itemsCount: number,
//     status: 'success' | 'error' | 'partial',
//     errorMessage?: string
//   ): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     await this.db.run(
//       `INSERT INTO sync_history (direction, entity_type, items_count, status, error_message, completed_at)
//        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
//       [direction, entityType, itemsCount, status, errorMessage || null]
//     )
//   }

//   async getSyncHistory(limit: number = 20): Promise<any[]> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     return await this.db.all(
//       `SELECT * FROM sync_history ORDER BY started_at DESC LIMIT ?`,
//       limit
//     )
//   }

//   async getLastSync(): Promise<any> {
//     if (!this.db) throw new Error('Base non initialisée')
//     return await this.db.get('SELECT * FROM sync_history ORDER BY completed_at DESC LIMIT 1')
//   }

//   // ─── Utilitaires ─────────────────────────────────────────

//   async getStats(): Promise<{
//     assets: { total: number; synced: number; notSynced: number }
//     tickets: { total: number; synced: number; notSynced: number }
//     costs: number
//     lastSync: any
//   }> {
//     if (!this.db) throw new Error('Base non initialisée')
    
//     const assetsTotal = await this.getAssetsCount()
//     const assetsSynced = await this.db.get(
//       'SELECT COUNT(*) as count FROM assets WHERE glpi_id IS NOT NULL AND glpi_id > 0'
//     )
//     const ticketsTotal = await this.getTicketsCount()
//     const ticketsSynced = await this.db.get(
//       'SELECT COUNT(*) as count FROM tickets WHERE glpi_id IS NOT NULL AND glpi_id > 0'
//     )
//     const costsTotal = await this.getCostsCount()
//     const lastSync = await this.getLastSync()

//     return {
//       assets: {
//         total: assetsTotal,
//         synced: assetsSynced?.count || 0,
//         notSynced: assetsTotal - (assetsSynced?.count || 0)
//       },
//       tickets: {
//         total: ticketsTotal,
//         synced: ticketsSynced?.count || 0,
//         notSynced: ticketsTotal - (ticketsSynced?.count || 0)
//       },
//       costs: costsTotal,
//       lastSync
//     }
//   }

//   async clearAllData(): Promise<void> {
//     if (!this.db) throw new Error('Base non initialisée')
//     await this.db.exec('DELETE FROM costs')
//     await this.db.exec('DELETE FROM tickets')
//     await this.db.exec('DELETE FROM assets')
//   }

//   async close(): Promise<void> {
//     if (this.db) {
//       await this.db.close()
//       this.db = null
//     }
//   }
// }