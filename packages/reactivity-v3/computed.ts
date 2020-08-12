import { ReactiveEffect, track, TrackOpTypes } from './effects'
import { Ref } from './ref'
import { ReactiveFlags } from './reactive'
export type ComputedGetter<T> = (ctx?: any) => T
export type ComputedSetter<T> = (value: T) => void
export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T
}
export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
export function computed<T>(
  options: WritableComputedOptions<T>
): WritableComputedRef<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>
  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions
    setter = () => {
      console.error('只读的computed不能赋值')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  let dirty = true // 是否更新完毕
  let value: T
  let computed: ComputedRef<T> //ref
  function runner() {}
  computed = {
    __v_isRef: true,
    [ReactiveFlags.IS_READONLY]:
      typeof getterOrOptions === 'function' || !getterOrOptions.set,
    effect: runner,
    get value() {
      if (dirty) {
        value = runner() // 重新getter
        dirty = false
      }
      track(computed, TrackOpTypes.GET, 'value') // 收集computed.value的依赖
      return value
    },
    set value(newValue: T) {
      setter(newValue)
    },
  }

  return computed
}
