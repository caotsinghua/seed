import {
  VNode,
  Component,
  TEXT_NODE_TYPE,
  DefaultProps,
  ComponentChild,
  createTextVNode,
  createVNode,
  Fragment,
  Ref,
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

// 更新子节点
function diffChildren(
  parentDom: SeedElement,
  children: VNode[],
  newParentNode: VNode,
  oldParentNode: VNode,
  globalContext: object,
  isSvg: boolean,
  excessDomChildren: SeedElement[] | null,
  commitQueue: any[],
  oldDom: SeedElement | Symbol | null
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
        (oldNode as VNode).key === childNode.key &&
        (oldNode as VNode).type === childNode.type)
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
          childNode.key === (oldNode as VNode).key &&
          childNode.type === (oldNode as VNode).type
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
      // 新节点挂载在某个dom前，返回这个dom
      oldDom = placeChild(
        parentDom,
        childNode,
        oldNode as VNode,
        oldChildren,
        excessDomChildren,
        newDom,
        oldDom as SeedElement
      ) as SeedElement

      //   防止默认从textContext读取value
      if (newParentNode.type === 'option') {
        ;(parentDom as HTMLOptionElement).value = ''
      } else if (typeof newParentNode.type === 'function') {
        //   类似fragment的vnode
        newParentNode._nextDom = oldDom as SeedElement
      }
    }
    // newdom == null
    //
    else if (
      oldDom &&
      (oldNode as VNode)._el == oldDom &&
      (oldDom as HTMLElement).parentNode != parentDom
    ) {
      // 旧的挂载元素存在 && 对应位置的旧node的dom和oldDom一样，且oldDom不挂载在parentDom下
      // 为了处理空的占位符TODO:??
      oldDom = getDomSibling(oldNode as VNode)
    }
  }

  newParentNode._el = firstChildDom // 父节点的dom为第一个子dom
  //   移除不属于任何node的dom元素
  if (excessDomChildren != null && typeof newParentNode.type !== 'function') {
    for (let i = excessDomChildren.length - 1; i >= 0; i--) {
      if (excessDomChildren[i] != null) {
        removeNode(excessDomChildren[i])
      }
    }
  }
  //   移除旧的还存在的node
  for (let i = oldChildrenLen; i >= 0; i--) {
    if (oldChildren[i] != null) {
      unmount(oldChildren[i] as VNode, oldChildren[i] as VNode, false)
    }
  }

  if (refs) {
    for (let i = 0; i < refs.length - 1; i++) {
      applyRef(refs[i], refs[++i], refs[++i])
    }
  }
}

// 插入newdom到正确位置
// 返回newdom的nextdom
function placeChild(
  parentDom: SeedElement,
  childNode: VNode,
  oldNode: VNode,
  oldChildren: ComponentChild[],
  excessDomChildren: SeedElement[] | null,
  newDom: SeedElement,
  oldDom: SeedElement
) {
  let nextDom
  if (childNode._nextDom !== undefined) {
    // 只有fragments或者返回nodes的组件的vnode会有非undefined的_nextDom ,
    // 从这个子vnode的最后一个子dom的兄弟节点继续diff
    // 目的是当前childnode要挂载在某个dom之前，因此要获取这个nextdom
    nextDom = childNode._nextDom
    // 已经保存在临时变量nextdom中，不需要再保持
    childNode._nextDom = undefined
  } else if (
    (excessDomChildren == null && oldNode == null) ||
    newDom !== oldDom ||
    newDom.parentNode == null
  ) {
    //   TODO:这个分支的作用？
    // excessDomChildren == oldNode是一个比较，excessDomChildren==null && oldNode==null
    // 没有额外dom元素，也没有oldnode
    // 新旧dom不相同
    // 新dom没有挂载过
    outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
      // 没有旧的挂载元素，或者 旧挂载元素不是挂载在现在的parentdom下面
      //   则直接挂载当前元素
      parentDom.appendChild(newDom) //
      nextDom = null
    } else {
      let sibdom: any
      let j = 0
      for (
        sibdom = oldDom, j = 0;
        (sibdom = sibdom.nextSibling) && j < oldChildren.length;
        j += 2
      ) {
        if (sibdom == newDom) {
          // olddom的兄弟节点存在和newdom一样的节点，无需再挂载
          break outer
        }
      }
      //   olddom同级没有和newdom一样的
      parentDom.insertBefore(newDom, oldDom as any) // 新节点挂载在olddom之前
      nextDom = oldDom
    }

    // 已经获取到nextdom,就使用这个获取到的nextdom
    // 否则重新获取
    if (nextDom !== undefined) {
      return nextDom
    } else {
      return newDom.nextSibling
    }
  }
}

// 设置ref
function applyRef(ref: Ref<any>, value: SeedElement | any, vnode: VNode) {
  try {
    if (typeof ref === 'function') {
      ref(value)
    } else {
      ref.current = value
    }
  } catch (e) {
    console.error(vnode)
    console.error('ref error')
    catchError(e, vnode)
  }
}

// 移除dom元素
function removeNode(node: SeedElement) {
  const parent = node.parentNode
  if (parent) {
    parent.removeChild(node)
  }
}

