import {createApp} from '../seed/createApp'
import {createVNode} from '../runtime/vnode'
const rootNode = createVNode('h1',null,'测试挂载')
const app = createApp(rootNode,null)
console.log(app)

app.mount(document.getElementById('app'))