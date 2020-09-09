import {
  VNode,
  ShapeFlags,
  Text,
  Comment,
  Static,
  Fragment,
  normalizeVNode,
  VNodeProps,
  VNodeChildren,
  VNodeChildAtom,
} from './vnode'
import {
  ComponentOptions,
  ComponentInstance,
  createComponentInstance,
  setupComponent,
  updateProps,
} from './component'
import { renderComponentRoot } from './componentRenderUtils'
import { effect, ReactiveEffect } from '../reactivity/effect'
import { isObject } from 'util'
import { queuePostFlushCbs } from './scheduler'
import { LifecycleHooks } from './apiLifecycle'
import { updateSlots } from './componentSlots'
import { debug } from 'console'
import { invokeDirectiveHook } from './directives'
import { EDEADLK } from 'constants'

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
  parentNode(el: RendererElement) {
    if (el) {
      return (el as HTMLElement).parentNode
    }
  },
  remove(el: RendererElement) {
    if (el) {
      ;(el as HTMLElement).parentElement?.removeChild(el as HTMLElement)
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
      unmont(container._vnode, null, true)
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
    unmont(oldNode, parentComponent, true)
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
    console.warn('---- patch element --- ')
    patchElement(oldNode, newNode, parentComponent, isSVG)
  }
}

function mountElement(
  node: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  const { type, shapeFlag, children, props } = node
  let el: RendererElement
  el = node.el = rendererOptions.createElement(type as string, isSVG)
  //  --- 触发dir - hook
  const {dirs} = node
  if(dirs){
    invokeDirectiveHook(node,null,null,'beforeMount')
  }
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
  if (props) {
    patchProps(el, null, node.props)
  }
  //   挂载
  rendererOptions.insert(el, container, anchor)
  
  // 触发生命周期
  queuePostFlushCbs(() => {
    console.log(
      '--hooks - element mounted -- vnodehook,transition-hook,directives'
    )
    if(dirs){
      invokeDirectiveHook(node,null,null,'mounted')
    }
  })
}

function patchElement(
  oldNode: VNode,
  newNode: VNode,
  parentCompoennt: ComponentInstance | null,
  isSVG: boolean
) {
  // 更新元素的一些属性,和children
  const el = (newNode.el = oldNode.el)
  const oldProps = oldNode.props || {}
  const newProps = newNode.props || {}
  patchProps(el, oldProps, newProps)
  // 子元素是否是svg?
  const isChildrenSvg = isSVG && newNode.type !== 'foreignObject'
  // 更新children
  patchChildren(oldNode, newNode, el, null, parentCompoennt, isChildrenSvg)
  // 触发生命周期
  queuePostFlushCbs(() => {
    console.log('--hooks - element updated')
  })
}

function patchProps(
  el: RendererElement,
  oldProps: VNodeProps,
  newProps: VNodeProps
) {
  console.log(' --- 处理props', el)
  // 新旧props完全一样,即node未变,直接返回
  if (oldProps === newProps) return
  oldProps = oldProps || {}
  newProps = newProps || {}
  for (let key in newProps) {
    if (isReservedKey(key)) {
      continue
    }
    patchProp(el, key, oldProps[key], newProps[key])
  }
  for (let key in oldProps) {
    if (!isReservedKey(key) && !(key in newProps)) {
      // 移除旧的属性
      patchProp(el, key, oldProps[key], null)
    }
  }
}

