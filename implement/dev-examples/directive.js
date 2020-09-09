import { createApp } from '../seed/createApp'
import { createVNode as h } from '../runtime/vnode'
import { withDirectives } from '../runtime/directives'

const root = {
  setup() {
    return () => {
      const inputNode = withDirectives(
        h(
          'input',
          {
            value: 123,
            type: 'text',
          },
          null
        ),
        [
          [
            {
              beforeMount(el, binding, vnode, prenode) {
                console.log('组件即将挂载', {
                  el,
                  binding,
                  vnode,
                  prenode,
                })
              },
              mounted(el, binding, vnode, prenode) {
                console.log('组件已经挂载', {
                  el,
                  binding,
                  vnode,
                  prenode,
                })
                // alert(11)
                el.focus()
              },
            },
            'valiueee',
            'name',
            { lazy: true },
          ],
        ]
      )

      return h('div', null, [inputNode])
    }
  },
}

const app = createApp(root)
app.mount(document.getElementById('app'))