// 卸载node
function unmount(vnode: VNode, parentVNode: VNode, skipRemove: boolean) {
  let ref = vnode.ref
  if (ref) {
    if (!(ref as any).current || (ref as any).current === vnode._el) {
      // 未绑定ref ， ref是vnode的dom
      applyRef(ref, null, parentVNode)
    }
  }

  let dom
  if (!skipRemove && typeof vnode.type != 'function') {
    dom = vnode._el
    skipRemove = dom != null // 已经挂载的vnode，且skip为false，skip=true
  }

  vnode._el = vnode._nextDom = undefined

  let comp = vnode._component
  if (comp != null) {
    if (comp.componentWillUnmount) {
      comp.componentWillUnmount()
    }
    comp.base = comp._parentDom = null
  }

  let children = vnode._children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      if (children[i]) {
        unmount(children[i] as VNode, parentVNode, skipRemove)
      }
    }
  }

  if (dom) {
    removeNode(dom)
  }
}

export function getDomSibling(vnode: VNode, childIndex?: number): any {
  if (childIndex == null) {
    if (vnode._parent) {
      return getDomSibling(
        vnode._parent,
        (vnode._parent._children as VNode[]).indexOf(vnode) + 1
      )
    } else {
      return null
    }
  }

  let sibling: VNode
  const children = vnode._children || []
  for (; childIndex < children.length; childIndex++) {
    sibling = children[childIndex] as VNode
    if (sibling != null && sibling._el != null) {
      // Since updateParentDomPointers keeps _dom pointer correct,
      // we can rely on _dom to tell us if this subtree contains a
      // rendered DOM node, and what the first rendered DOM node is
      return sibling._el
    }
  }

  if (typeof vnode.type == 'function') {
    return getDomSibling(vnode)
  }
  return null
}

// 捕捉错误
function catchError(error: object, vnode: VNode) {
  let component
  let hasCaught
  while (vnode) {
    component = vnode._component
    if (component && !component._processingException) {
      try {
        if (
          component.constructor &&
          component.constructor.getDerivedStateFromError
        ) {
          hasCaught = true
          component.setState(
            component.constructor.getDerivedStateFromError(error)
          )
        }

        if (component.componentDidCatch) {
          hasCaught = true
          component.componentDidCatch(error)
        }

        if (hasCaught) {
          return enqueueRender((component._pendingError = component))
        }
      } catch (e) {
        error = e
      }
    }

    vnode = vnode._parent as VNode
  }
  //   错误未被捕捉
  throw error
}

function enqueueRender(component: any) {}

// 更新属性
/**
 *
 * @param dom
 * @param newProps
 * @param oldProps
 * @param isSvg
 */
function diffProps(
  dom: SeedElement,
  newProps: DefaultProps,
  oldProps: DefaultProps,
  isSvg: boolean
) {
  for (let key in oldProps) {
    if (key !== 'children' && key !== 'key' && !(key in newProps)) {
      //   移除旧属性
      setProperty(dom, key, null, oldProps[key], isSvg)
    }
  }
  //   添加/更新新属性
  for (let key in newProps) {
    if (
      key !== 'children' &&
      key !== 'key' &&
      key !== 'value' &&
      key !== 'checked' &&
      oldProps[key] !== newProps[key]
    ) {
      setProperty(dom, key, newProps[key], oldProps[key], isSvg)
    }
  }
}
const XLINK_NAMEPSACE='http://www.w3.org/1999/xlink'
function setProperty(
  dom: Node,
  name: string,
  value: any,
  oldValue: any,
  isSvg: boolean
) {
  if (isSvg) {
    if (name === 'className') {
      name = 'class'
    }
  } else if (name === 'class') {
    name = 'className'
  }
  // 事件
  else if (name[0] === 'o' && name[1] === 'n') {
    let useCapture = name !== (name = name.replace(/Capture$/, ''))
    let nameLower = name.toLowerCase()
    name = (nameLower in dom ? nameLower : name).slice(2)
    if (value) {
      if (!oldValue) {
        dom.addEventListener(name, eventProxy, useCapture)
        if (!dom._listeners) {
          dom._listeners = {}
          dom._listeners[name] = value
        }
      }
    } else {
      dom.removeEventListener(name, eventProxy, useCapture)
    }
  }
  // 一些只读属性不设置值
//   对于dom中已经有的property，通过直接赋值的形式更新
  else if (
    name !== 'list' &&
    name !== 'tagName' &&
    name !== 'form' &&
    name !== 'type' &&
    name !== 'size' &&
    name !== 'download' &&
    !isSvg &&
    name in dom
  ) {
    dom[name] = value == null ? '' : value
  }
  else if(typeof value !== 'function' && name!=='dangerouslySetInnerHTML'){
      if(name!== (name=name.replace(/^xlink/,''))){
        //   使用xlink:xxx 的属性名
        if(value == null || value === false){
            (dom as SVGElement).removeAttributeNS(XLINK_NAMEPSACE,name.toLowerCase())
        }else{
            (dom as SVGElement).setAttributeNS(XLINK_NAMEPSACE,name.toLowerCase(),value)
        }
      }else if(value ==null || (value===false && !/^ar/.test(name))){
        //   有些aira的属性不支持false，true，设置false会报错？
          (dom as HTMLElement).removeAttribute(name)
      }else{
          (dom as HTMLElement).setAttribute(name,value)
      }
  }
}
