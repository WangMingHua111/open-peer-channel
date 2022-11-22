// import remove from 'lodash-es/remove'
// import clone from 'lodash-es/clone'
interface IServer {
  /**
   * 销毁对象
   */
  destroy(): void
  /**
   * 注册应用域
   * @param cls 应用对象
   */
  register(cls: any): IServer
}

interface IClient {
  /**
   * 
   * @param data 支持【结构化克隆算法】克隆的数据
   * @param [type="*"]  事件类型
   */
  push(data: any, type?: string): void
  /**
   * 通过远程调用的方式，在Server端执行函数，并返回结果
   * @param fn 执行函数
   */
  call(fn: Function): Promise<any>
  /**
   * 绑定消息侦听器
   * @param listener 侦听器
   * @param [type="*"]  事件类型 
   */
  message(listener: (data: any) => void, type?: string): IClient

  /**
   * 取消消息侦听器
   * @param [type]  事件类型，不传值时移除所有侦听器
   * @param listener 侦听器
   */
  off(type?: string, listener?: (data: any) => void): IClient
}

interface ChannelServerOptions {
  /**
   * Channel Id，设置值时仅相同通道ID的的会话支持双向通讯
   */
  id?: string
}

interface OpenPeerChannelOptions extends ChannelServerOptions {
  /**
   * 父级Window，通过传入该值，打通两个对象间的通讯
   * 可以通过 SimpleMessageEventSource 函数快速获取parent链
   */
  parent?: MessageEventSource | Array<MessageEventSource>
}

/**
 * 封包数据
 */
class PacketData {
  public readonly sender: string
  public readonly no: number
  public readonly sessionId: string
  public readonly type: string
  public readonly data: any
  public readonly internal: boolean
  public readonly error: any
  constructor(sender: string, no: number, sessionId: string, type: string, data: any, internal: boolean, error?: any) {
    this.sender = sender
    this.no = no
    this.sessionId = sessionId
    this.type = type
    this.data = data
    this.internal = internal
    this.error = error
  }
  public static assignable(obj: Object): boolean {

    return obj.hasOwnProperty('sender') && obj.hasOwnProperty('no') && obj.hasOwnProperty('sessionId') && obj.hasOwnProperty('type') && obj.hasOwnProperty('data')
  }
}

/**
 * 自注册
 */
const SELFREGISTERKEY = "SelfRegister"
/**
 * 远程函数调用
 */
const REMOTECALLKEY = 'RemoteCall'
/**
 * 远程函数调用结果
 */
const REMOTECALLRESULTKEY = 'RemoteCallResult'

/**
 * 服务端通道
 */
abstract class ChannelServer implements IServer {

  private _listener: any

  protected readonly id: string
  /**
   * 会话ID
   */
  protected readonly sessionId: string
  protected no: number = 1
  protected readonly context: Record<string, symbol> = {}
  protected readonly hoisting = new Set<string>()
  protected readonly sources = new Map<string, MessageEventSource>()
  protected readonly abstract listeners: Map<string, Array<(data: any) => void>>
  protected readonly calls = new Map<number, {
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  }>()


  constructor(options?: ChannelServerOptions) {
    this.id = this.guid(32)
    this._listener = this.listener.bind(this)

    const { id = '*' } = options || {}
    this.sessionId = `open-peer-channel:${id}`

    window.addEventListener('message', this._listener)
  }
  destroy(): void {
    this._listener && window.removeEventListener('message', this._listener)
    this._listener = undefined
  }
  register(cls: any): IServer {
    if (cls instanceof Function) {
      const name = (cls as Function).name
      this.hoisting.add(name)

      this.context[(cls as Function).name] = cls
    } else {
      for (const name in cls) {
        this.hoisting.add(name)
        this.context[name] = cls[name]
      }
    }

    return this
  }

  /**
   * 侦听器
   * @param event 
   * @returns 
   */
  protected listener(event: MessageEvent) {
    const t = event.data
    // console.log('listener',t)
    if (typeof t === 'object' && PacketData.assignable(t)) {
      const { no, sessionId, type, data, internal, sender, error } = t as PacketData
      // 会话Id不匹配
      if (this.sessionId !== sessionId) return

      if (internal) {
        if (type === SELFREGISTERKEY)
          console.log(SELFREGISTERKEY, sender, sessionId, data)
        // 自注册
        if (type === SELFREGISTERKEY && !this.sources.has(sender)) {

          this.sources.set(sender, event.source as MessageEventSource)
          this.selfRegister(event.source as MessageEventSource)
        }
        // 远程函数调用
        if (type === REMOTECALLKEY) {
          this.wrappingFunctions(no, sender, typeof data === 'string' ? { fnStr: data } : data)
        }
        // 远程函数调用结果
        if (type === REMOTECALLRESULTKEY) {
          this.codingOfResult(no, data, error)
        }
        return
      }


      // 不允许自己给自己发消息
      if (this.id === sender) return

      const fns = this.listeners.get(type) || []
      for (const fn of fns) {
        fn && fn(data)
      }
    }
  }

