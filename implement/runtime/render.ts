import {
  VNode,
  ShapeFlags,
  Text,
  Comment,
  Static,
  Fragment,
  normalizeVNode,
} from './vnode'
import {
  ComponentOptions,
  ComponentInstance,
  createComponentInstance,
  setupComponent,
} from './component'
import { renderComponentRoot } from './componentRenderUtils'
import { effect } from '../reactivity/effect'

const rendererOptions = {
  nextSibling(node: RendererNode) {
    const el = node as HTMLElement
    return el.nextSibling
  },
  //   暂不支持is ,web-component
  createElement(tag: string, isSVG: boolean = false, is?: string) {
    let el
    if (isSVG) {
      el = document.createElementNS('http://www.w3.org/2000/svg', tag)
    } else {
      el = document.createElement(tag)
    }
    return el
  },
  setElementText(el: RendererElement, text: string) {
    ;(el as HTMLElement).innerText = text
  },
  insert(
    el: RendererElement,
    container: RendererElement,
    anchor: RendererNode
  ) {
    if (anchor == null) {
      ;(container as HTMLElement).appendChild(el as HTMLElement)
    } else {
      ;(container as HTMLElement).insertBefore(
        el as HTMLElement,
        anchor as Node
      )
    }
  },
}

export interface RendererNode {
  [key: string]: any
}

export interface RendererElement extends RendererNode {}

export function render(vnode: VNode, container: RendererElement) {
  if (vnode) {
    //
    patch(container._vnode || null, vnode, container)
  } else {
    // 卸载
    if (container._vnode) {
      unmount(container._vnode)
    }
  }
  container._vnode = vnode
}

export function patch(
  oldNode: VNode | null,
  newNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null = null, // 插入节点
  parentComponent: ComponentInstance | null = null,
  isSVG: boolean = false
) {
  if (oldNode && !isSameNodeType(oldNode, newNode)) {
    anchor = getNextAnchor(oldNode)
    unmount(oldNode)
    oldNode = null
  }
  let { type, shapeFlag } = newNode
  //   先筛选type
  switch (type) {
    case Text:
      console.log('处理text')
      break
    case Comment:
      console.log('处理注释')
      break
    case Static:
      console.log('处理静态节点')
      break
    case Fragment:
      console.log('处理fragment')
      break
    default:
      // 处理element和component
      if (shapeFlag & ShapeFlags.ELEMENT) {
        console.debug('处理element in patch')
        processElement(
          oldNode,
          newNode,
          container,
          anchor,
          parentComponent,
          isSVG
        )
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        console.debug('处理component in patch')
        processComponent(
          oldNode,
          newNode,
          container,
          anchor,
          parentComponent,
          isSVG
        )
      }
  }
}

function processElement(
  oldNode: VNode,
  newNode: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance | null,
  isSVG: boolean
) {
  isSVG = isSVG || newNode.type === 'svg'
  if (!oldNode) {
    // mount
    mountElement(newNode, container, anchor, parentComponent, isSVG)
  } else {
    // patch
    console.warn('更新元素，todo')
  }
}

function mountElement(
  node: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  const { type, shapeFlag, children } = node
  let el: RendererElement
  el = node.el = rendererOptions.createElement(type as string, isSVG)
  //   处理children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    //   children是text
    rendererOptions.setElementText(el, children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    //   children是数组
    mountChildren(
      children as VNode[],
      el,
      null,
      parentComponent,
      isSVG && type !== 'foreignObject'
    )
  } else {
    console.warn('node', node, '的children不是数组/text')
  }

  //TODO:   添加属性
  //   挂载
  rendererOptions.insert(el, container, anchor)
}

function processComponent(
  oldNode: VNode,
  newNode: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentCompoennt: ComponentInstance,
  isSVG: boolean
) {
  if (oldNode == null) {
    // 挂载组件
    mountComponent(newNode, container, anchor, parentCompoennt, isSVG)
  } else {
    patchComponent(oldNode, newNode, container, anchor, isSVG)
  }
}

function mountComponent(
  node: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance | null,
  isSVG: boolean
) {
  const instance: ComponentInstance = (node.component = createComponentInstance(
    node,
    parentComponent
  ))

  setupComponent(instance)
  // 绑定更新函数,依赖收集
  setupRenderEffect(instance, node, container, anchor, isSVG)
}

function setupRenderEffect(
  instance: ComponentInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode,
  isSVG: boolean
) {
  instance.update = effect(function componentEffect() {
    // 未挂载
    if (!instance.isMounted) {
      let vnodeHook
      const subTree = (instance.subTree = renderComponentRoot(instance))
      // =collect dep
      console.log('== 依赖收集+初次render', subTree)
      patch(null, subTree, container, anchor, instance, isSVG)
    }
  })
}

function mountChildren(
  children: VNode[],
  container: RendererElement,
  anchor: RendererNode | null = null,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  for (let i = 0; i < children.length; i++) {
    let node = normalizeVNode(children[i])
    // 挂载
    patch(null, node, container, null, parentComponent, isSVG)
  }
}
// 卸载vnode
function unmont(vnode: VNode) {
  const { shapeFlag, el } = vnode
  console.warn('卸载vnode,为实现')
  if (shapeFlag & ShapeFlags.COMPONENT) {
    // 组件类型
  } else {
  }
}

//  --------

function getNextAnchor(node: VNode) {
  if (node.shapeFlag & ShapeFlags.COMPONENT) {
    return getNextAnchor(node.component.subTree)
  }
  return rendererOptions.nextSibling(node.el)
}

function isSameNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key
}
