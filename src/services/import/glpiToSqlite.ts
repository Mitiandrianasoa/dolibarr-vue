// // services/import/glpiToSQLiteSync.ts
// // services/import/glpiToSqlite.ts
// import glpiClient from '../api/glpiClient'  // ← Vérifiez ce chemin
// import { SQLiteService, type Asset, type Ticket, type Cost } from './sqliteService'

// // Le reste du code reste identique

// export interface SyncResult {
//   success: boolean
//   assetsFetched: number
//   assetsStored: number
//   ticketsFetched: number
//   ticketsStored: number
//   costsStored: number
//   errors: string[]
//   duration: number
// }

// export class GlpiToSQLiteSync {
//   private sqliteService: SQLiteService

//   constructor(dbPath?: string) {
//     this.sqliteService = new SQLiteService(dbPath)
//   }

//   async sync(): Promise<SyncResult> {
//     const startTime = Date.now()
//     const errors: string[] = []
    
//     let assetsFetched = 0
//     let assetsStored = 0
//     let ticketsFetched = 0
//     let ticketsStored = 0
//     let costsStored = 0

//     try {
//       await this.sqliteService.initialize()
      
//       // 1. Synchronisation des actifs
//       console.log('📡 Récupération des actifs depuis GLPI...')
//       const assetsResult = await this.syncAssets()
//       assetsFetched = assetsResult.fetched
//       assetsStored = assetsResult.stored
//       errors.push(...assetsResult.errors)

//       // 2. Synchronisation des tickets
//       console.log('📡 Récupération des tickets depuis GLPI...')
//       const ticketsResult = await this.syncTickets()
//       ticketsFetched = ticketsResult.fetched
//       ticketsStored = ticketsResult.stored
//       errors.push(...ticketsResult.errors)

//       // 3. Les coûts sont gérés via les tickets
//       costsStored = ticketsResult.costsStored

//       // Enregistrer l'historique
//       await this.sqliteService.addSyncHistory(
//         'GLPI_TO_SQLITE',
//         'all',
//         assetsStored + ticketsStored,
//         errors.length === 0 ? 'success' : errors.length > 0 ? 'partial' : 'error',
//         errors.length > 0 ? errors.join('; ') : undefined
//       )

//       const duration = Date.now() - startTime
//       console.log(`✅ Sync GLPI → SQLite terminée en ${duration}ms`)

//       return {
//         success: errors.length === 0,
//         assetsFetched,
//         assetsStored,
//         ticketsFetched,
//         ticketsStored,
//         costsStored,
//         errors,
//         duration
//       }

//     } catch (error: any) {
//       errors.push(`Erreur fatale: ${error.message}`)
//       return {
//         success: false,
//         assetsFetched: 0,
//         assetsStored: 0,
//         ticketsFetched: 0,
//         ticketsStored: 0,
//         costsStored: 0,
//         errors,
//         duration: Date.now() - startTime
//       }
//     } finally {
//       await this.sqliteService.close()
//     }
//   }

//   private async syncAssets(): Promise<{ fetched: number; stored: number; errors: string[] }> {
//     let fetched = 0
//     let stored = 0
//     const errors: string[] = []

//     try {
//       // Types d'actifs à récupérer
//       const itemTypes = ['Computer', 'Monitor', 'Printer', 'Phone', 'NetworkEquipment', 'Peripheral']
      
//       for (const itemType of itemTypes) {
//         try {
//           // Récupérer les actifs depuis GLPI
//           const { data } = await glpiClient.get(`/${itemType}`, {
//             params: { 'range': '0-999' } // Ajustez selon vos besoins
//           })

//           if (Array.isArray(data)) {
//             fetched += data.length
            
//             for (const glpiAsset of data) {
//               try {
//                 // Vérifier si l'actif existe déjà dans SQLite
//                 const existing = await this.sqliteService.getAssetByGlpiId(glpiAsset.id)
                
//                 const asset: Asset = {
//                   name: glpiAsset.name || `Asset_${glpiAsset.id}`,
//                   status: this.mapGlpiStatus(glpiAsset.states_id),
//                   location: glpiAsset.location_name || '',
//                   manufacturer: glpiAsset.manufacturer_name || '',
//                   item_type: itemType,
//                   model: glpiAsset.model_name || '',
//                   inventory_number: glpiAsset.otherserial || '',
//                   user_name: glpiAsset.user_name || '',
//                   glpi_id: glpiAsset.id
//                 }

