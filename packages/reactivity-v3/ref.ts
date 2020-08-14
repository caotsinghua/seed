import { track, TrackOpTypes, trigger, TriggerOpTypes } from './effects'
import { hasChanged } from './baseHandlers'
import { reactive } from './reactive'

declare const RefSymbol: unique symbol

export interface Ref<T = any> {
  [RefSymbol]: true
  value: T
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return r ? r.__v_isRef === true : false
}

export function ref<T extends object>(value: T): T extends Ref ? T : Ref<T>
export function ref<T>(value: T): Ref<any>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value)
}

function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }

  let value = shallow ? rawValue : convert(rawValue)

  const r = {
    __v_isRef: true,
    get value() {
      track(r, TrackOpTypes.GET, 'value')
      return value
    },
    set value(newVal) {
      if (hasChanged(newVal, value)) {
        rawValue = newVal
        value = shallow ? newVal : convert(newVal)
        trigger(r, TriggerOpTypes.SET, 'value', newVal)
      }
    },
  }
  return r
}

const convert = <T extends unknown>(val: T): T => {
  return typeof val === 'object' ? reactive(val as any) : val
}
// 获取ref的值
export function unRef<T>(ref: T): T extends Ref<infer V> ? V : T {
  return isRef(ref) ? (ref.value as any) : ref
}

// 为reactive对象的某个参数创建ref
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  return {
    __v_isRef: true,
    get value() {
      return object[key]
    },
    set value(val) {
      object[key] = val
    },
  } as any
}

// 把一个reactive对象转换成ref的对象
export function toRefs<T extends object>(object: T) {
  const ret: any = {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}
