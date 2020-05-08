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

// test('observe的值嵌套多层2', () => {
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
//     return data['obj1'] // 由于是deep，每次notify后，再次触发getter来收集依赖，并且对对象也会再次收集。
//     // deps=[0]
//     //   会触发几次依赖收集？
//   }
//   vm.$watch(getter, {
//     handler() {
//       console.log('触发更新', ++updateTimes) // 更新后重新收集依赖？
//     },
//     deep: true,
//   })
//   //   console.log(getDepSubs(data.obj1))
//   //   console.log(getDepSubs(data.obj1['obj1-1']))
//   //   expect(data.obj1.__ob__.dep.subs.length).toBe(1)
//   // 这里正常触发更新，是obj1的dep触发。
//   // 由于重新赋值，对值对象进行observe并给childOb，再更新后getter时，childOb就是新值。
//   // obj1.deps=[0,0]
//   // obj1-2.deps=[0]
//   // value.deps=[0]
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
//   // 对obj1-2赋值
//   // 触发obj1-2.deps,notify一次，再次依赖收集
//   // obj1.deps=[0,0,0]
//   // obj1-2.deps=[0,0]

//   data['obj1']['obj1-2'] = {} // 深度依赖收集，触发更新

//   // 重新设置值为对象，该对象的dep也应该有原来值的watch，当变化的时候应该触发同一个更新
//   expect(updateTimes).toBe(2)
//   // 这里再次赋值
//   // notify两次，要再进行两次依赖收集
//   // obj1.deps=[0,0,0,0,0]
//   // obj1-2.deps=[0,0,0,0]
//   data['obj1']['obj1-2']=1;
//   expect(updateTimes).toBe(4)
// })

function getDepSubs(obj) {
  return obj.__ob__.dep.subs
}

test('重复依赖收集',()=>{
  const data={
    a:1
  }
  observe(data)
  const vm=new Seed()
  function getter(){
    return data.a;
  }
  let times=0;
  vm.$watch(getter,{
    handler:function(newVal,oldVal){
      console.log("触发更新",newVal,oldVal,++times)
    }
  })
  data.a=2;
  // 只有一个dep，notify后，dep[0,0]，调用回调时只有一个原来的
  expect(times).toBe(1);
  // 这里由于原来deps有两个watcher，调用两个notyfy，之后deps=[0,0,0,0]
  data.a=3;
  expect(times).toBe(2);
})
