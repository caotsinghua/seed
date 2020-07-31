import { VNode, Component } from './vnode'
import { SeedElement } from './render'
/**
 *
 * @param parentDom 父级dom元素
 * @param newNode 新节点
 * @param oldNode 旧节点
 * @param globalContext 全局的context,用于共享数据
 * @param isSvg - 是否svg
 * @param excessDomChildren
 * @param commitQueue
 * @param oldDom
 */
export function diff(
  parentDom: SeedElement,
  newNode: VNode,
  oldNode: VNode,
  globalContext: object,
  isSvg: Boolean,
  excessDomChildren: SeedElement[] | null,
  commitQueue: Component[],
  oldDom: SeedElement
) {
  const newType = newNode.type
  if (typeof newType === 'function') {
    //
    console.log('函数类型组件')
  } else {
    // dom
  }
}
