import { SeedElement } from './render'
import { Component } from './component'

export interface VNode<P = any> {
  type: VNodeType
  props: P & DefaultProps
  key: Key
  _children: null | ComponentChild[]
  ref?: Ref<any> | null
  _isVNode: boolean
  _depth: number
  _el: any
  _self: VNode | null
  _parent: VNode | null
  _original: VNode | null
  _component?: any
  _nextDom?: SeedElement | null
}

type Key = string | number
type RefObject<T> = { current?: T | null }
type RefCallback<T> = (instance: T | null) => void
export type Ref<T> = RefObject<T> | RefCallback<T>
export type ComponentChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined

export type DefaultProps = Record<string, any> & {
  children: ComponentChild[]
  is?: any // webcomponent https://developer.mozilla.org/zh-CN/docs/Web/API/Document/createElement
  dangerouslySetInnerHTML?: {
    // html注入
    __html: string
  }
}

interface PropsType {
  [key: string]: any
}
type ComponentType = {
  new (): Component
  defaultProps: PropsType | null
}
type VNodeType = string | ComponentType | Symbol | Function
export const TEXT_NODE_TYPE = Symbol('text')
interface VNodeData {
  [key: string]: any
}

// 配置createElement时传入的data
interface VNodePropsOptions {
  key?: Key
  ref?: Ref<any>
  [key: string]: any
}

export function createVNode(
  type: VNodeType,
  vnodeData: VNodeData = {},
  key?: Key,
  ref?: Ref<any>,
  original?: VNode | null
): VNode {
  const vnode: VNode = {
    type,
    props: vnodeData,
    key: key as string,
    ref: ref,
    _children: null,
    _depth: 0,
    _el: null,
    _self: null,
    _parent: null,
    _isVNode: true,
    _original: original || null,
  }
  vnode._self = vnode
  return vnode
}

export function createTextVNode(text?: string | null) {
  const vnode: VNode = {
    type: TEXT_NODE_TYPE,
    props: text,
    key: '',
    _children: null,
    _depth: 0,
    _el: null,
    _self: null,
    _parent: null,
    _isVNode: true,
    _original: null,
  }
  vnode._self = vnode
  return vnode
}

export function createElement(
  type: VNodeType,
  data: VNodePropsOptions | null = {},
  children: ComponentChild[] | ComponentChild
) {
  let normalizedChildren: ComponentChild[] = []
  if (Array.isArray(children)) {
    normalizedChildren = children.slice()
  } else {
    normalizedChildren = [children]
  }
  if (arguments.length > 3) {
    for (let i = 3; i < arguments.length; i++) {
      normalizedChildren.push(arguments[i])
    }
  }
  // 解析非vnode类型的children
  for (let i = 0; i < normalizedChildren.length; i++) {
    const child = normalizedChildren[i]
    if (
      typeof child === 'string' ||
      typeof child === 'number' ||
      typeof child === 'boolean' ||
      child === null ||
      child === undefined ||
      (typeof child === 'object' && !(child as any)._isVNode)
    ) {
      normalizedChildren[i] = createTextVNode(
        child == null ? child : '' + child
      )
    }
  }
  // == 初始化vnodedata
  let normalizedProps = Object.create(null)
  if (data) {
    Object.keys(data).forEach((key) => {
      if (key !== 'key' && key !== 'ref') {
        normalizedProps[key] = data[key]
      }
    })
  }

  // 对组件类型含有defaultprops的，进行赋值
  if (
    typeof type === 'function' &&
    'defaultProps' in type &&
    type.defaultProps
  ) {
    for (let key in type.defaultProps) {
      if (normalizedProps[key] === void 0) {
        normalizedProps[key] = type.defaultProps[key]
      }
    }
  }
  normalizedProps.children = normalizedChildren
  return createVNode(type, normalizedProps, data?.key, data?.ref)
}

export function Fragment(props: any & { children: ComponentChild[] }) {
  return props.children
}
