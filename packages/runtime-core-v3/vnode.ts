import {
  Component,
  ClassComponent,
  Data,
  ComponentInternalInstance,
} from './component'
import { Ref } from 'packages/reactivity-v3/ref'
import { AppContext } from './apiCreateApp'

export interface VNode<
  HostNode = any,
  HostElement = any,
  ExtraProps = Record<string, any>
> {
  __v_isVNode: true
  __v_skip: true
  type: VNodeTypes
  props: (VNodeProps & ExtraProps) | null
  key: string | number | null
  ref: VNodeNormalizedRef | null
  scopeId: string | null // sfc only
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  suspense: SuspenseBoundary | null
  dirs: DirectiveBinding[] | null
  transition: TrasitionHooks<HostElement> | null

  // dom
  el: HostNode | null
  anchor: HostNode | null // fragment anchor
  target: HostElement | null // teleport target
  targetAnchor: HostNode | null // teleport target anchor
  staticCount: number // number of elements contained in a static vnode

  // optimize
  shapeFlag: number // vnode的type类型
  patchFlag: number
  dynamicProps: string[] | null
  dynamicChildren: VNode[] | null

  appContext: AppContext | null
}

export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Static = Symbol('Static')
export const Fragment = (Symbol('Fragment') as any) as {
  __isFragment: true
  new (): {
    $props: VNodeProps
  }
}

type VNodeMountHook = (vnode: VNode) => void
type VNodeUpdateHook = (vnode: VNode, oldNode: VNode) => void
export type VNodeHook =
  | VNodeMountHook
  | VNodeUpdateHook
  | VNodeMountHook[]
  | VNodeUpdateHook[]

export type VNodeRef =
  | string
  | Ref
  | ((ref: object | null, refs: Record<string, any>) => void)

export type VNodeProps = {
  key?: string | number
  ref?: VNodeRef

  // vnode hooks
  onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[]
  onVnodeMounted?: VNodeMountHook | VNodeMountHook[]
  onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[]
  onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[]
}

export type VNodeTypes =
  | string
  | VNode
  | Component
  | typeof Text
  | typeof Static
  | typeof Comment
  | typeof Fragment
  | typeof TeleportImpl
  | typeof SuspenseImpl

export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.FUNCTIONAL_COMPONENT | ShapeFlags.STATEFUL_COMPONENT,
}
// === === === === logic start
export const createVNode = _createVNode as typeof _createVNode

const NULL_DYNAMIC_COMPONENT = Symbol()
function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
) {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    // 类型为空
    console.warn('创建vnode必须传递type')
    type = Comment // 注释
  }
  // 如果type的类型是一个vnode
  // 那么用props重新创建该vnode，
  // 如果有children，对vnode的children也进行重新的处理
  if (isVNode(type)) {
    const cloned = cloneVNode(type, props) // 新vnode,但更新props
    if (children) {
      normalizeChildren(cloned, children)
    }
    return cloned
  }

  // class component
  // 即使是类类型的组件，最终的type还是组件配置对象
  if (typeof type === 'function' && '__vccOpts' in type) {
    type = type.__vccOpts
  }

  // === === === 开始处理props
  if (props) {
    if (isProxy(props) || InternalObjectKey in props) {
      props = extend({}, props) //
    }
    let { class: klass, style } = props
    // 处理类名，
    if (klass && !(typeof klass === 'string')) {
      props.class = normalizeClass(klass) // 处理class
    }
    // 处理样式
    if (typeof style === 'object') {
      if (isProxy(style) && !Array.isArray(style)) {
        // style是响应式的，并且不是数组
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }
  // 找到shapeflag
  // 确定vnode的类型
  const shapeFlag =
    typeof type === 'string'
      ? ShapeFlags.ELEMENT
      : isSuspense(type)
      ? ShapeFlags.SUSPENSE
      : typeof type === 'function'
      ? ShapeFlags.FUNCTIONAL_COMPONENT
      : Object.prototype.toString.call(type) === '[object Object]'
      ? ShapeFlags.STATEFUL_COMPONENT
      : 0

  const vnode: VNode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopedId,
    children: null,
    component: null,
    suspense: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
  }
  //   处理children
  normalizeChildren(vnode, children)
  //   block === ??? TODO:意义？
  if (
    (shouldTrack > 0 || isRenderingTemplateSlot) &&
    !isBlockNode &&
    currenBlock &&
    (patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    patchFlag !== PatchFlags.HYDRATE_EVENTS
  ) {
    currentBlock.push(vnode)
  }
  return vnode
}

