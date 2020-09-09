import { Component, ComponentInstance } from './component'
import { RendererElement } from './render'
import { isObject } from 'util'
import { AppContext } from '../seed/createApp'
export interface VNodeProps {
  key?: string | number
  ref?: any
  [key: string]: any
}
export interface VNode<HostElement = RendererElement> {
  __isVNode: true
  type: VNodeType
  props: VNodeProps | null
  key: string | number | null
  ref: any | null
  children: VNodeChildren
  shapeFlag: ShapeFlags

  el: HostElement | null
  component: ComponentInstance | null
  appContext: AppContext | null
  dirs: any[]
}

type VNodeType =
  | string
  | Component
  | typeof Fragment
  | typeof Text
  | typeof Comment
export type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void
export type VNodeChildren = VNodeChildAtom[] | VNodeChildAtom

export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  COMPONENT = ShapeFlags.FUNCTIONAL_COMPONENT | ShapeFlags.STATEFUL_COMPONENT,
  COMPONENT_KEPT_ALIVE = 1 << 5,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 6,
}

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Static = Symbol('Static')

export const createVNode = (
  type: VNodeType,
  props: VNodeProps = null,
  children: VNodeChildren = null
): VNode => {
  let shapeFlag = 0
  if (typeof type === 'string') {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (typeof type === 'function') {
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  }

  let vnode: VNode = {
    __isVNode: true,
    type,
    props,
    children,
    key: null,
    ref: null,
    shapeFlag,
    component: null,
    el: null,
    appContext: null,
  }
  normalizeChildren(vnode, vnode.children)
  return vnode
}

// 对即将挂载的node进行处理
export function normalizeVNode(node: VNodeChildAtom): VNode {
  if (node == null || typeof node === 'boolean') {
    // 创建空的注释节点
    return createVNode(Comment)
  } else if (Array.isArray(node)) {
    return createVNode(Fragment, null, node)
  } else if (typeof node === 'object') {
    // 已经是vnode,这是最多的情况
    if (node.el == null) {
      // 没有挂载过
      return node
    } else {
      // 已经挂载过
      return cloneVNode(node)
    }
  } else {
    //   其余情况都作为文本处理
    return createVNode(Text, null, String(node))
  }
}

function normalizeChildren(vnode: VNode, children: unknown) {
  let { shapeFlag } = vnode
  let type = 0
  if (children == null) {
    // 没有children
    children = null
  } else if (Array.isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    console.warn('children是object类型，做字符串处理。todotodo')
    if (!children.default) {
      type = ShapeFlags.TEXT_CHILDREN
    }
  } else if (typeof children === 'function') {
    console.warn('children是function类型，todotodo')
  } else {
    // 都作为字符串处理
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }

  vnode.children = children as VNodeChildren
  vnode.shapeFlag = shapeFlag | type
}

export function cloneVNode(
  vnode: VNode,
  extraProps?: VNodeProps | null
): VNode {
  return {
    __isVNode: true,
    type: vnode.type,
    props: vnode.props,
    children: vnode.children,
    key: vnode.key,
    ref: vnode.ref,
    shapeFlag: vnode.shapeFlag,
    component: vnode.component,
    el: vnode.el,
    appContext: vnode.appContext,
  }
}
