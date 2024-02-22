import { IProtocol } from './define'

export class BroadcastProtocol implements IProtocol {
  private channel: BroadcastChannel

  constructor(sessionId: string) {
    this.channel = new BroadcastChannel(sessionId)
  }
  send(data: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  receive(): Promise<string> {
    throw new Error('Method not implemented.')
  }
  destroy(): void {
    throw new Error('Method not implemented.')
  }
}

export class WindowProtocol implements IProtocol {
  private channel: BroadcastChannel

  constructor(sessionId: string) {
    this.channel = new BroadcastChannel(sessionId)
  }
  send(data: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  receive(): Promise<string> {
    throw new Error('Method not implemented.')
  }
  destroy(): void {
    throw new Error('Method not implemented.')
  }
}
