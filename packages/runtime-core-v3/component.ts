import { AppContext, createAppContext } from './apiCreateApp'
import { VNode, ShapeFlags } from './vnode'
import {
  ReactiveEffect,
  pauseTracking,
  resetTraking,
} from 'packages/reactivity-v3/effects'
import { PublicInstanceProxyHandlers } from './componentProxy'
import { callWithErrorHandling, ErrorCodes } from './errorHandling'
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
  new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>
  __vccOpts: ComponentOptions
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
  instance.ctx = { _: instance } // 自己

  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance) // 触发器
  return instance
}

export let isInSSRComponentSetup = false

export function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false
) {
  isInSSRComponentSetup = isSSR
  const { props, children, shapeFlag } = instance.vnode
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT

  initProps(instance,props,isStateful,isSSR)
  initSlots(instance,children)

  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined
  isInSSRComponentSetup = false
  return setupResult
}
export let currentInstance: ComponentInternalInstance | null = null
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions // 组件配置

  // 创建 render proxy property access cache
  instance.accessCache = {}
  // create public instance/render proxy
  // also mark it raw so its never observed
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  // 调用setup
  const { setup } = Component

  if (setup) {
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)
    currentInstance = instance
    pauseTracking()
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [instance.props, setupContext]
    )
    resetTraking()
    currentInstance = null
    if (isPromise(setupResult)) {
      // 异步的setup
      console.warn(
        `setup() returned a Promise, but the version of Vue you are using ` +
          `does not support it yet.`
      )
      instance.asyncDep = setupResult
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    // finishComponentSetup
    // 2.0配置
    finishComponentSetup(instance, isSSR)
  }
}

export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) {
  if(typeof setupResult === 'function'){
    instance.render = setupResult // setup返回render函数
  }else if(Object.prototype.toString.call(setupResult)==='[object Object]'){
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance,isSSR) // 2.0的配置
}

function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
  }
}
