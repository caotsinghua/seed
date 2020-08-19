import { createApp } from '../seed/createApp'
import { createVNode } from '../runtime/vnode'
import { reactive } from '../reactivity/reactive'
// const rootNode = createVNode('h1', null, createVNode('span', null, '测试挂载'))
// const rootComponent = {
//   setup(props, context) {
//     console.log({
//       props,
//       context,
//     })
//     return function () {
//       console.log('render 方法')
//     }
//   },
// }
// const app = createApp(rootComponent, null)
// console.log(app)

let state = null
const rootComponent = {
  setup() {
    state = reactive({
      name: 'test name',
    })

    return function render() {
      const node = createVNode('div', null, [
        createVNode('h1', null, state.name),
      ])
      return node
    }
  },
}

const app = createApp(rootComponent, null)
app.mount(document.getElementById('app'))
app._container.onclick = () => {
  console.log(111)
  console.log(state)
  state.name='test2'
}
