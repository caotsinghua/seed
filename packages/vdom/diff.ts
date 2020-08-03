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
  let dom: SeedElement | null = null
  if (typeof newType === 'function') {
    //
    console.log('函数类型组件')
  } else {
    // dom
    dom = diffElementNodes(
      oldNode._el, // 旧node的dom元素
      newNode,
      oldNode,
      globalContext,
      isSvg,
      excessDomChildren,
      commitQueue
    ) as SeedElement
  }
  return dom
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
      const parentDom = newDom
      // 新节点作为父节点，
      // 对children进行diff
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
    if (excessDomChildren != null) {
      oldDom = excessDomChildren[0]
    } else if (oldChildrenLen) {
      oldDom = getDomSibling(oldParentNode, 0)
    } else {
      // 没有元素作为旧的挂载元素
      oldDom = null
    }
  }

  const refs: any[] = [] // 引用
  let firstChildDom: SeedElement | null = null // 第一个新的子node

  newParentNode._children = []
  // 填充将要比对的新挂在vnode
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
        childNode._original // diff更新前的节点
      )
    } else {
      // 排除掉：null,boolean,string,number,array,object has monuted
      // 剩下的是object not mount
      // 即未挂载过的节点
      childNode = newParentNode._children[i] = childNode
    }
    // 当前节点不存在
    if (childNode == null) {
      continue
    }
    childNode._parent = newParentNode // 添加父node
    childNode._depth = newParentNode._depth + 1 // 更新层级

    // 旧节点的children
    // 在对应新节点位置的old节点
    let oldNode: VNode | null | object = oldChildren[i] as VNode

    if (
      oldNode === null ||
      (oldNode &&
        oldNode.key === childNode.key &&
        oldNode.type === childNode.type)
    ) {
      // 这个位置新的节点就是 newNode
      oldChildren[i] = undefined
      // 走到这里，oldnode还是原来的值
    } else {
      // 遍历旧节点
      for (let j = 0; j < oldChildrenLen; j++) {
        oldNode = oldChildren[j] as VNode
        // 从旧节点数组找一个和新节点type，key一样的节点
        // 删除原位置的节点
        if (
          oldNode &&
          childNode.key === oldNode.key &&
          childNode.type === oldNode.type
        ) {
          // 找到了匹配的node,退出，oldNode不是null
          oldChildren[j] = undefined
          break
        }
        oldNode = null
      }
    }

    if (!oldNode) {
      // 没有在旧节点中找到和当前要挂在的节点一致的
      oldNode = {}
    }
    // 创建新节点的dom
    const newDom = diff(
      parentDom,
      childNode,
      oldNode as VNode,
      globalContext,
      isSvg,
      excessDomChildren,
      commitQueue,
      oldDom as SeedElement
    )

    // 配置ref的数组，便于后续执行ref方法
    const childRef = childNode.ref
    if (childRef && (oldNode as VNode).ref != childRef) {
      if ((oldNode as VNode).ref) {
        // 旧的node有ref
        refs.push((oldNode as VNode).ref, null, childNode)
        refs.push(childRef, childNode._component || newDom, childNode)
      }
    }

    // 成功创建新的dom
    if (newDom) {
      if (!firstChildDom) {
        // 只在第一个childnode赋值一次
        firstChildDom = newDom
      }
      // 挂在的旧节点
      oldDom = placeChild() // TODO:目的？
    }
  }
}

function placeChild(
  parentDom: SeedElement,
  childNode: VNode,
  oldNode: VNode,
  oldChildren: VNode[],
  excessDomChildren: any[],
  newDom: SeedElement,
  oldDom: SeedElement
) {
  let nextDom
  if (childNode._nextDom !== undefined) {
    // 只有fragments或者返回类似fragment nodes的组件的vnode会有非undefined的_nextDom ,
    nextDom = childNode._nextDom
    // 已经保存在临时变量nextdom中，不需要再保持
    childNode._nextDom = undefined
  } else if (
    excessDomChildren == oldNode ||
    newDom !== oldDom ||
    newDom.parentNode == null
  ) {
    // excessDomChildren == oldNode是一个比较，excessDomChildren==null && oldNode==null
    // 没有额外dom元素，也没有oldnode
    // 新旧dom不相同
    // 新dom没有挂载过
    outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
      // 没有旧的挂载元素，或者 旧挂载元素不是挂载在现在的parentdom下面
      parentDom.appendChild(newDom)
      nextDom = null
    } else {
      let sibdom: ChildNode | null
      let j = 0
      for (
        sibdom = oldDom, j = 0;
        (sibdom = sibdom.nextSibling) && j < oldChildren.length;
        j += 2
      ) {
        if (sibdom == newDom) {
          // ？？？
          break outer
        }
      }
    }
  }
}
