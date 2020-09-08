import { VNode, ShapeFlags, VNodeChildAtom } from './vnode'
import { createAppContext, AppContext } from '../seed/createApp'
import { isObject } from '../shared/utils'
import { isReservedKey } from './render'
import { LifecycleHooks } from './apiLifecycle'
import { initSlots } from './componentSlots'

export interface Component {}

export interface Data {
  [key: string]: any
}
export interface ComponentOptions {
  setup(
    this: void,
    props: Data,
    context?: Data
  ): Record<string, any> | InternalRenderFunction
  props?: String[]
  render?: InternalRenderFunction
}
type LifecycleHook = Function[] | null
export interface ComponentInstance {
  uid: number
  vnode: VNode | null
  subTree: VNode | null // 组件render的node
  parent: ComponentInstance | null
  type: ComponentOptions
  root: ComponentInstance | null
  appContext: AppContext | null
  render: InternalRenderFunction | null

  ctx: (Record<string, any> & { _: ComponentInstance }) | null
  // ----- state
  props: Data
  attrs: Data
  slots: Data
  setupState: Data
  setupContext: Data | null // setup的上下文
  // --proxy
  proxy: object | null
  // --lifecycle
  isMounted: boolean
  isUnmounted: boolean
  isDeactivated: boolean

  // --
  update: Function | null
  next: VNode | null // 更新子component时使用

  // -- hooks
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
  [LifecycleHooks.CREATED]: LifecycleHook
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  [LifecycleHooks.UNMOUNTED]: LifecycleHook
}

export interface InternalRenderFunction {
  (context: ComponentInstance): VNodeChildAtom
}

let uid = 0
const EMPTY_OBJ = {} // 引用

export function createComponentInstance(
  vnode: VNode,
  parentComponent: ComponentInstance | null
): ComponentInstance {
  const type = vnode.type as ComponentOptions
  const appContext =
    (parentComponent ? parentComponent.appContext : vnode.appContext) ||
    createAppContext()
  const instance: ComponentInstance = {
    uid: uid++,
    type,
    vnode,
    subTree: null,
    parent: parentComponent,
    root: null,
    appContext,
    render: null,
    setupContext: null,
    ctx: null,

    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    proxy: null,
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    update: null,
    next: null,
    [LifecycleHooks.BEFORE_CREATE]: null,
    [LifecycleHooks.CREATED]: null,
    [LifecycleHooks.BEFORE_MOUNT]: null,
    [LifecycleHooks.MOUNTED]: null,
    [LifecycleHooks.BEFORE_UPDATE]: null,
    [LifecycleHooks.UPDATED]: null,
    [LifecycleHooks.BEFORE_UNMOUNT]: null,
    [LifecycleHooks.UNMOUNTED]: null,
    slots: {},
  }

  instance.root = parentComponent ? parentComponent.root : instance
  instance.ctx = { _: instance } // 作为代理对象,所有赋值给instance本身的都赋值到ctx中.
  return instance
}

export let currentInstance: ComponentInstance | null = null
export function setCurrentInstance(instance: ComponentInstance | null) {
  currentInstance = instance
}
export function getCurrentInstance() {
  // 返回setup的instance 或者 正在渲染的instance
  return currentInstance
}
// 开始设置component的数据
export function setupComponent(instance: ComponentInstance) {
  const { shapeFlag, props, children } = instance.vnode
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  //TODO: init props
  console.warn('---initProps ---')
  initProps(instance, props, isStateful)
  initSlots(instance, children as any)
  // setup
  // 执行setup
  const setupResult = isStateful ? setupStatefulComponent(instance) : undefined

  return setupResult
}
// 执行setup
function setupStatefulComponent(instance: ComponentInstance) {
  const Component = instance.type

  // 创建proxy
  instance.proxy = new Proxy(instance.ctx, {})
  // 执行setup
  const { setup } = Component
  if (setup) {
    // setup接受2个参数时，创建context
    const setupContext = (instance.setupContext =
      setup.length > 1
        ? {
            attrs: instance.attrs,
            slots: instance.slots,
          }
        : null)
    currentInstance = instance
    // TODO:暂停收集依赖
    const setupResult = setup(instance.props, setupContext)
    console.debug('setup结果', setupResult)
    // TODO:setup执行结束
    currentInstance = null
    if (typeof setupResult === 'function') {
      // 返回render函数
      instance.render = setupResult as InternalRenderFunction
    } else if (isObject(setupResult)) {
      instance.setupState = setupResult
    } else {
      console.warn('setup should return object or function,but ', setupResult)
    }
  }
  finishComponentSetup(instance)
}

// 处理setup结束后的属性配置
// 如render方法的赋值,各种配置项的初始化等
function finishComponentSetup(instance: ComponentInstance) {
  const Component = instance.type as ComponentOptions
  // setup未返回render
  if (!instance.render) {
    // 这里不走compile
    instance.render = Component.render || NOOP
  }

  //  不走运行时编译
  console.log('== 处理一些配置信息 == todo==')
}

function NOOP() {}

function initProps(
  instance: ComponentInstance,
  rawProps: Data | null,
  isStateFul: number
) {
  const props: Data = {}
  const attrs: Data = {}
  setFullProps(instance, rawProps, props, attrs)
  if (isStateFul) {
    instance.props = props // 没有使其响应式
  } else {
    if (!instance.type.props) {
      instance.props = attrs
    } else {
      instance.props = props
    }
  }
  instance.attrs = attrs
}

export function updateProps(
  instance: ComponentInstance,
  rawProps: Data | null,
  prevRawProps: Data | null
) {
  // const {props,attrs} = instance // 组件实例本身的props和attrs
  // 不触发新的更新，直接重新赋值
  // setFullProps(instance,rawProps,props,attrs)
  initProps(instance, rawProps, 1)
}

function setFullProps(
  instance: ComponentInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const propsOption = instance.type.props || [] // props配置
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedKey(key)) {
        // key or ref
        continue
      }
      // 分别放到props和attrs中
      if (propsOption.includes(key)) {
        props[key] = rawProps[key]
      } else {
        attrs[key] = rawProps[key]
      }
    }
  }
}
