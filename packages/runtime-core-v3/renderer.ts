import {
  VNode,
  PatchFlags,
  Text,
  Comment,
  Static,
  Fragment,
  ShapeFlags,
  createVNode,
  VNodeHook,
} from './vnode'
import {
  ComponentInternalInstance,
  createComponentInstance,
  setupComponent,
} from './component'
import { effect } from 'packages/reactivity-v3/effects'

export interface RootRenderFunction {}
export interface RendererOptions<HostNode = any, HostElement = any> {
  patchProp: any
  forcePatchProps: any
  insert: any
  remove: any
  createElement: any
  createText: any
  createComment: any
  setText: any
  setElementText: any
  parentNode: any
  nextSibling: any
  querySelector: any
  setScopeId: any
  cloneNode: any
  insertStaticContent: any
}

export interface Renderer<HostElement = any> {
  render: Function
  createApp: Function
}

// 无注水过程
function baseCreateRenderer<HostNode = any, HostElement = any>(
  options: RendererOptions<HostNode, HostElement>
): Renderer<HostElement>
// overload2: with hydration
function baseCreateRenderer(
  options: RendererOptions<any, any>,
  createHydrationFns: any
): HydrationRenderer

function baseCreateRenderer(
  options: RendererOptions,
  createHydrationFns?: any
): any {
  const {
    insert,
    remove,
    patchProp,
    forcePatchProps,
    createComment,
    createElement,
    createText,
    setText,
    setElementText,
    parentNode,
    nextSibling,
    setScopeId,
    cloneNode,
    insertStaticContent,
  } = options

  // Note: functions inside this closure should use `const xxx = () => {}`
  // style in order to prevent being inlined by minifiers.
  //   闭包里的方法都用const = 的声明方式 ，防止被压缩器变成行内的
  const patch: PatchFn = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    parentSuspense = null,
    isSvg = false,
    optimized = false
  ) => {
    //   两个node类型不一样，卸载旧node
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1) // ?
      unmount(n1, parentComponent, parentSuspense, true)
      n1 = null
    }
    //
    if (n2.patchFlag === PatchFlags.BAIL) {
      optimized = true
      n2.dynamicChildren = null
    }

    const { type, ref, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor)
        break
      case Comment:
        processCommentNode(n1, n2, container, anchor)
        break
      case Static:
        if (n1 == null) {
          mountStaticNode(n2, container, anchor, isSvg)
        }
        break
      case Fragment:
        processFragment(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSvg,
          optimized
        )
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          //   元素
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSvg,
            optimized
          )
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSvg,
            optimized
          )
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          ;(type as typeof TeleportImpl).process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense
          )
        } else if (shapeFlag & shapeFlag & ShapeFlags.SUSPENSE) {
          ;(type as typeof SuspenseImpl).process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSvg,
            optimized,
            internals
          )
        }
    }
    // set ref
    if (ref != null && parentComponent) {
      setRef(ref, n1 && n1.ref, parentComponent, parentSuspense, n2)
    }
  }

  //   == == == process component
  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: any,
    anchor: any | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSvg: boolean,
    optimized: boolean
  ) => {
    if (n1 == null) {
      //   挂载
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        // 该组件已经keep alive
        ;(parentComponent?.ctx as KeepAliveContext).activate(
          n2,
          container,
          anchor,
          isSvg,
          optimized
        )
      } else {
        //   单纯挂载
        mountComponent(
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSvg,
          optimized
        )
      }
    } else {
      // n1存在，且类型一定一样，更新node
      updateComponent(n1, n2, optimized)
    }
  }

  const mountComponent: MountComponentFn = (
    initialVNode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSvg,
    optimized
  ) => {
    const instance: ComponentInternalInstance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    ))
    // 挂载的组件是keep alive的
    if (isKeepAlive(initialVNode)) {
      ;(instance.ctx as KeepAliveContext).renderer = internals
    }
    // 执行setup ?
    setupComponent(instance)

    // setup is asnyc
    if (instance.asyncDep) {
      if (!parentSuspense) {
        console.warn('async setup is used without a suspense boundary')
        return
      }
      // 注册依赖和回调？
      parentSuspense.registerDep(instance, setupRenderEffect)
      if (!initialVNode.el) {
        // 未挂载
        // 挂载一个占位符
        const placeholder = (instance.subTree = createVNode(Comment))
        processCommentNode(null, placeholder, container, anchor)
      }
      return
    }
    // 依赖收集
    setupRenderEffect()
  }

  const setupRenderEffect: setupRenderEffectFn = (
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  ) => {
    instance.update = effect(function compoenntEffect() {
      if (!instance.isMounted) {
        let vnodeHook: VNodeHook | null | undefined
        const { el, props } = initialVNode
        const { bm, m, a, parent } = instance
        const subTree = (instance.subTree = renderComponentRoot(instance))
        if (bm) {
          // 触发beforeMount
          bm()
        }
        // d调用vnode的钩子
        if ((vnodeHook = props && props.onVnodeBeforeMount)) {
          vnodeHook() //
        }

        if (el && hydrateNode) {
          // 执行注水
          hydrateNode(initialVNode.el, subTree, instance, parentSuspense)
        } else {
          // 更新dom
          patch(
            null,
            subTree,
            container,
            anchor,
            instance,
            parentSuspense,
            isSVG
          )
          initialVNode.el = subTree.el
        }
        if (m) {
          // mounted
          m()
        }
        if (
          a &&
          initialVNode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
        ) {
          // activited
          a()
        }
        instance.isMounted = true
      } else {
        //   更新
        let { next, bu, u, parent, vnode } = instance

        let originNext = next
        let vnodeHook: VNodeHook | null | undefined
        if (next) {
          // 预先更新?
          updateComponentPreRender(instance, next, optimized)
        } else {
          next = vnode
        }
        const nextTree = renderComponentRoot(instance)
        const prevTree = instance.subTree
        instance.subTree = nextTree
        next.el = vnode.el
        if (bu) {
          // trigger beforeUpdate
          bu()
        }
        if (instance.refs !== EMPTY_OBJ) {
          instance.refs = {}
        }

        patch(
          prevTree,
          nextTree,
          hostParentNode(prevTree.el!)!,
          getNextHostNode(prevTree),
          instance,
          parentSuspense,
          isSVG
        )

        next.el = nextTree.el
        if(originNext === null){
            // 更新父组件的el
            updateHOCHostEl(instance,nextTree.el)
        }
        // 触发一些声明周期
      }
    },prodEffectOptions)
  }

  const updateComponentPreRender = (
      instance:ComponentInternalInstance,
      nextVNode:VNode,
      optimized:boolean
  )=>{
    // 更新成为新的组件
    nextVNode.component = instance
    const prevProps = instance.vnode.props
    instance.vnode = nextVNode
    instance.next= null
    updateProps(instance,nextVNode.props,prevProps,optimized)
    updateSlots(instance,nextVNode.children)
    // 更新
    instance.update()
  }
}

// ==  render functions
type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent?: ComponentInternalInstance | null,
  parentSuspense?: SuspenseBoundary | null,
  isSvg?: boolean,
  optmized?: boolean
) => void

export type MountComponentFn = (
  initialVNode: VNode,
  container: any,
  anchor: any | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSvg: boolean,
  optimized: boolean
) => void

export type setupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: any,
  anchor: any | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) => void
