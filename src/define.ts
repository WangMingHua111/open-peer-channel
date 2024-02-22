/**
 * 销毁接口
 */
export interface IDestroy {
  /**
   * 销毁资源
   */
  destroy(): void
}

/**
 * 数据包结果
 */
export interface IPacketData {
  /**
   * 发送者
   */
  readonly sender: string
  /**
   * 数据包编号
   */
  readonly no: number
  /**
   * 会话Id
   */
  readonly sessionId: string
  /**
   * 数据包类型
   */
  readonly type: string
  /**
   * 数据
   */
  readonly data: any
  /**
   * 是否为内容数据包
   */
  readonly internal: boolean
  /**
   * 错误消息
   */
  readonly error: any
  /**
   * @param sender 发送者
   * @param no 数据包编号
   * @param sessionId 会话Id
   * @param type 数据包类型
   * @param data 数据
   * @param internal 是否为内部数据包
   * @param error 错误消息
   */
  new (sender: string, no: number, sessionId: string, type: string, data: any, internal: boolean, error?: any): IPacketData
}

/**
 * 消息通道协议层
 */
export interface IProtocol extends IDestroy {
  /**
   * 发送数据
   */
  send(data: string): Promise<void>
  /**
   * 接收数据
   */
  receive(): Promise<string>
}

/**
 * 消息通道（对等通道）
 */
export interface IChannel extends IDestroy {
  /**
   * 注册应用域
   * @param cls 应用对象
   */
  register(cls: any): IChannel
}

export interface IServer {
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

export interface IClient {
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
