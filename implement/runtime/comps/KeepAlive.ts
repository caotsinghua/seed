import { cloneVNode, VNode, ShapeFlags } from '../vnode'
import { getCurrentInstance } from '../component'
import consola from 'consola/src/browser'

const KeepAliveImpl = {
  name: 'KeepAlive',
  //   __isKeepAlive: true,
  setup(props, setupContext) {
    console.log(setupContext)
    const cache = new Map()
    const instance = getCurrentInstance()
    return () => {
      console.debug('keepalive render')
      const { slots } = setupContext

      if (!slots.default) {
        return null
      }

      const children = slots.default()
      let vnode = children[0] as VNode
      if (children.length > 1) {
        console.log('keepalive只能有一个child')
        return children
      }

      const key = vnode.key ? vnode.key : vnode.type
      const cachedVNode = cache.get(key)
      consola.warn('--- 使用缓存的node', cachedVNode)
      if (vnode.el) {
        vnode = cloneVNode(vnode)
      }
      cache.set(key, vnode)

      if (cachedVNode) {
        vnode.el = cachedVNode.el
        vnode.component = cachedVNode.component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
      } else {
      }
     
        vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      return vnode
    }
  },
}

export const KeepAlive = KeepAliveImpl
