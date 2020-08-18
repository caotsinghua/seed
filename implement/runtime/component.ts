import { VNode, ShapeFlags } from './vnode'
import { createAppContext, AppContext } from '../seed/createApp'
import { isObject } from '../shared/utils'

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
  parent: ComponentInstance | null
  type: ComponentOptions
  root: ComponentInstance | null
  appContext: AppContext | null
}

let uid = 0
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
  }

  instance.root = parentComponent ? parentComponent.root : instance

  return instance
}

function setupComponent(instance: ComponentInstance) {
  const { shapeFlag } = instance.vnode
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  //TODO: init props
  console.warn('初始化props数据，todo')

  // setup
  // 执行setup
  const setupResult = isStateful ? setupStatefulComponent(instance) : undefined
  return setupResult
}

function setupStatefulComponent(instance: ComponentInstance) {
  const Component = instance.type

  // 创建proxy

  // 执行setup
  const { setup } = Component
  if (setup) {
    // setup接受2个参数时，创建context
    const setupContext = (instance.setupContext = setup.length > 1 ? {} : null)
    // 暂停收集依赖
    const setupResult = setup(instance.props, setupContext)
    // setup执行结束
    
    if (typeof setupResult === 'function') {
      // 返回render函数
      instance.render = setupResult
    } else if (isObject(setupResult)) {
      instance.setupState = setupResult
    }
  }
}