//                 if (!existing) {
//                   await this.sqliteService.insertAsset(asset)
//                 } else {
//                   // Mise à jour si l'actif existe déjà
//                   await this.sqliteService.updateAssetGlpiId(asset.name, glpiAsset.id)
//                 }
//                 stored++
//               } catch (err: any) {
//                 errors.push(`Asset ${glpiAsset.name}: ${err.message}`)
//               }
//             }
//           }
//         } catch (err: any) {
//           errors.push(`Erreur ${itemType}: ${err.message}`)
//         }
//       }
//     } catch (err: any) {
//       errors.push(`syncAssets: ${err.message}`)
//     }

//     return { fetched, stored, errors }
//   }

//   private async syncTickets(): Promise<{ fetched: number; stored: number; costsStored: number; errors: string[] }> {
//     let fetched = 0
//     let stored = 0
//     let costsStored = 0
//     const errors: string[] = []

//     try {
//       // Récupérer les tickets depuis GLPI
//       const { data } = await glpiClient.get('/Ticket', {
//         params: { 'range': '0-999', 'expand_dropdowns': true }
//       })

//       if (Array.isArray(data)) {
//         fetched = data.length

//         for (const glpiTicket of data) {
//           try {
//             // Vérifier si le ticket existe déjà
//             const existing = await this.sqliteService.getTicketByRef(glpiTicket.name || `TICKET_${glpiTicket.id}`)
            
//             const ticket: Ticket = {
//               ref_ticket: glpiTicket.name || `TICKET_${glpiTicket.id}`,
//               date: this.formatDate(glpiTicket.date),
//               heure: this.formatTime(glpiTicket.date),
//               type: this.mapGlpiTicketType(glpiTicket.type),
//               titre: glpiTicket.name || '',
//               description: glpiTicket.content || '',
//               status: this.mapGlpiTicketStatus(glpiTicket.status),
//               priority: this.mapGlpiPriority(glpiTicket.priority),
//               items: '[]', // À adapter selon vos besoins
//               glpi_id: glpiTicket.id
//             }

//             if (!existing) {
//               await this.sqliteService.insertTicket(ticket)
//             } else {
//               await this.sqliteService.updateTicketGlpiId(ticket.ref_ticket, glpiTicket.id)
//             }
//             stored++

//             // Récupérer les coûts du ticket
//             try {
//               const { data: costsData } = await glpiClient.get(`/Ticket/${glpiTicket.id}/TicketCost`)
//               if (Array.isArray(costsData)) {
//                 for (const costItem of costsData) {
//                   const cost: Cost = {
//                     num_ticket: ticket.ref_ticket,
//                     duration_second: costItem.actiontime || 0,
//                     time_cost: costItem.cost_time || 0,
//                     fixed_cost: costItem.cost_fixed || 0
//                   }
//                   await this.sqliteService.insertCost(cost)
//                   costsStored++
//                 }
//               }
//             } catch (err: any) {
//               errors.push(`Coûts ticket ${glpiTicket.id}: ${err.message}`)
//             }

//           } catch (err: any) {
//             errors.push(`Ticket ${glpiTicket.id}: ${err.message}`)
//           }
//         }
//       }
//     } catch (err: any) {
//       errors.push(`syncTickets: ${err.message}`)
//     }

//     return { fetched, stored, costsStored, errors }
//   }

//   // ─── Mappings ─────────────────────────────────────────────

//   private mapGlpiStatus(statusId: number): string {
//     const map: Record<number, string> = {
//       1: 'En production',
//       2: 'En stock',
//       3: 'Réformé',
//       4: 'Maintenance',
//       5: 'En panne',
//       6: 'Hors service'
//     }
//     return map[statusId] || 'Inconnu'
//   }

//   private mapGlpiTicketStatus(statusId: number): string {
//     const map: Record<number, string> = {
//       1: 'New',
//       2: 'Assigned',
//       3: 'Planned',
//       4: 'Pending',
//       5: 'Solved',
//       6: 'Closed'
//     }
//     return map[statusId] || 'New'
//   }

//   private mapGlpiTicketType(typeId: number): string {
//     return typeId === 1 ? 'Incident' : 'Request'
//   }

//   private mapGlpiPriority(priorityId: number): string {
//     const map: Record<number, string> = {
//       1: 'Very Low',
//       2: 'Low',
//       3: 'Medium',
//       4: 'High',
//       5: 'Very High',
//       6: 'Major'
//     }
//     return map[priorityId] || 'Medium'
//   }

//   private formatDate(dateStr: string): string {
//     if (!dateStr) return ''
//     const date = new Date(dateStr)
//     return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
//   }

//   private formatTime(dateStr: string): string {
//     if (!dateStr) return ''
//     const date = new Date(dateStr)
//     return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
//   }
// }