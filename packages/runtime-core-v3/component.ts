import { AppContext } from './apiCreateApp'
import { VNode } from './vnode'
import { ReactiveEffect } from 'packages/reactivity-v3/effects'
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVITED = 'da',
  ACTIVITED = 'a',
  RENDER_TRIGGERD = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
}

export interface ComponentInternalOptions {}
// 组件配置对象
export interface ComponentOptions {}
// 函数式组件
export interface FunctionalComponent<P = {}, E extends EmitOptions = {}>
  extends ComponentInternalOptions {
  (props: P, ctx: SetupContext<E>): any
  props?: ComponentPropsOptions<P>
  emits?: E | (keyof E)[]
  inheritAttrs?: boolean
  displayName?: string
}
export interface PublicAPIComponent {}
export type Data = Record<string, unknown>

export type Component = ComponentOptions | FunctionalComponent // 组件配置或者函数

export interface ComponentInternalInstance {
  uid: number
  type: Component
  parent: ComponentInternalInstance | null
  root: ComponentInternalInstance
  appContext: AppContext
  // 在parent 虚拟dom里展示的vnode
  vnode: VNode
  // pending new vnode from parent update ??? 
  next: VNode | null
  // 当前组件自身的根node
  subTree:VNode,
  // 用来渲染和patch的effect
  update:ReactiveEffect,
  //返回vdom的渲染函数
  render:InternalRenderFunction|null 
  provides:Data,
  effects:ReactiveEffect[]|null,
  // 避免hasOwnProperty的缓存
  accessCache:Data|null 
  // 渲染函数的缓存
  renderCache:(Function|VNode)[],
  
  // == 剩下的只对有状态组件游泳
  proxy:ComponentPublicInstance | null

}

export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
) {
  const type = vnode.type as Component
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext
  const instance: ComponentInternalInstance = {}
}
