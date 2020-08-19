import { Component } from '../runtime/component'
import { render } from '../runtime/render'
import { createVNode } from '../runtime/vnode'

export interface App<HostElement = HTMLElement> {
  _container: HostElement | null
  _component: Component | null
  _context: AppContext
  mount(container: HostElement): void
  unmount(): void
}

export interface AppContext {
  app: App | null
}
export function createAppContext(): AppContext {
  return {
    app: null,
  }
}
export function createApp(
  rootComponent: Component,
  rootProps?: Record<string, any>
): App {
  const context: AppContext = createAppContext()
  let isMounted = false
  const app: App = {
    _component: rootComponent,
    _container: null,
    _context: context,
    mount(container) {
      if (!isMounted) {
        const vnode = rootComponent.__isVNode
          ? rootComponent
          : createVNode(rootComponent, rootProps)
        vnode.appContext = context
        console.log("root node",vnode)
        render(vnode, container)
        isMounted = true
        app._container = container
      }
    },
    unmount() {
      //   卸载
      if (isMounted) {
        console.log('卸载app')
        render(null, app._container)
        app._container = null
        isMounted = false
      }
    },
  }
  context.app = app
  return app
}
