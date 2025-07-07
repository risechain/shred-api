export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface ConnectionStats {
  status: ConnectionStatus
  connectedAt?: number
  disconnectedAt?: number
  reconnectAttempts: number
  lastError?: Error
  totalConnections: number
  totalDisconnections: number
}

export interface ConnectionEventMap {
  statusChange: (status: ConnectionStatus) => void
  stats: (stats: ConnectionStats) => void
}
