import {createElement,Fragment,diff} from './vnode'
test('node',()=>{
    const node1= createElement('p',null,'测试')
    // console.log(node1)
})

test('fragment',()=>{
    const node = createElement(Fragment,null,[
        createElement('p',null,'p1'),
        createElement('h1',null,'h1')
    ])
    // console.log(node)
    const root = document.createElement('div')
    root.id='root'

    diff(root,node,{})
})
