import { createApp } from '../seed/createApp'
import { createVNode as h } from '../runtime/vnode'
import { KeepAlive } from '../runtime/comps/KeepAlive'
import { reactive } from '../reactivity/reactive'

const child1 = {
  name:'child1',
  setup() {
    return () => h('h1', null, 'child1111')
  },
}

const child2 = {
  name:'child2',
  setup() {
    return () => h('h1', null, 'child2222')
  },
}

const root = {
  setup() {
    const state = reactive({ show: false })
    return () => {
      return h('div', { style: { 'background-color': '#ccc' } }, [
        h(KeepAlive, null, [state.show ? h(child1) : h(child2)]),
        h(
          'button',
          {
            onclick() {
              state.show = !state.show
              // alert(state.show)
            },
          },
          'change'
        ),
      ])
    }
  },
}

createApp(root).mount(document.getElementById('app'))
