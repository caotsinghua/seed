import { createApp } from '../seed/createApp'
import { createVNode } from '../runtime/vnode'
import { onBeforeMount, onMounted } from '../runtime/apiLifecycle'
const rootComp = {
  setup() {
    onBeforeMount(() => {
      console.log('实现hook,beforemount,rootComponent')
    })
    onMounted(()=>{
        console.log("parent 挂载完成")
    })
  },
  render() {
    return createVNode('h1', null, [
      createVNode(
        {
          setup() {
            onBeforeMount(() => {
              console.log('实现 onBeforeMount,child component')
            })
            onMounted(()=>{
                console.log("child 挂载完成")
            })
            return () => {
              return createVNode('h2', null, 'child')
            }
          },
        },
        null,
        null
      ),
    ])
  },
}

const app = createApp(rootComp, null)

app.mount(document.getElementById('app'))
