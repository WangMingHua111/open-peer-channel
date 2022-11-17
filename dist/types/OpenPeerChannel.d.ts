interface IServer {
    /**
     * 销毁对象
     */
    destroy(): void;
    /**
     * 注册应用域
     * @param cls 应用对象
     */
    register(cls: any): IServer;
}
interface IClient {
    /**
     *
     * @param data 支持【结构化克隆算法】克隆的数据
     * @param [type="*"]  事件类型
     */
    push(data: any, type?: string): void;
    /**
     * 通过远程调用的方式，在Server端执行函数，并返回结果
     * @param fn 执行函数
     */
    call(fn: Function): Promise<any>;
    /**
     *
     * @param listener 侦听器
     * @param [type="*"]  事件类型
     */
    message(listener: (data: any) => void, type?: string): IClient;
}
interface ChannelServerOptions {
    /**
     * Channel Id，设置值时仅相同通道ID的的会话支持双向通讯
     */
    id?: string;
}
interface OpenPeerChannelOptions extends ChannelServerOptions {
    /**
     * 父级Window，通过传入该值，打通两个对象间的通讯
     */
    parent?: Window;
}
/**
 * 封包数据
 */
declare class PacketData {
    readonly sender: string;
    readonly no: number;
    readonly sessionId: string;
    readonly type: string;
    readonly data: any;
    readonly internal: boolean;
    readonly error: any;
    constructor(sender: string, no: number, sessionId: string, type: string, data: any, internal: boolean, error?: any);
    static assignable(obj: Object): boolean;
}
/**
 * 服务端通道
 */
declare abstract class ChannelServer implements IServer {
    private _listener;
    protected readonly id: string;
    /**
     * 会话ID
     */
    protected readonly sessionId: string;
    protected no: number;
    protected readonly context: Record<string, symbol>;
    protected readonly hoisting: Set<string>;
    protected readonly sources: Map<string, MessageEventSource>;
    protected readonly abstract listeners: Map<string, Array<(data: any) => void>>;
    protected readonly calls: Map<number, {
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    }>;
    constructor(options?: ChannelServerOptions);
    destroy(): void;
    register(cls: any): IServer;
    /**
     * 侦听器
     * @param event
     * @returns
     */
    protected listener(event: MessageEvent): void;
    /**
     * 数据封包
     * @param data
     * @param type
     * @returns
     */
    protected packet(data: any, type?: string, internal?: boolean): PacketData;
    /**
     * 回复数据封包
     * @param data
     * @param type
     * @returns
     */
    protected replypacket(no: number, data: any, type?: string, internal?: boolean, error?: any): PacketData;
    /**
    * 注册postMessage
    */
    protected selfRegister(parent: MessageEventSource): void;
    /**
     * 生成指定位数的GUID，无【-】格式
     * @param [digit=8] 位数
     * @returns
     */
    protected guid(digit?: number): string;
    /**
     * 包装远程函数
     * @param fnStr 函数调用字符串
     * @param sender 发送者ID
     * @param no 数据包编号
     * @returns
     */
    private wrappingFunctions;
    private codingOfResult;
}
/**
 * 基于PostMessage的对象和方法的双向通讯库
 */
export declare class OpenPeerChannel extends ChannelServer implements IClient {
    protected readonly listeners: Map<string, ((data: any) => void)[]>;
    constructor(options?: OpenPeerChannelOptions);
    destroy(): void;
    push(data: any, type?: string | undefined): void;
    call(fn: Function): Promise<any>;
    message(listener: (data: any) => void, type?: string): IClient;
}
export declare function create(opts?: OpenPeerChannelOptions): OpenPeerChannel;
export {};
