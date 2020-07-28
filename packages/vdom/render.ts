import { VNode, createElement, Fragment } from './vnode'

function render(
  vnode: VNode,
  parentDom: HTMLElement & { _children?: VNode[] }
) {
  const oldNode = parentDom._children
  vnode = createElement(Fragment, null, [vnode])

  if (!oldNode) {
    if (vnode) {
      // mount
      
    }
  } else {
    if (vnode) {
      // diff
    } else {
      // remove
      parentDom.removeChild(prevNode._el)
      parentDom._vnode = undefined
    }
  }
}
