import { VNode, ShapeFlags, VNodeChildAtom } from './vnode'
import { createAppContext, AppContext } from '../seed/createApp'
import { isObject } from '../shared/utils'

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

  render?: InternalRenderFunction
}

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
  }

  instance.root = parentComponent ? parentComponent.root : instance
  instance.ctx = { _: instance } // 作为代理对象,所有赋值给instance本身的都赋值到ctx中.
  return instance
}

// 开始设置component的数据
export function setupComponent(instance: ComponentInstance) {
  const { shapeFlag } = instance.vnode
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  //TODO: init props
  console.warn('初始化props数据，todo')

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
    const setupContext = (instance.setupContext = setup.length > 1 ? {} : null)
    // TODO:暂停收集依赖
    const setupResult = setup(instance.props, setupContext)
    console.debug('setup结果', setupResult)
    // TODO:setup执行结束

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