function patchProp(
  el: RendererElement,
  key: string,
  oldVal: unknown,
  newVal: unknown
) {
  console.log('--- patchProp ---', el)
  switch (key) {
    case 'style': {
      if (typeof newVal === 'string') {
        el.style = newVal
      } else if (isObject(newVal)) {
        let styleStr = ''
        console.log(newVal)
        Object.keys(newVal).forEach((k) => {
          if (newVal[k]) {
            styleStr += `${k}:${newVal[k]};`
          }
        })
        el.style = styleStr
        console.log(styleStr)
      } else {
        console.warn(`${el}的style不是字符串/对象`)
      }

      break
    }
    case 'class': {
      // 类名
      if (typeof newVal === 'string') {
        ;(el as HTMLElement).className = newVal
      } else if (Array.isArray(newVal)) {
        let classStr = ''
        for (let i = 0; i < newVal.length; i++) {
          let cur = newVal[i]
          if (typeof cur === 'string') {
            classStr += `${cur} `
          } else if (isObject(cur)) {
            Object.keys(cur).forEach((k) => {
              if (cur[k]) {
                classStr += `${k} `
              }
            })
          }
        }
        ;(el as HTMLElement).className = classStr
      } else if (isObject(newVal)) {
        let classStr = ''
        Object.keys(newVal).forEach((k) => {
          if (newVal[k]) {
            classStr += `${k} `
          }
        })
        ;(el as HTMLElement).className = classStr
      } else {
        console.warn(el, 'class 的值不是字符串/数组/对象')
      }
      break
    }
    default: {
      if (key[0] === 'o' && key[1] === 'n') {
        console.debug('---- 绑定事件---', el, newVal)
        // 事件
        if (oldVal) {
          ;(el as HTMLElement).removeEventListener(key.substr(2), oldVal as any)
        }
        if (newVal) {
          ;(el as HTMLElement).addEventListener(key.substr(2), newVal as any)
        }
      } else {
        // 其他的attribute和property
        if (key === 'innerHTML' || key === 'textContent') {
          // 移除所有元素
          console.warn(` ---- 触发${key} prop更新,移除所有元素,todo ---`)
          el[key] = newVal
          return
        }
        if (key === 'value' && (el as HTMLElement).tagName === 'PROGRESS') {
          el._value = newVal
          el.value = newVal == null ? '' : newVal
          return
        }
        if (newVal === '' && typeof el[key] === 'boolean') {
          // 默认加key为true
          // e.g. <select multiple> compiles to { multiple: '' }
          el[key] = true
        } else if (newVal == null && typeof el[key] === 'string') {
          // e.g. <div :id="null">
          el[key] = ''
          ;(el as HTMLElement).removeAttribute(key)
        } else {
          try {
            el[key] = newVal
          } catch (e) {
            console.warn('附加元素属性失败', e)
          }
        }
      }
    }
  }
}

function patchChildren(
  oldNode: VNode,
  newNode: VNode,
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  const oldChildren = oldNode && oldNode.children
  const prevShapeFlag = (oldNode && oldNode.shapeFlag) || 0
  const newChildren = newNode && newNode.children
  const { shapeFlag } = newNode
  // children有几种类型
  // text，array，null
  // 新children是text
  console.debug('更新children', { oldChildren, newChildren })

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 卸载旧的node
      unmountChildren(oldChildren as VNode[], parentComponent, true)
    }
    if (newChildren !== oldChildren) {
      rendererOptions.setElementText(container, newChildren as string)
    }
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 新children是数组
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // full diff
      patchUnKeyedChildren(
        oldChildren as VNode[],
        newChildren as VNodeChildAtom[],
        container,
        anchor,
        parentComponent,
        isSVG
      )
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        rendererOptions.setElementText(container, '')
      }
      // =mount
      mountChildren(
        newChildren as VNodeChildAtom[],
        container,
        anchor,
        parentComponent,
        isSVG
      )
    }
  } else {
    // 新children是null
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //  新节点null,卸载
      unmountChildren(oldChildren as VNode[], parentComponent, true)
    } else {
      // 新旧都是null
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        rendererOptions.setElementText(container, '')
      }
    }
  }
}

function unmountChildren(
  children: VNode[],
  parentComponent: ComponentInstance,
  doRemove: boolean = false,
  start = 0
) {
  for (let i = start; i < children.length; i++) {
    unmont(children[i], parentComponent, doRemove)
  }
}

