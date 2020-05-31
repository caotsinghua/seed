interface VNode {
  type: VNodeType
  key?: string
  data: VNodeData
  children: VNode[]
  _isVNode: boolean
  _depth: number
  _el: any
  _self: VNode | null
  _parent: VNode | null
}

class Component {
  static defaultProps: PropsType | null = null
}

interface PropsType {
  [key: string]: any
}
type ComponentType = {
  new (): Component
  defaultProps: PropsType | null
}
type VNodeType = string | ComponentType

interface VNodeData {
  [key: string]: any
}
function createVNode(
  type: VNodeType,
  vnodeData: VNodeData = {},
  children: VNode[],
  key?: string
): VNode {
  const vnode: VNode = {
    type,
    data: vnodeData,
    key,
    children,
    _depth: 0,
    _el: null,
    _self: null,
    _parent: null,
    _isVNode: true,
  }
  vnode._self = vnode
  return vnode
}

function createElement(
  type: VNodeType,
  data: VNodeData = {},
  children: VNode[]
) {
  let normalizedProps = Object.create(null)
  let normalizedChildren = children.slice()
  Object.keys(data).forEach((key) => {
    if (key !== 'key' && key !== 'ref') {
      normalizedProps[key] = data[key]
    }
  })
  if (arguments.length > 3) {
    for (let i = 3; i < arguments.length; i++) {
      normalizedChildren.push(arguments[i])
    }
  }

  if (typeof type === 'function' && type.defaultProps != null) {
    for (let key in type.defaultProps) {
      normalizedProps[key] = type.defaultProps[key]
    }
  }
  return createVNode(
    type,
    normalizedProps,
    normalizedChildren,
    data.key || undefined
  )
}
