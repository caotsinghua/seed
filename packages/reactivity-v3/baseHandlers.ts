import { ReactiveFlags, hasOwn, reactive, toRaw, readonly } from './reactive'
import {
  track,
  TrackOpTypes,
  trigger,
  TriggerOpTypes,
  ITERATE_KEY,
} from './effects'
import { Ref, isRef } from './ref';

const arrayInstrumentations: Record<string, Function> = Object.create(null)

;['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
  arrayInstrumentations[key] = function (...args: any[]): any {
    const arr = toRaw(this) // 获取原始值
    for (let i = 0; i < (this as any).length; i++) {
      track(arr, TrackOpTypes.GET, i + '')
    }
    const res = arr[key](...args) // 执行方法
    if (res === -1 || res === false) {
      // 没有找到结果,把参数换成原始值重试一遍
      return arr[key](...args.map(toRaw))
    } else {
      return res
    }
  }
})

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key) => (Symbol as any)[key]) //
    .filter((val) => typeof val === 'symbol')
)

// 创建proxy的get陷阱
function createGetter(isReadonly = false, shallow = false) {
  // 陷阱触发器
  return function get(target: object, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 获取是否是reactive的，取决于使用的isReadonly是否为false
      return !isReadonly
    }
    // observedData.__v_isReadonly
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    // 如果为了获取原始值，且触发get的对象就是绑定的proxy
    // observedData.__v_raw
    if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? (target as any)[ReactiveFlags.READONLY]
          : (target as any)[ReactiveFlags.REACTIVE])
    ) {
      return target
    }

    const targetIsArray = Array.isArray(target)
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      // 使用数组的查询函数
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    // ==普通对象/map...
    const res = Reflect.get(target, key, receiver) // 原始值
    // 如果key是内置的symbol，或者key是__proto__,或key是__v_isref,返回原始结果
    // TODO:意义不明
    if (
      isSymbol(key)
        ? builtInSymbols.has(key)
        : key === '__proto__' || key === '__v_isRef'
    ) {
      return res
    }

    if (!isReadonly) {
      // 不是只读的get
      // track 依赖收集
      track(target, TrackOpTypes.GET, key)
    }
    if (shallow) {
      // 浅层监听，之前已经track过，这里返回原值
      // 如果res是对象，也不会再进行深层监听
      return res
    }
    // 结果是ref类型
    if (isRef(res)) {
      // 只对对象起作用，对数组不起作用
      return targetIsArray ? res : res.value
    }
    // 不是ref，不是shallow，是对象类型
    if (res && typeof res === 'object') {
      // 转换并返回一个proxy
      // 延迟获取，为了避免循环依赖？
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}

const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

// 创建setter
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]
    if (!shallow) {
      value = toRaw(value) // 获取原始值
      if (!Array.isArray(value) && isRef(oldValue) && !isRef(value)) {
        // 旧的值是ref类型，赋值新值时，挂载的.value上
        oldValue.value = value
        return true
      }
    } else {
      // 浅层模式，赋值时忽略是否响应
    }
    const hadKey = hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)

    // 如果target再原型链中被赋值，不触发更新
    // 如a.__proto__ === target,a.name=12,不会触发更新
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 新添加属性
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else {
        // 更改
        if (hasChanged(value, oldValue)) {
          trigger(target, TriggerOpTypes.SET, key, value, oldValue)
        }
      }
    }
    return result
  }
}

const set = createSetter()
const shallowSet = createSetter(true)

// 删除属性
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

// has - 由 in 触发
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  // key是内置symbol以外的symbol
  // 或者不是symbol
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}

// ownkeys
// - 由Object.keys,Object.getOwnPropetyNames,Object.getOwnPropertySymbols,
// Object.assign({},proxy)触发
function ownKeys(target: object) {
  const result = Reflect.ownKeys(target)
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
  return result
}
// 普通的handler
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has, // in
  ownKeys,
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  has,
  ownKeys,
  set(target, key) {
    console.warn('不能设置只读的reactive object', target, key)
    return true
  },
  deleteProperty(target, key) {
    console.warn('不能删除只读对象的属性', target, key)
    return true
  },
}

//  === utils ===
function isSymbol(v: any) {
  return typeof v === 'symbol'
}



export function hasChanged(value: any, oldValue: any) {
  // 如果两个都是NaN return false
  // 只要某个不是nan 后面的条件一定是true
  return value !== oldValue && (value === value || oldValue === oldValue)
}