function patchUnKeyedChildren(
  oldChildren: VNode[],
  newChildren: VNodeChildAtom[],
  container: RendererElement,
  anchor: RendererNode,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  console.log('---- patchUnKeyedChildren start ---')
  oldChildren = oldChildren || []
  newChildren = newChildren || []
  let oldLen = oldChildren.length
  let newLen = newChildren.length
  let commonLen = Math.min(oldLen, newLen)
  console.debug('patchUnKeyedChildren', {
    oldChildren,
    newChildren,
  })
  for (let i = 0; i < commonLen; i++) {
    let o = oldChildren[i]
    let n = (newChildren[i] = normalizeVNode(newChildren[i]))
    patch(o, n, container, null, parentComponent, isSVG)
  }
  if (oldChildren > newChildren) {
    // 删除节点
    unmountChildren(oldChildren, parentComponent, true, commonLen)
  } else {
    // 挂载新节点
    mountChildren(
      newChildren.slice(commonLen),
      container,
      null,
      parentComponent,
      isSVG
    )
  }
  console.log('---- patchUnKeyedChildren end ---')
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
    console.debug('old = null', { newNode })

    if(newNode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE){
      console.debug("---- 该组件已经被缓存了,使用activate方法代替")
    }
    // 挂载组件
    mountComponent(newNode, container, anchor, parentCompoennt, isSVG)
  } else {
    console.log('=== patch Component === todo==')
    console.debug('组件更新', oldNode, newNode)
    updateComponent(oldNode, newNode)
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
// 更新组件
function updateComponent(oldVNode: VNode, newVNode: VNode) {
  // 直接更新
  // 由于只有mountcomponent的时候才会创建vnode.compoennt,因此这里更新的时候直接赋值。
  const instance = (newVNode.component = oldVNode.component) // 即将更新的组件
  instance.next = newVNode // 新组件的vnode，一些children等参数可能变化
  instance.update()
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

      // will mount
      queuePostFlushCbs(() => {
        console.log('-- hook - 组件即将挂载 --')
      })
      if (instance[LifecycleHooks.BEFORE_MOUNT]) {
        queuePostFlushCbs(instance[LifecycleHooks.BEFORE_MOUNT])
      }

      // =collect dep
      console.log('== 组件依赖收集+初次render', subTree)
      patch(null, subTree, container, anchor, instance, isSVG)
      initialVNode.el = subTree.el
      instance.isMounted = true
      queuePostFlushCbs(() => {
        console.log('-- hook - 组件挂载完成 --')
      })
      if (instance[LifecycleHooks.MOUNTED]) {
        queuePostFlushCbs(instance[LifecycleHooks.MOUNTED])
      }
    } else {
      // 1. 由组件自身状态改变 instance.next = null
      // 2. 父组件更新子组件 processComponent instance.next = vnode
      console.log('--- 组件更新 todo---')
      let { vnode, parent, next } = instance
      const originNext = next
      if (next) {
        // 由父组件引起的
        updateComponentPreRender(instance, next)
      } else {
        next = vnode
      }

      const oldTree = instance.subTree // tree是用来渲染的
      const nextTree = renderComponentRoot(instance) // 当前render重新执行
      instance.subTree = nextTree

      // --- 触发钩子
      queuePostFlushCbs(() => {
        console.log('-- hooks 组件即将更新')
      })
      console.debug(
        '---更新的copntainer',
        oldTree,
        oldTree.el,
        rendererOptions.parentNode(oldTree.el)
      )
      patch(
        oldTree,
        nextTree,
        rendererOptions.parentNode(oldTree.el),
        getNextAnchor(oldTree),
        instance,
        isSVG
      )
      next.el = nextTree.el
      queuePostFlushCbs(() => {
        console.log('-- hooks 组件更新完成')
      })
      if (instance[LifecycleHooks.UPDATED]) {
        queuePostFlushCbs(instance[LifecycleHooks.UPDATED])
      }
    }
  })
}

function updateComponentPreRender(
  instance: ComponentInstance,
  nextNode: VNode
) {
  nextNode.component = instance // 这一步已经在updateComponent中做过了?
  const prevProps = instance.vnode.props
  instance.vnode = nextNode // 重新赋值,改变vnode,对应h(Compo,[child])
  instance.next = null
  // 更新props
  console.log(' ---- update props ---')
  updateProps(instance, nextNode.props, prevProps)
  updateSlots(instance, nextNode.children as any)
}

function mountChildren(
  children: VNodeChildAtom[],
  container: RendererElement,
  anchor: RendererNode | null = null,
  parentComponent: ComponentInstance,
  isSVG: boolean
) {
  for (let i = 0; i < children.length; i++) {
    let node = (children[i] = normalizeVNode(children[i])) // 挂载后的children一定是vnode
    // 挂载
    patch(null, node, container, anchor, parentComponent, isSVG)
  }
}
// 卸载vnode
function unmont(
  vnode: VNode,
  parentCompoennt: ComponentInstance,
  doRemove: boolean
) {
  const { shapeFlag, el } = vnode
  console.warn('卸载vnode,为实现')
  if (shapeFlag & ShapeFlags.COMPONENT) {
    // 组件类型
    if(vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE){
      console.debug("--- 这个node已经在keepalive渲染,卸载走deactivate")
    }
    unmountComponent(vnode.component, doRemove)
  } else {
    // 如果要移除的vnode有children，对每个children移除
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(vnode.children as VNode[], parentCompoennt, doRemove)
    }
    if (doRemove) {
      remove(vnode)
    }
  }
}

function remove(vnode: VNode) {
  const { type, el, shapeFlag } = vnode
  rendererOptions.remove(el)
}

function unmountComponent(component: ComponentInstance, doRemove: boolean) {
  const { update, subTree } = component
  console.warn('--- --- 卸载component ---')
  // 停止effect触发
  if (update) {
    unmont(subTree, component, doRemove)
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

export function isReservedKey(key: string) {
  let set = new Set(['key', 'ref'])
  return set.has(key)
}
