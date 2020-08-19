import { createApp } from '../seed/createApp'
import { createVNode } from '../runtime/vnode'
// const rootNode = createVNode('h1', null, createVNode('span', null, '测试挂载'))
const rootComponent = {
  setup(props, context) {
    console.log({
      props,
      context,
    })
    return function () {
      console.log('render 方法')
    }
  },
}
const app = createApp(rootComponent, null)
console.log(app)

app.mount(document.getElementById('app'))
