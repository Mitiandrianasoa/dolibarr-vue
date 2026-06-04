export type TableSection = 'helpdesk' | 'assets'
export type TableStatus = 'idle' | 'fetching' | 'deleting' | 'done' | 'error' | 'skipped'
export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface TableDef {
  id: string
  table: string
  itemtype: string
  label: string
  description: string
  order: number
  section: TableSection
  group: string
}

export interface TableState extends TableDef {
  selected: boolean
  count: number | null
  status: TableStatus
  deleted: number
  error?: string
}

export interface LogEntry {
  id: number
  time: string
  level: LogLevel
  message: string
}

export interface AuthOptions {
  baseUrl: string
  appToken?: string
  userToken?: string
  login?: string
  password?: string
}
