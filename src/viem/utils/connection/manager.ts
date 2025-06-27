import { EventEmitter } from 'events'
import type { ConnectionStatus, ConnectionStats } from '../../types/connection'

export class ConnectionStateManager extends EventEmitter {
  private state: ConnectionStats = {
    status: 'disconnected',
    reconnectAttempts: 0,
    totalConnections: 0,
    totalDisconnections: 0,
  }

  updateStatus(status: ConnectionStatus, error?: Error): void {
    const previousStatus = this.state.status
    this.state.status = status

    if (status === 'connected') {
      this.state.connectedAt = Date.now()
      this.state.totalConnections++
      this.state.reconnectAttempts = 0
      delete this.state.lastError
    } else if (status === 'disconnected') {
      this.state.disconnectedAt = Date.now()
      if (previousStatus === 'connected') {
        this.state.totalDisconnections++
      }
    } else if (status === 'error') {
      this.state.lastError = error
    }

    if (previousStatus !== status) {
      this.emit('statusChange', status)
      this.emit('stats', { ...this.state })
    }
  }

  incrementReconnectAttempts(): void {
    this.state.reconnectAttempts++
    this.emit('stats', { ...this.state })
  }

  resetReconnectAttempts(): void {
    this.state.reconnectAttempts = 0
  }

  getStats(): ConnectionStats {
    return { ...this.state }
  }

  getStatus(): ConnectionStatus {
    return this.state.status
  }
}