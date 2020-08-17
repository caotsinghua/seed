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
import { ENGINE_METHOD_PKEY_ASN1_METHS } from 'constants'

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
    insert: hostInsert,
    remove: hostRemove,
    patchProp,
    forcePatchProps,
    createComment,
    createElement,
    createText,
    setText,
    setElementText,
    parentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = () => {},
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
        } else {
          patchStaticNode(n1, n2, container, isSvg)
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
    setupRenderEffect(
      instance,
      initialVNode,
      container,
      anchor,
      parentSuspense,
      isSvg,
      optimized
    )
  }

  const updateComponent = (n1: VNode, n2: VNode, optimized: boolean) => {
    const instance = (n2.component = n1.component)!
    if (shouldUpdateComponent(n1, n2, optimized)) {
      // suspense的一些代码
      if (instance?.asyncDep && !instance.asyncResolved) {
        updateComponentPreRender(instance, n2, optimized)
        return
      } else {
        // 正常走到这里
        instance.next = n2
        // 避免重复更新
        invalidateJob(instance.update)
        instance.update()
      }
    } else {
      // 不用更新
      n2.component = n1.component
      n2.el = n1.el
      instance.vnode = n2
    }
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
        if (originNext === null) {
          // 更新父组件的el
          updateHOCHostEl(instance, nextTree.el)
        }
        // 触发一些声明周期
      }
    }, prodEffectOptions)
  }

  const updateComponentPreRender = (
    instance: ComponentInternalInstance,
    nextVNode: VNode,
    optimized: boolean
  ) => {
    // 更新成为新的组件
    nextVNode.component = instance
    const prevProps = instance.vnode.props
    instance.vnode = nextVNode
    instance.next = null
    updateProps(instance, nextVNode.props, prevProps, optimized)
    updateSlots(instance, nextVNode.children)
    // 更新
    instance.update()
  }

  const getNextHostNode = (vnode: VNode) => {
    if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
      return getNextHostNode(vnode.component!.subTree)
    }
    if (vnode.shapeFlag & ShapeFlags.SUSPENSE) {
      return vnode.suspense!.next()
    }
    // getNextSinling
    return hostNextSibling(vnode.anchor || vnode.el)
  }

  // 处理文字

  const processText = (
    n1: VNode,
    n2: VNode,
    container: any | null,
    anchor: any | null
  ) => {
    if (n1 == null) {
      // 挂载
      hostInsert(
        (n2.el = hostCreateText(n2.children as string)),
        container,
        anchor
      )
    } else {
      // 更新
      const el = (n2.el = n1.el)
      // 更新文本
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children as string)
      }
    }
  }
  // 创建注释
  const processCommentNode = (
    n1: VNode,
    n2: VNode,
    container: any | null,
    anchor: any | null
  ) => {
    // 挂载
    if (n1 == null) {
      // 创建comment，并插入到container
      hostInsert(
        (n2.el = hostCreateComment((n2.children as string) || '')),
        container,
        anchor
      )
    } else {
      // 没有动态的注释
      n2.el = n1.el
    }
  }

  // static
  const mountStaticNode = (
    n2: VNode,
    container: any,
    anchor: any | null,
    isSVG: boolean
  ) => {
    ;[n2.el, n2.anchor] = hostInsertStaticContent!(
      n2.children as string,
      container,
      anchor,
      isSVG
    )
  }
  // dev / hmr only
  const patchStaticNode = (
    n1: VNode,
    n2: VNode,
    container: any | null,
    isSVG: boolean
  ) => {
    if (n2.children !== n1.children) {
      const anchor = hostNextSibling(n1.anchor!)
      // 移除旧的元素
      removeStaticNode(n1)
      ;[(n2.el, n2.anchor)] = hostInsertStaticContent!(
        n2.children as string,
        container,
        anchor,
        isSVG
      )
    } else {
      // 相同
      n2.el = n1.el
      n2.anchor = n1.anchor
    }
  }

  // fragment
  const processFragment = (
    n1: VNode | null,
    n2: VNode,
    container: any,
    anchor: any | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
  ) => {
    // 范围开始节点
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))
    let { patchFlag, dynamicChildren } = n2
    if (patchFlag > 0) {
      optimized = true
    }
    // 挂载 / 更新
    if (n1 == null) {
      // 挂载
      hostInsert(fragmentStartAnchor, container, anchor)
      hostInsert(fragmentEndAnchor, container, anchor)
      // 先插入开始和结束的节点
      // 把子节点插入到start和end中间
      mountChildren(
        n2.children,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized
      )
    } else {
      if (
        patchFlag > 0 &&
        patchFlag & PatchFlags.STABLE_FRAGMENT &&
        dynamicChildren
      ) {
        patchBlockChildren(
          n1.dynamicProps,
          dynamicChildren,
          container,
          parentComponent,
          parentSuspense,
          isSVG
        )
      } else {
        // 更新children
        patchChildren(
          n1,
          n2,
          container,
          fragmentEndAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
          optimized
        )
      }
    }
  }

  // 更新element
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: any | null,
    anchor: any | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
  ) => {
    isSVG = isSVG || (n2.type as string) === 'svg'
    if (n1 == null) {
      // 挂载
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized
      )
    } else {
      patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized)
    }
  }

  const mountElement = (
    vnode: VNode,
    container: any,
    anchor: any | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
  ) => {
    let el
    let vnodeHook: VNodeHook | undefined | null
    const {
      type,
      props,
      shapeFlag,
      transition,
      scopeId,
      patchFlag,
      dirs,
    } = vnode

    if (
      !__DEV__ &&
      vnode.el &&
      hostCloneNode !== undefined &&
      patchFlag === PatchFlags.HOISTED
    ) {
      // el 被宠用
      el = vnode.el = hostCloneNode(vnode.el)
    } else {
      el = vnode.el = hostCreateElement(
        vnode.type as string,
        isSVG,
        props && props.is
      )
      // 先渲染children
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(el, vnode.children as string)
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          vnode.children,
          el,
          null,
          parentComponent,
          parentSuspense,
          isSVG && type !== 'foreignObject',
          optimized || !!vnode.dynamicChildren
        )
      }
      if (props) {
        for (const key in props) {
          if (!isReversedProp(key)) {
            hostPatchProp(
              el,
              key,
              null,
              props[key],
              isSVG,
              vnode.children,
              parentComponent,
              parentSuspense,
              unmountChildren
            )
          }
        }
      }

      // 触发beforeMounthook
      if (dirs) {
        invokeDirectiveHook()
      }

      if (scopeId) {
        hostSetScopeId(el, scopeId)
      }

      const treeOwnerId = parentComponent && parentComponent.type.__scopeId
      if (treeOwnerId && treeOwnerId !== scopeId) {
        hostSetScopeId(el, treeOwnerId + '-s')
      }
      if (transition && !transition.persisted) {
        transition.beforeEnter(el)
      }
    }
    // 插入dom
    hostInsert(el, container, anchor)

    const needCallTransitionHooks =
      !parentSuspense ||
      (parentSuspense &&
        parentSuspense.isResolved &&
        transition &&
        !transition.persisted)
    if (
      (vnodeHook = props && props.onVnodeMounted) ||
      needCallTransitionHooks ||
      dirs
    ) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
        needCallTransitionHooks && transition.enter(el)
        dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
      }, parentSuspense)
    }
  }

  const patchElement = (
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    optimized: boolean
  ) => {
    const el = (n2.el = n1.el)
    let { patchFlag, dynamicChildren, dirs } = n2
    patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS

    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.FULL_PROPS) {
        patchProps(
          el,
          n2,
          oldProps,
          newProps,
          parentComponent,
          parentSuspense,
          isSVG
        )
      } else {
        // class
        if (patchFlag & PatchFlags.CLASS) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, 'class', null, newProps.class, isSVG)
          }
        }
        // style
        if (patchFlag & PatchFlags.STYLE) {
          hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
        }
        if (patchFlag & PatchFlags.PROPS) {
          const propsToUpdate = n2.dynamicProps
          for (let i = 0; i < propsToUpdate?.length; i++) {
            const key = propsToUpdate[i]
            const prev = oldProps[key]
            const next = newProps[key]
            if (
              next !== prev ||
              (hostForcePatchProp && hostForcePatchProp(el, key))
            ) {
              hostPatchProp(
                el,
                key,
                prev,
                next,
                isSVG,
                n1.children,
                parentComponent,
                parentSuspense,
                unmountChildren
              )
            }
          }
        }
      }
    }
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
