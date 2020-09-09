import { VNode } from './vnode'
import { ComponentInstance } from './component'

export interface ObjectDirective<T = any> {
  beforeMount?: DirectiveHook<T>
  mounted?: DirectiveHook<T>
  beforeUpdate?: DirectiveHook<T>
  updated?: DirectiveHook<T>
  beforeUnmount?: DirectiveHook<T>
  unmounted?: DirectiveHook<T>
}

export type DirectiveHook<T = any> = (
  el: T,
  binding: any,
  vnode: VNode,
  prevVNode: VNode | null
) => void
export type DirectiveArguments = [
  ObjectDirective,
  any,
  string,
  Record<string, boolean>
]
let currentRenderingInstance: any = null

// 给vnode应用指令
// 这个方法只能在 render的时候调用
export function withDirectives(vnode: VNode, directives: DirectiveArguments[]) {
  const internalInstance = currentRenderingInstance
  //   const instance = internalInstance.proxy
  console.debug('当前渲染实例', internalInstance)
  const bindings = vnode.dirs || (vnode.dirs = []) // 保留原有的dirs
  for (let i = 0; i < directives.length; i++) {
    let [dir, value, args, modifiers = {}] = directives[i]
    // 初始化的时候会使用value，更新的处理？
    bindings.push({
      dir,
      value,
      oldValue: undefined,
      args,
      modifiers,
    })
  }
  console.log(vnode)
  return vnode
}
// 执行hook
export function invokeDirectiveHook(
  vnode: VNode,
  prevVNode: VNode | null,
  instance: ComponentInstance | null,
  name: keyof ObjectDirective
) {
  const bindings = vnode.dirs
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i]
    const hook = binding.dir[name]
    if (hook) {
      console.debug('--- 执行directive hook --')
      hook(vnode.el, binding, vnode, prevVNode)
    }
  }
}
