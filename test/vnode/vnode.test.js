import { createElement as h } from '../../packages/vdom/vnode'
test('create vnode', () => {
  const node1 = h('div', { id: 'foo' }, 'Hello!')
  // <div id="foo">Hello!</div>

  const node2 = h('div', { id: 'foo' }, 'Hello', null, ['Preact!'])
  // <div id="foo">Hello Preact!</div>

  const node3 = h('div', { id: 'foo' }, h('span', null, 'Hello!'))
  console.log(node1, node2, node3)
})
