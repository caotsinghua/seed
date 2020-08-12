declare const RefSymbol: unique symbol

export interface Ref<T = any> {
  [RefSymbol]: true
  value: T
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return r ? r.__v_isRef === true : false
}