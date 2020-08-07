import { type } from 'os'

function createNode(type, props, key, origin) {
  const node = {
    type,
    props,
    key,
    _origin: origin,
  }
  if (origin == null) {
    node._origin = node
  }
  return node
}

export function createElement(type, data, children) {
  const props = Object.create(null)
  if (data) {
    for (let key in data) {
      if (key !== 'key' && key !== 'ref') {
        props[key] = data[key]
      }
    }
  }
  props.children = children
  return createNode(type, props, data && data.key)
}

export function Fragment(props) {
  return props.children
}

function render(vnode, parentDom) {
  const oldNode = parentDom._children
  vnode = createElement(Fragment, null, [vnode])
  parentDom._children = vnode
  diff(parentDom, vnode, oldNode || {})
}

export function diff(parentDom, newNode, oldNode) {
  const newType = newNode.type
  if (typeof newType === 'function') {
    const component = {}
    component.constructor = newType
    component.render = function (props) {
      return this.constructor(props)
    }

    let renderResult = component.render(newNode.props)
    const isTopFragment =
      renderResult != null &&
      renderResult.type === Fragment &&
      renderResult.key == null
    renderResult = isTopFragment ? renderResult.props.children : renderResult
    //
    console.log('component 子节点', renderResult)
    diffChildren(
      parentDom,
      Array.isArray(renderResult) ? renderResult : [renderResult],
      newNode,
      oldNode
    )
  } else {
    //   普通元素
  }
}

function diffChildren(parentDom, renderResult, newParentNode, oldParentNode) {
  const oldChildren = oldParentNode._children || []
  const oldChildrenLen = oldChildren.length
  newParentNode._children = [] // init
  for (let i = 0; i < renderResult.length; i++) {
    let childNode = renderResult[i]

    if (childNode == null || typeof childNode === 'boolean') {
      childNode = newParentNode._children[i] = null
    } else if (typeof childNode === 'string' || typeof childNode === 'number') {
      //   text
      childNode = newParentNode._children[i] = createNode(
        null,
        childNode,
        null,
        childNode
      )
    } else if (Array.isArray(childNode)) {
      childNode = newParentNode._children[i] = createNode(
        Fragment,
        {
          children: childNode,
        },
        null,
        null
      )
    } else if (childNode._dom != null) {
      // 已经挂载
      childNode = newParentNode._children[i] = createNode(
        childNode.type,
        childNode.props,
        childNode.key,
        childNode._origin
      )
    } else {
      childNode = newParentNode._children[i] = childNode
    }

    if (childNode == null) {
      continue
    }

    childNode._parent = newParentNode
    childNode._depth = (newParentNode._depth || 0) + 1

    // 找对应位置的old child
  }
}
