import { mutableHandler } from './baseHandler'
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  REACTIVE = '__v_reactive',
  READONLY = '__v_readonly',
  RAW = '__v_raw',
}
export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.REACTIVE]?: any
  [ReactiveFlags.READONLY]?: any
  [ReactiveFlags.RAW]?: any
}
export function reactive(target: object) {
  // 只读的直接返回
  if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
    return target
  }
  return createReactiveObject(target, false, mutableHandler)
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandler: ProxyHandler<any>
) {
  // 检查是否能转为响应式数据
  if (typeof target !== 'object') {
    console.warn(`${String(target)} 不是对象,不能转为响应式数据`)
    return target
  }
  // 是否已经响应化过
  //   如果对已经响应式的数据执行readonly,则另外处理
  //   TODO:readonly
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }

  const reactiveFlag = isReadonly
    ? ReactiveFlags.READONLY
    : ReactiveFlags.REACTIVE
  //   已经是只读 / 响应化过了
  if (reactiveFlag in target) {
    return target[reactiveFlag]
  }
  //   创建
  const observed = new Proxy(target, baseHandler)
  Object.defineProperty(target, reactiveFlag, {
    value: observed,
    configurable: true,
    enumerable: false,
  })
  return observed
}