  /**
   * 数据封包
   * @param data 
   * @param type 
   * @returns 
   */
  protected packet(data: any, type: string = '*', internal: boolean = false): PacketData {
    const no = this.no++
    const { sessionId, id } = this
    return new PacketData(id, no, sessionId, type, data, internal)
  }

  /**
   * 回复数据封包
   * @param data 
   * @param type 
   * @returns 
   */
  protected replypacket(no: number, data: any, type: string = '*', internal: boolean = false, error?: any): PacketData {
    const { sessionId, id } = this
    return new PacketData(id, no, sessionId, type, data, internal, error)
  }

  /**
  * 注册postMessage
  */
  protected selfRegister(parent: MessageEventSource | Array<MessageEventSource>) {
    // 对象去重
    const temp = new Set(Array.isArray(parent) ? parent : [parent])
    const windows = [...temp]
    for (const w of windows) {
      w.postMessage(this.packet('', SELFREGISTERKEY, true), {
        targetOrigin: '*'
      })
    }
  }

  /**
   * 生成指定位数的GUID，无【-】格式
   * @param [digit=8] 位数
   * @returns
   */
  protected guid(digit = 8): string {
    return 'x'.repeat(digit).replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 包装远程函数
   * @param fnStr 函数调用字符串
   * @param sender 发送者ID
   * @param no 数据包编号
   * @returns 
   */
  private wrappingFunctions(no: number, sender: string, { fnStr, args = [] }: { fnStr: string, args: any[] }) {
    // 变量提升
    const hoisting = this.hoisting.size > 0 ? `const {${[...this.hoisting].join(',')}} = this;\n` : ''
    const fn = new Function(`${hoisting} return ${fnStr}`).bind({
      ...this.context,
    })()

    // 回复消息的对象
    const proxy = this.sources.get(sender)
    if (!proxy) return

    try {
      // 执行函数调用
      const result = fn(...args)
      const packet = this.replypacket(no, result, REMOTECALLRESULTKEY, true)
      proxy.postMessage(packet, { targetOrigin: '*' })
    } catch (e: any) {
      const packet = this.replypacket(no, undefined, REMOTECALLRESULTKEY, true, e.message)
      proxy.postMessage(packet, { targetOrigin: '*' })
    }
  }

  private codingOfResult(no: number, result: any, error: any) {
    const { resolve, reject } = this.calls.get(no) || {}
    // 移除回调
    this.calls.delete(no)

    if (error) {
      // 远程调用抛异常
      reject && reject(error)
    } else {
      // 远程调用成功
      resolve && resolve(result)
    }

  }
}


/**
 * 基于PostMessage的对象和方法的双向通讯库
 */
export class OpenPeerChannel extends ChannelServer implements IClient {

  protected readonly listeners = new Map<string, ((data: any) => void)[]>()
  // public readonly options: OpenPeerChannelOptions
  constructor(options?: OpenPeerChannelOptions) {
    super(options)
    const { parent } = options || {}

    parent && this.selfRegister(parent)
  }
  destroy(): void {
    // 执行父类销毁
    super.destroy()
    // 清理侦听器
    this.listeners.clear()
  }
  push(data: any, type?: string | undefined): void {
    const packet = this.packet(data, type)
    for (const proxy of this.sources.values()) {
      proxy.postMessage(packet, { targetOrigin: '*' })
    }
  }
  call(fn: Function, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const packet = this.packet({ args, fnStr: fn.toString() }, REMOTECALLKEY, true)
      for (const proxy of this.sources.values()) {
        proxy.postMessage(packet, {
          targetOrigin: '*'
        })
      }
      this.calls.set(packet.no, {
        resolve,
        reject
      })
    })
  }
  message(listener: (data: any) => void, type: string = '*'): IClient {
    if (!this.listeners.has(type))
      this.listeners.set(type, [])
    this.listeners.get(type)?.push(listener)
    return this
  }
  off(type?: string, listener?: ((data: any) => void) | undefined) {
    if (!type) {
      // 移除所有侦听器
      this.listeners.clear()
    } else if (listener) {
      // 移除指定侦听器
      if (this.listeners.has(type)) {
        const listeners: any = this.listeners.get(type)
        const index = listeners.indexOf(listener)
        index > -1 && (listeners.splice(index, 1))
      }
    } else {
      this.listeners.set(type, [])
    }
    return this
  }
}

export function create(opts?: OpenPeerChannelOptions) {
  return new OpenPeerChannel(opts)
}

/**
 * 获取当前MessageEventSource和父级MessageEventSource链对象
 * @returns 
 */
export function SimpleMessageEventSource(): Array<MessageEventSource> {
  const cache = new Set<Window>()
  const recursive = (w: Window) => {
    if (w && !cache.has(w)) {
      cache.add(w)
      recursive(w.parent)
    }
  }
  recursive(window)
  return [...cache]
}

