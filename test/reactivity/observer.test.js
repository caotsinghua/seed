const { observe } = require('../../packages/reactivity/index')
const { Seed } = require('../../packages/seed')
// test('test observe', () => {
//   const vm = new Seed()
//   const data = {
//     a: 'a',
//     bObj: {
//       b: 'b',
//       b2: 123,
//     },
//   }
//   observe(data)
//   function getA() {
//     return data.a
//   }
//   vm.$watch(getA, {
//     handler() {
//       expect(data.a).toBe(12)
//     },
//   })
//   data.a = 12
// })

// test('test observe object', () => {
//   const vm = new Seed()
//   const data = {
//     a: 'a',
//     bObj: {
//       b: 'b',
//       b2: 123,
//     },
//   }
//   observe(data)
//   function getb() {
//     //   使用两次
//     data.bObj.b
//     data.bObj.b
//   }
//   vm.$watch(getb, {
//     handler() {
//       console.log('触发更新')
//     },
//   })
//   expect(data.bObj.__ob__.dep.subs.length).toBe(1)
//   //   data.bObj.b = 12
// })

// test('observe的值嵌套多层', () => {
//   const vm = new Seed()
//   const data = {
//     obj1: {
//       'obj1-1': {
//         value: 12,
//       },
//     },
//   }
//   observe(data)
//   let updateTimes = 0
//   function getter() {
//     //   使用两次
//     // 由于链式触发，每个元素的get都会触发
//     return data['obj1']
//     //   会触发几次依赖收集？
//   }
//   vm.$watch(getter, {
//     handler() {
//       console.log('触发更新', ++updateTimes) // 更新后重新收集依赖？
//     },
//   })
//   //   console.log(getDepSubs(data.obj1))
//   //   console.log(getDepSubs(data.obj1['obj1-1']))
//   //   expect(data.obj1.__ob__.dep.subs.length).toBe(1)
//   data['obj1'] = {
//     'obj1-2': {
//       value: 1,
//     },
//   }
//   //   console.log(data['obj1']['obj1-2'].__ob__.dep)
//   expect(data['obj1']).toEqual({
//     'obj1-2': {
//       value: 1,
//     },
//   })
//   expect(updateTimes).toBe(1)
//   data['obj1']['obj1-2'] = {} // 浅层依赖收集，不触发更新

//   //   //   重新设置值为对象，该对象的dep也应该有原来值的watch，当变化的时候应该触发同一个更新
//   expect(updateTimes).toBe(1)
// })

test('observe的值嵌套多层2', () => {
  const vm = new Seed()
  const data = {
    obj1: {
      'obj1-1': {
        value: 12,
      },
    },
  }
  observe(data)
  let updateTimes = 0
  function getter() {
    //   使用两次
    // 由于链式触发，每个元素的get都会触发
    return data['obj1']
    //   会触发几次依赖收集？
  }
  vm.$watch(getter, {
    handler() {
      console.log('触发更新', ++updateTimes) // 更新后重新收集依赖？
    },
    deep: true,
  })
  //   console.log(getDepSubs(data.obj1))
  //   console.log(getDepSubs(data.obj1['obj1-1']))
  //   expect(data.obj1.__ob__.dep.subs.length).toBe(1)
  data['obj1'] = {
    'obj1-2': {
      value: 1,
    },
  }
  //   console.log(data['obj1']['obj1-2'].__ob__.dep)
  expect(data['obj1']).toEqual({
    'obj1-2': {
      value: 1,
    },
  })
  expect(updateTimes).toBe(1)
  data['obj1']['obj1-2'] = {} // 深度依赖收集，触发更新

  // 重新设置值为对象，该对象的dep也应该有原来值的watch，当变化的时候应该触发同一个更新
  expect(updateTimes).toBe(2)
})

function getDepSubs(obj) {
  return obj.__ob__.dep.subs
}
