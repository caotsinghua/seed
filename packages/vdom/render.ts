import { VNode, createElement, Fragment } from './vnode'
import { mount } from './mount'
import { diff } from './diff'
export type SeedElement = HTMLElement & SVGElement & { _children?: VNode }
const GLOBAL_CONTEXT = {}
function render(vnode: VNode, parentDom: SeedElement) {
  const oldNode = parentDom._children
  vnode = createElement(Fragment, null, [vnode])

  const commitQueue: any[] = [] // 更新队列,暂时不管
  parentDom._children = vnode
  diff(
    parentDom,
    vnode,
    oldNode || ({} as any),
    GLOBAL_CONTEXT,
    parentDom.ownerSVGElement !== undefined,
    null,
    commitQueue,
    {} as any
  )
  //   flush queue effects
}
