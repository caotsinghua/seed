import { ComponentInstance } from './component'
import { normalizeVNode } from './vnode'

export function renderComponentRoot(instance: ComponentInstance) {
  console.log(' === render component root', instance.render)
  const render = instance.render
  //   TODO:暂不考虑render的参数
  let result = normalizeVNode(render(instance))
  return result
}
