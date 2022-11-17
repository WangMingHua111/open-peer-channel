'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * 封包数据
 */
class PacketData {
    constructor(sender, no, sessionId, type, data, internal, error) {
        this.sender = sender;
        this.no = no;
        this.sessionId = sessionId;
        this.type = type;
        this.data = data;
        this.internal = internal;
        this.error = error;
    }
    static assignable(obj) {
        return obj.hasOwnProperty('sender') && obj.hasOwnProperty('no') && obj.hasOwnProperty('sessionId') && obj.hasOwnProperty('type') && obj.hasOwnProperty('data');
    }
}
/**
 * 自注册
 */
const SELFREGISTERKEY = "SelfRegister";
/**
 * 远程函数调用
 */
const REMOTECALLKEY = 'RemoteCall';
/**
 * 远程函数调用结果
 */
const REMOTECALLRESULTKEY = 'RemoteCallResult';
/**
 * 服务端通道
 */
class ChannelServer {
    constructor(options) {
        this.no = 1;
        this.context = {};
        this.hoisting = new Set();
        this.sources = new Map();
        this.calls = new Map();
        this.id = this.guid(32);
        this._listener = this.listener.bind(this);
        const { id = '*' } = options || {};
        this.sessionId = `open-peer-channel:${id}`;
        window.addEventListener('message', this._listener);
    }
    destroy() {
        this._listener && window.removeEventListener('message', this._listener);
        this._listener = undefined;
    }
    register(cls) {
        if (cls instanceof Function) {
            const name = cls.name;
            this.hoisting.add(name);
            this.context[cls.name] = cls;
        }
        else {
            for (const name in cls) {
                this.hoisting.add(name);
                this.context[name] = cls[name];
            }
        }
        return this;
    }
    /**
     * 侦听器
     * @param event
     * @returns
     */
    listener(event) {
        const t = event.data;
        console.log('listener', t);
        if (typeof t === 'object' && PacketData.assignable(t)) {
            const { no, sessionId, type, data, internal, sender, error } = t;
            // 会话Id不匹配
            if (this.sessionId !== sessionId)
                return;
            if (internal) {
                // 自注册
                if (type === SELFREGISTERKEY && !this.sources.has(sender)) {
                    this.sources.set(sender, event.source);
                    this.selfRegister(event.source);
                }
                // 远程函数调用
                if (type === REMOTECALLKEY) {
                    this.wrappingFunctions(no, sender, data);
                }
                // 远程函数调用结果
                if (type === REMOTECALLRESULTKEY) {
                    this.codingOfResult(no, data, error);
                }
                return;
            }
            // 不允许自己给自己发消息
            if (this.id === sender)
                return;
            const fns = this.listeners.get(type) || [];
            for (const fn of fns) {
                fn && fn(data);
            }
        }
    }
    /**
     * 数据封包
     * @param data
     * @param type
     * @returns
     */
    packet(data, type = '*', internal = false) {
        const no = this.no++;
        const { sessionId, id } = this;
        return new PacketData(id, no, sessionId, type, data, internal);
    }
    /**
     * 回复数据封包
     * @param data
     * @param type
     * @returns
     */
    replypacket(no, data, type = '*', internal = false, error) {
        const { sessionId, id } = this;
        return new PacketData(id, no, sessionId, type, data, internal, error);
    }
    /**
    * 注册postMessage
    */
    selfRegister(parent) {
        parent.postMessage(this.packet('', SELFREGISTERKEY, true), {
            targetOrigin: '*'
        });
    }
    /**
     * 生成指定位数的GUID，无【-】格式
     * @param [digit=8] 位数
     * @returns
     */
    guid(digit = 8) {
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
    wrappingFunctions(no, sender, fnStr) {
        // 变量提升
        const hoisting = this.hoisting.size > 0 ? `const {${[...this.hoisting].join(',')}} = this;\n` : '';
        const fn = new Function(`${hoisting} return ${fnStr}`).bind(Object.assign({}, this.context))();
        // 回复消息的对象
        const proxy = this.sources.get(sender);
        if (!proxy)
            return;
        try {
            // 执行函数调用
            const result = fn();
            const packet = this.replypacket(no, result, REMOTECALLRESULTKEY, true);
            proxy.postMessage(packet, { targetOrigin: '*' });
        }
        catch (e) {
            const packet = this.replypacket(no, undefined, REMOTECALLRESULTKEY, true, e.message);
            proxy.postMessage(packet, { targetOrigin: '*' });
        }
    }
    codingOfResult(no, result, error) {
        const { resolve, reject } = this.calls.get(no) || {};
        if (error) {
            // 远程调用抛异常
            reject && reject(error);
        }
        else {
            // 远程调用成功
            resolve && resolve(result);
        }
    }
}
/**
 * 基于PostMessage的对象和方法的双向通讯库
 */
class OpenPeerChannel extends ChannelServer {
    // public readonly options: OpenPeerChannelOptions
    constructor(options) {
        super(options);
        this.listeners = new Map();
        const { parent } = options || {};
        parent && this.selfRegister(parent);
    }
    destroy() {
        // 执行父类销毁
        super.destroy();
        // 清理侦听器
        this.listeners.clear();
    }
    push(data, type) {
        const packet = this.packet(data, type);
        for (const proxy of this.sources.values()) {
            proxy.postMessage(packet, { targetOrigin: '*' });
        }
    }
    call(fn) {
        return new Promise((resolve, reject) => {
            const packet = this.packet(fn.toString(), REMOTECALLKEY, true);
            for (const proxy of this.sources.values()) {
                proxy.postMessage(packet, {
                    targetOrigin: '*'
                });
            }
            this.calls.set(packet.no, {
                resolve,
                reject
            });
        });
    }
    message(listener, type = '*') {
        var _a;
        if (!this.listeners.has(type))
            this.listeners.set(type, []);
        (_a = this.listeners.get(type)) === null || _a === void 0 ? void 0 : _a.push(listener);
        return this;
    }
}
function create(opts) {
    return new OpenPeerChannel(opts);
}

exports.OpenPeerChannel = OpenPeerChannel;
exports.create = create;
