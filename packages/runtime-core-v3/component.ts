import { AppContext, createAppContext } from './apiCreateApp'
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
// 类组件
export interface ClassComponent {
  new(...args:any[]):ComponentPublicInstance<any,any,any,any,any>,
  __vccOpts:ComponentOptions
}
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
  subTree: VNode
  // 用来渲染和patch的effect
  update: ReactiveEffect
  //返回vdom的渲染函数
  render: InternalRenderFunction | null
  provides: Data
  effects: ReactiveEffect[] | null
  // 避免hasOwnProperty的缓存
  accessCache: Data | null
  // 渲染函数的缓存
  renderCache: (Function | VNode)[]

  // == 剩下的只对有状态组件游泳
  proxy: ComponentPublicInstance | null

  withProxy: ComponentPublicInstace | null
  ctx: Data

  // === === internal state
  data: Data
  props: Data
  attrs: Data
  slots: InternalSlots
  refs: Data
  emit: EmitFn
  emitted: Record<string, boolean> | null
  setupState: Data
  setupContext: SetupContext | null
  suspense: SuspenseBoundary | null
  asyncDep: Promise<any> | null
  asyncResolved: boolean
  // lifecycle
  isMounted: boolean
  isUnmounted: boolean
  isDeactivated: boolean
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
  [LifecycleHooks.CREATED]: LifecycleHook
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook
  [LifecycleHooks.ACTIVITED]: LifecycleHook
  [LifecycleHooks.DEACTIVITED]: LifecycleHook
  [LifecycleHooks.RENDER_TRACKED]: LifecycleHook
  [LifecycleHooks.RENDER_TRIGGERD]: LifecycleHook
  [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook
}

let uid = 0
const emptyAppContext = createAppContext()

export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
) {
  const type = vnode.type as Component
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext // 优先从父级继承，如果根元素有就一直是根元素
  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext, // 组件实例野有appContext
    root: null, // tobe immediately set
    next: null,
    subTree: null,
    update: null,
    render: null,
    proxy: null,
    withProxy: null,
    effects: null,
    provides: parent ? parent.provides : Object.create(appContext.provides), // 实例的provides设置在原型中
    accessCache: null,
    renderCache: [],

    // state
    ctx: {},
    data: {},
    props: {},
    attrs: {},
    slots: {},
    refs: {},
    setupState: {},
    setupContext: null,

    // suspense related
    suspense,
    asyncDep: null,
    asyncResolved: false,

    // 生命周期
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null,
    da: null,
    a: null,
    rtc: null,
    rtg: null,
    ec: null,
    emit: null as any,
    emitted: null,
  }

  // 设置上下文
  instance.ctx = { _: instance }

  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance) // 触发器
  return instance
}
