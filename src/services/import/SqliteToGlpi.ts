// // services/import/sqliteToGLPISync.ts
// import glpiClient from '../api/glpiClient'
// import { SQLiteService } from './sqliteService'

// export interface PushResult {
//   success: boolean
//   assetsPushed: number
//   assetsFailed: number
//   ticketsPushed: number
//   ticketsFailed: number
//   costsPushed: number
//   errors: string[]
//   duration: number
// }

// export class SqliteToGLPISync {
//   private sqliteService: SQLiteService
//   private userCache: Map<string, number> = new Map()
//   private locationCache: Map<string, number> = new Map()
//   private manufacturerCache: Map<string, number> = new Map()

//   constructor(dbPath?: string) {
//     this.sqliteService = new SQLiteService(dbPath)
//   }

//   async push(): Promise<PushResult> {
//     const startTime = Date.now()
//     const errors: string[] = []
    
//     let assetsPushed = 0
//     let assetsFailed = 0
//     let ticketsPushed = 0
//     let ticketsFailed = 0
//     let costsPushed = 0

//     try {
//       await this.sqliteService.initialize()
      
//       // 1. Push des actifs non synchronisés
//       console.log('📤 Push des actifs vers GLPI...')
//       const assetsResult = await this.pushAssets()
//       assetsPushed = assetsResult.pushed
//       assetsFailed = assetsResult.failed
//       errors.push(...assetsResult.errors)

//       // 2. Push des tickets non synchronisés
//       console.log('📤 Push des tickets vers GLPI...')
//       const ticketsResult = await this.pushTickets()
//       ticketsPushed = ticketsResult.pushed
//       ticketsFailed = ticketsResult.failed
//       costsPushed = ticketsResult.costsPushed
//       errors.push(...ticketsResult.errors)

//       // Enregistrer l'historique
//       await this.sqliteService.addSyncHistory(
//         'SQLITE_TO_GLPI',
//         'all',
//         assetsPushed + ticketsPushed,
//         errors.length === 0 ? 'success' : errors.length > 0 ? 'partial' : 'error',
//         errors.length > 0 ? errors.join('; ') : undefined
//       )

//       const duration = Date.now() - startTime
//       console.log(`✅ Push SQLite → GLPI terminé en ${duration}ms`)

//       return {
//         success: errors.length === 0,
//         assetsPushed,
//         assetsFailed,
//         ticketsPushed,
//         ticketsFailed,
//         costsPushed,
//         errors,
//         duration
//       }

//     } catch (error: any) {
//       errors.push(`Erreur fatale: ${error.message}`)
//       return {
//         success: false,
//         assetsPushed: 0,
//         assetsFailed: assetsFailed || 0,
//         ticketsPushed: 0,
//         ticketsFailed: ticketsFailed || 0,
//         costsPushed: 0,
//         errors,
//         duration: Date.now() - startTime
//       }
//     } finally {
//       await this.sqliteService.close()
//     }
//   }

//   private async pushAssets(): Promise<{ pushed: number; failed: number; errors: string[] }> {
//     let pushed = 0
//     let failed = 0
//     const errors: string[] = []

//     try {
//       const assets = await this.sqliteService.getAllAssets(true) // Seulement non synchronisés
      
//       for (const asset of assets) {
//         try {
//           // Résoudre les dépendances
//           const locationId = await this.resolveLocation(asset.location)
//           const manufacturerId = await this.resolveManufacturer(asset.manufacturer)
//           const userId = await this.resolveUser(asset.user_name)

//           // Construire le payload
//           const itemType = this.mapItemType(asset.item_type)
//           const payload: any = {
//             name: asset.name,
//             otherserial: asset.inventory_number,
//             states_id: this.mapStatus(asset.status)
//           }
//           if (locationId) payload.locations_id = locationId
//           if (manufacturerId) payload.manufacturers_id = manufacturerId
//           if (userId) payload.users_id = userId

//           // Envoyer à GLPI
//           const { data } = await glpiClient.post(`/${itemType}`, { input: payload })
          
//           // Mettre à jour SQLite avec l'ID GLPI
//           await this.sqliteService.updateAssetGlpiId(asset.name, data.id)
          
//           pushed++
//           console.log(`✅ Asset "${asset.name}" pushé (GLPI ID: ${data.id})`)
          
//         } catch (err: any) {
//           failed++
//           const errorMsg = `Asset ${asset.name}: ${err.message}`
//           errors.push(errorMsg)
//           console.error(`❌ ${errorMsg}`)
//         }
//       }
//     } catch (err: any) {
//       errors.push(`pushAssets: ${err.message}`)
//     }

//     return { pushed, failed, errors }
//   }

//   private async pushTickets(): Promise<{ pushed: number; failed: number; costsPushed: number; errors: string[] }> {
//     let pushed = 0
//     let failed = 0
//     let costsPushed = 0
//     const errors: string[] = []

//     try {
//       const tickets = await this.sqliteService.getAllTickets(true) // Seulement non synchronisés
      
//       for (const ticket of tickets) {
//         try {
//           // Construire le payload du ticket
//           const payload = {
//             name: ticket.titre,
//             content: ticket.description,
//             type: this.mapTicketType(ticket.type),
//             status: this.mapTicketStatus(ticket.status),
//             priority: this.mapPriority(ticket.priority),
//             urgency: 3,
//             impact: 3,
//             date: this.formatDateTime(ticket.date, ticket.heure),
//             requesttypes_id: 1
//           }

