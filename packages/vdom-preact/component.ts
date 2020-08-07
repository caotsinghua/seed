// compoennt实现

import { DefaultProps, Fragment, VNode } from './vnode'
import { SeedElement } from './render'
import { diff, getDomSibling } from './diff'

export class Component<P = any> {
  props: P & DefaultProps
  context: object
  state: any
  _nextState: any
  _force: boolean = false // 是否强制更新
  _vnode?: VNode
  _el?: SeedElement
  _parentDom?: SeedElement
  _dirty?: boolean // ?更新
  constructor(props: P & DefaultProps, context?: object) {
    this.props = props
    this.context = context || {}
  }

  setState(
    update: object | ((s: object, p: object) => object),
    callback: () => void
  ) {
    let s
    if (this._nextState != null && this._nextState !== this.state) {
      //   下一个状态和当前状态不一样
      s = this._nextState
    } else {
      s = this.state
    }
    // 每次的s都是当前的最新状态
    if (typeof update === 'function') {
      // 更新方法
      update = update(s, this.props)
    }
    Object.assign(s, update)

    if (update == null) return // 返回空，不进行更新
    if (this._vnode) {
      if (callback) {
        // 状态更新后，调用callback
        this._renderCallbacks.push(callback)
      }
      // 加入到更新队列
      enqueueRender(this)
    }
  }

  //   强制更新
  forceUpdate(callback) {
    if (this._vnode) {
      this._force = true
      if (callback) {
        this._renderCallbacks.push(callback)
      }
      enqueueRender(this)
    }
  }

  render(props: P & DefaultProps) {
    return Fragment(props)
  }
}

function renderComponent(component: Component) {
  let vnode = component._vnode
  let oldDom: SeedElement | null = null
  let parentDom: SeedElement | null = null
  oldDom = vnode?._el
  parentDom = component._parentDom || null
  if (parentDom) {
    let commitQueue = []
    const oldNode = Object.assign({}, vnode) // 新旧vnode的值一样
    oldNode._original = oldNode // ？
    let newDom = diff(
      parentDom,
      vnode,
      oldNode,
      component._globalContext,
      (parentDom as SVGElement).ownerSVGElement !== undefined,
      null,
      commitQueue,
      oldDom == null ? getDomSibling(vnode as VNode) : oldDom
    )
    commitRoot(commitQueue, vnode)
    if (newDom != oldDom) {
      updateParentDomPointers(vnode)
    }
  }
}
// vnode d parent的绑定dom，是其children的第一个挂载的dom
function updateParentDomPointers(vnode: VNode): any {
  let parent = vnode._parent
  if (parent != null && parent._component != null) {
    parent._el = parent._component.base = null
    const parentChildren = parent._children || []
    for (let i = 0; i < parentChildren.length; i++) {
      let child: VNode = parentChildren[i] as VNode
      if (child != null && child._el != null) {
        parent._el = parent._component.base = child
        break
      }
    }
    return updateParentDomPointers(parent)
  }
}
const defer = Promise.prototype.then.bind(Promise.resolve())
let reRenderQueue: any[] = []

let prevDebounce:any

function enqueueRender(c: Component) {
  if (
    !c._dirty &&
    (c._dirty = true) &&
    reRenderQueue.push(c) &&
    !process._rerenderCount++
  ) {
    ;(prevDebounce || defer)(process)
  }
}

function process() {
  let queue
  //   防止不必要的更新
  //   处理中的长度 和 渲染长度
  while ((process._rerenderCount = reRenderQueue.length)) {
    queue = reRenderQueue.sort((a, b) => a._vnode._depth - b._vnode._depth) // 从上往下更新
    reRenderQueue = [] // 清空
    queue.some((c) => {
      if (c._dirty) {
        // 更新
        renderComponent(c)
      }
    })
  }
}
process._rerenderCount = 0
