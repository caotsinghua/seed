import { mutableHandlers, readonlyHandlers } from './baseHandlers'
import { Ref } from './ref'

type UnwrapRef<T> = any
// ===doing
interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.RAW]?: any
  [ReactiveFlags.REACTIVE]?: any
  [ReactiveFlags.READONLY]?: any
}
// flags
export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw',
  REACTIVE = '__v_reactive',
  READONLY = '__v_readonly',
}
type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRef<T>
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // 已经是一个只读的target,直接返回
  if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
    return target
  }
  // 创建proxy
  return createReactiveObject(target, false, mutableHandlers, {})
}

const collectionTypes = new Set<Function>([Set, Map, WeakMap, WeakSet])

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  // 校验参数合法
  if (typeof target !== 'object') {
    console.warn('[createReactiveObject]target 必须是对象')
    return target
  }
  // raw && isReadonly=false || isReactive=false
  // 已经是proxy过就直接返回
  //   有一种例外情况,对已经reactive的对象执行了readonly()
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  // 检查是否target已经被proxy
  const reactiveFlag = isReadonly
    ? ReactiveFlags.READONLY
    : ReactiveFlags.REACTIVE
  // 如果readonly或者reactive有值，则直接返回这个值
  if (hasOwn(target, reactiveFlag)) {
    return target[reactiveFlag]
  }
  // 该target不能被监听
  if (!canObserve(target)) {
    return target
  }
  // 如果监听的对象是map/set/weakmap/weakset，就是用collectionHandlers，否则用base
  const observed = new Proxy(
    target,
    collectionTypes.has(target.constructor) ? collectionHandlers : baseHandlers
  )
  def(target, reactiveFlag, observed)
  // 返回一个代理对象
  return observed
}

// 创建一个只读的proxy
export function readonly<T extends object>(target: T) {
  return createReactiveObject(target, true, readonlyHandlers, {})
}

//  ==== === utils === ====

export function hasOwn(
  obj: object,
  key: string | symbol
): key is keyof typeof obj {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/**
 * value.skip不为true，value的类型是复合要求的，并且是可以拓展属性的
 * @param value
 */
function canObserve(value: Target): boolean {
  return (
    !value[ReactiveFlags.SKIP] &&
    isObservableType(toRawType(value)) &&
    Object.isExtensible(value)
  )
}

function makeMap(str: string): (key: string) => boolean {
  const map: Record<string, boolean> = Object.create(null)
  let arr = str.split(',')
  for (let i = 0; i < arr.length; i++) {
    map[arr[i]] = true
  }
  return (key: string) => !!map[key]
}

const isObservableType = makeMap('Object,Array,Map,Set,WeakMap,WeakSet')
function toRawType(value: object) {
  return Object.prototype.toString.call(value).slice(8, -1)
}

function def(obj: object, key: string | symbol, value: any) {
  Object.defineProperty(obj, key, {
    value,
    enumerable: false, // 不可枚举
    configurable: true,
  })
}
// 如果ob.raw.raw.raw ... 一致嵌套，则递归到最深处
export function toRaw<T>(observed: T): T {
  return (
    (observed && toRaw((observed as Target)[ReactiveFlags.RAW])) || observed
  )
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}
