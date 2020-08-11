import { Ref } from 'packages/vdom-preact/vnode'
import { type } from 'os'

type Ref = any
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
  return createReactiveObject(target, false, {}, {})
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  // 校验参数合法
  if (Object.prototype.toString.call(target) !== '[object Object]') {
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

  const reactiveFlag = isReadonly
    ? ReactiveFlags.READONLY
    : ReactiveFlags.REACTIVE

}
