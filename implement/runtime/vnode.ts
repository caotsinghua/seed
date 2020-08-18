import { Component, ComponentInstance } from './component'
import { RendererElement } from './render'
interface VNodeProps {
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
}

type VNodeType =
  | string
  | Component
  | typeof Fragment
  | typeof Text
  | typeof Comment
type VNodeChildren = string | VNode[] | null

export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  COMPONENT = ShapeFlags.FUNCTIONAL_COMPONENT | ShapeFlags.STATEFUL_COMPONENT,
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
  let vnode: VNode = {
    __isVNode: true,
    type,
    props,
    children,
    key: null,
    ref: null,
    shapeFlag: 0,
    component: null,
    el: null,
  }
  return vnode
}

// 对即将挂载的node进行处理
export function normalizeVNode(node: VNode): VNode {
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
  }
}
