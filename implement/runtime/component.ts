import { VNode } from './vnode'

export interface Component {}

export interface Data {
  [key: string]: any
}
export interface ComponentOptions {
  setup(this: void, props: Data): Record<string, any> | Function
}

export interface ComponentInstance {
  uid: number
  vnode: VNode | null
  subTree: VNode | null // 组件render的node
}

let uid = 0
export function createComponentInstance(
  options: ComponentOptions
): ComponentInstance {
  const instance: ComponentInstance = {
    uid: uid++,
    vnode: null,
    subTree: null,
  }

  return instance
}
