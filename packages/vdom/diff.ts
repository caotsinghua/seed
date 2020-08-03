import {
  VNode,
  Component,
  TEXT_NODE_TYPE,
  DefaultPtops,
  DefaultProps,
  ComponentChild,
  createTextVNode,
  createVNode,
  Fragment,
} from './vnode'
import { SeedElement } from './render'
import { Seed } from 'packages/seed'
const EMPTY_DOM = Symbol('EMPTY_DOM')
/**
 *
 * @param parentDom 父级dom元素
 * @param newNode 新节点
 * @param oldNode 旧节点
 * @param globalContext 全局的context,用于共享数据
 * @param isSvg - 是否svg
 * @param excessDomChildren
 * @param commitQueue
 * @param oldDom
 */
export function diff(
  parentDom: SeedElement,
  newNode: VNode,
  oldNode: VNode,
  globalContext: object,
  isSvg: boolean,
  excessDomChildren: SeedElement[] | null,
  commitQueue: Component[],
  oldDom: SeedElement
) {
  const newType = newNode.type
  if (typeof newType === 'function') {
    //
    console.log('函数类型组件')
  } else {
    // dom
    const dom = diffElementNodes(
      oldNode._el, // 旧node的dom元素
      newNode,
      oldNode,
      globalContext,
      isSvg,
      excessDomChildren,
      commitQueue
    )
  }
}

function diffElementNodes(
  dom: SeedElement,
  newNode: VNode,
  oldNode: VNode,
  globalContext: object,
  isSvg: boolean,
  excessDomChildren: any[] | null,
  commitQueue: any[]
) {
  const oldProps = oldNode.props
  const newProps = newNode.props
  isSvg = newNode.type === 'svg' || isSvg
  let newDom: SeedElement | null = null
  //   复用一个已有的dom元素
  if (excessDomChildren) {
    // 有多余的dom元素
    for (let i = 0; i < excessDomChildren.length; i++) {
      const child = excessDomChildren[i]
      let isSameType =
        !!child &&
        ((newNode.type === TEXT_NODE_TYPE && child.nodeType === 3) ||
          child.localName === newNode.type ||
          dom === child)
      if (isSameType) {
        newDom = child
        excessDomChildren[i] = null
      }
    }
  }
  // 未能复用,创建一个新元素
  if (!newDom) {
    // 文本
    if (newNode.type === TEXT_NODE_TYPE) {
      newDom = document.createTextNode(newNode.props)
      return newDom
    }
    if (isSvg) {
      newDom = document.createElementNS(
        'http://www.w3.org/2000/svg',
        newNode.type as string
      )
    } else {
      newDom = document.createElement(
        newNode.type as string,
        newProps.is && {
          is: newProps.is,
        }
      )
    }
    excessDomChildren = null // 由于是重新创建的节点，因此可复用的节点清空
  }
  //   ===更新元素的值和属性
  if (newNode.type === TEXT_NODE_TYPE) {
    //   更新文本节点的内容
    if (oldProps !== newProps && dom.nodeValue !== newProps) {
      newDom.nodeValue = newProps
    }
  } else {
    console.log('excessDomChildren是否还存在', excessDomChildren)
    let oldHtml = oldProps && oldProps.dangerouslySetInnerHTML.__html
    let newHtml = newProps && newProps.dangerouslySetInnerHTML.__html
    if (newHtml || (oldHtml && newHtml != oldHtml)) {
      ;(newDom as HTMLElement).innerHTML = newHtml || ''
    }
    // 更新dom元素属性
    diffProps(dom, newProps, oldProps, isSvg)
    if (newHtml) {
      newNode._children = [] // 不需要children
    } else {
      const children = Array.isArray(newProps.children)
        ? newProps.children
        : [newProps.children]
      const parentDom = newDom // 新节点作为父节点，对children进行diff
      diffChildren(
        parentDom,
        children,
        newNode,
        oldNode,
        globalContext,
        newNode.type === 'foreignObject' ? false : isSvg, // 判断是否svg？？
        excessDomChildren,
        commitQueue,
        EMPTY_DOM
      )
    }
  }
}

// 更新属性
function diffProps(
  dom: SeedElement,
  newProps: DefaultProps,
  oldProps: DefaultProps,
  isSvg: boolean
) {}

// 更新子节点
function diffChildren(
  parentDom: SeedElement,
  children: ComponentChild[],
  newParentNode: VNode,
  oldParentNode: VNode,
  globalContext: object,
  isSvg: boolean,
  excessDomChildren: SeedElement[] | null,
  commitQueue: any[],
  oldDom: SeedElement | Symbol
) {
  const oldChildren = (oldParentNode && oldParentNode._children) || []
  const oldChildrenLen = oldChildren.length
  if (oldDom === EMPTY_DOM) {
    // TODO:寻找可复用元素
  }

  newParentNode._children = []
  for (let i = 0; i < children.length; i++) {
    let childNode: VNode | null = children[i] as VNode
    //   不是node类型
    if (childNode == null || typeof childNode == 'boolean') {
      childNode = newParentNode._children[i] = null // 新children的对应位置的child = null
    } else if (typeof childNode === 'string' || typeof childNode === 'number') {
      childNode = newParentNode._children[i] = createTextVNode(
        childNode as string
      ) // 文本节点的vnode
    } else if (Array.isArray(childNode)) {
      // 子元素还是数组
      childNode = newParentNode._children[i] = createVNode(
        Fragment,
        {
          children: childNode,
        },
        undefined,
        undefined
      )
    } else if (
      (childNode as VNode)._el != null ||
      (childNode as VNode)._component != null
    ) {
      // 该node已经挂载过
      childNode = newParentNode._children[i] = createVNode(
        childNode.type,
        childNode.props,
        childNode.key,
        undefined,
        childNode._original
      )
    }
  }
}