//           // Envoyer à GLPI
//           const { data } = await glpiClient.post('/Ticket', { input: payload })
          
//           // Mettre à jour SQLite
//           await this.sqliteService.updateTicketGlpiId(ticket.ref_ticket, data.id)
          
//           // Push des coûts associés
//           const costs = await this.sqliteService.getAllCosts()
//           const ticketCosts = costs.filter(c => c.num_ticket === ticket.ref_ticket)
          
//           for (const cost of ticketCosts) {
//             try {
//               await glpiClient.post('/TicketCost', {
//                 input: {
//                   tickets_id: data.id,
//                   name: `Coût pour ${ticket.ref_ticket}`,
//                   actiontime: cost.duration_second,
//                   cost_time: cost.time_cost,
//                   cost_fixed: cost.fixed_cost,
//                   cost_total: (cost.time_cost || 0) + (cost.fixed_cost || 0)
//                 }
//               })
//               costsPushed++
//             } catch (err: any) {
//               errors.push(`Coût pour ${ticket.ref_ticket}: ${err.message}`)
//             }
//           }
          
//           pushed++
//           console.log(`✅ Ticket "${ticket.ref_ticket}" pushé (GLPI ID: ${data.id})`)
          
//         } catch (err: any) {
//           failed++
//           const errorMsg = `Ticket ${ticket.ref_ticket}: ${err.message}`
//           errors.push(errorMsg)
//           console.error(`❌ ${errorMsg}`)
//         }
//       }
//     } catch (err: any) {
//       errors.push(`pushTickets: ${err.message}`)
//     }

//     return { pushed, failed, costsPushed, errors }
//   }

//   // ─── Helpers (copiés depuis votre importService existant) ───

//   private async resolveLocation(name: string): Promise<number | undefined> {
//     if (!name) return undefined
//     if (this.locationCache.has(name)) return this.locationCache.get(name)!

//     try {
//       const { data } = await glpiClient.get('/Location', {
//         params: { 'searchText[name]': name, range: '0-1' }
//       })
//       if (Array.isArray(data) && data.length > 0) {
//         this.locationCache.set(name, data[0].id)
//         return data[0].id
//       }
      
//       const { data: created } = await glpiClient.post('/Location', { input: { name } })
//       this.locationCache.set(name, created.id)
//       return created.id
//     } catch {
//       return undefined
//     }
//   }

//   private async resolveManufacturer(name: string): Promise<number | undefined> {
//     if (!name) return undefined
//     if (this.manufacturerCache.has(name)) return this.manufacturerCache.get(name)!

//     try {
//       const { data } = await glpiClient.get('/Manufacturer', {
//         params: { 'searchText[name]': name, range: '0-1' }
//       })
//       if (Array.isArray(data) && data.length > 0) {
//         this.manufacturerCache.set(name, data[0].id)
//         return data[0].id
//       }
      
//       const { data: created } = await glpiClient.post('/Manufacturer', { input: { name } })
//       this.manufacturerCache.set(name, created.id)
//       return created.id
//     } catch {
//       return undefined
//     }
//   }

//   private async resolveUser(fullName: string): Promise<number | undefined> {
//     if (!fullName) return undefined
//     if (this.userCache.has(fullName)) return this.userCache.get(fullName)!

//     try {
//       const parts = fullName.trim().split(' ')
//       const lastname = parts[0]
//       const firstname = parts.slice(1).join(' ')
//       const login = `${firstname.toLowerCase()}.${lastname.toLowerCase()}`

//       const { data } = await glpiClient.get('/User', {
//         params: { 'searchText[name]': login, range: '0-1' }
//       })
      
//       if (Array.isArray(data) && data.length > 0) {
//         this.userCache.set(fullName, data[0].id)
//         return data[0].id
//       }
      
//       const { data: created } = await glpiClient.post('/User', {
//         input: { name: login, realname: lastname, firstname, password: "123", password2: "123", is_active: 1 }
//       })
//       this.userCache.set(fullName, created.id)
//       return created.id
//     } catch {
//       return undefined
//     }
//   }

//   private mapItemType(type: string): string {
//     const map: Record<string, string> = {
//       'Computer': 'Computer',
//       'Monitor': 'Monitor',
//       'Printer': 'Printer',
//       'Phone': 'Phone',
//       'NetworkEquipment': 'NetworkEquipment',
//       'Peripheral': 'Peripheral'
//     }
//     return map[type] || 'Computer'
//   }

//   private mapStatus(status: string): number {
//     const map: Record<string, number> = {
//       'En production': 1, 'En stock': 2, 'Réformé': 3,
//       'Maintenance': 4, 'En panne': 5, 'Hors service': 6
//     }
//     return map[status] || 1
//   }

//   private mapTicketType(type: string): number {
//     return type === 'Incident' ? 1 : 2
//   }

//   private mapTicketStatus(status: string): number {
//     const map: Record<string, number> = {
//       'New': 1, 'Assigned': 2, 'Planned': 3,
//       'Pending': 4, 'Solved': 5, 'Closed': 6
//     }
//     return map[status] || 1
//   }

//   private mapPriority(priority: string): number {
//     const map: Record<string, number> = {
//       'Very Low': 1, 'Low': 2, 'Medium': 3,
//       'High': 4, 'Very High': 5, 'Major': 6
//     }
//     return map[priority] || 3
//   }

//   private formatDateTime(date: string, time: string): string {
//     if (!date) return new Date().toISOString()
//     const [day, month, year] = date.split('/')
//     return `${year}-${month}-${day} ${time || '00:00'}:00`
//   }
// }