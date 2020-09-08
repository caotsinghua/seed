import { ComponentInstance } from './component'
import { VNode, ShapeFlags, normalizeVNode, VNodeChildAtom } from './vnode'

export function initSlots(instance: ComponentInstance, children: VNodeChildAtom[]) {
  instance.slots = {}
  if (children) {
    normalizeVNodeSlots(instance, children)
  }
}

function normalizeVNodeSlots(instance: ComponentInstance, children: VNodeChildAtom[]) {
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}

function normalizeSlotValue(value: unknown): VNode[] {
  return Array.isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChildAtom)]
}

export function updateSlots(instance: ComponentInstance, children: VNodeChildAtom[]){
    normalizeVNodeSlots(instance,children)
}