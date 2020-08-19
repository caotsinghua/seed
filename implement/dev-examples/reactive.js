import { reactive, ReactiveFlags } from '../reactivity/reactive'
import { effect } from '../reactivity/effect'

console.log(1)
const observed = reactive({
  name: 'name',
  user: {
    username: '名字',
    age: 12,
  },
})

console.log(observed)
console.log('原始值', observed[ReactiveFlags.RAW])
let times = 0
function getter() {
  console.log('---- getter start ---', times++)
  let k = observed.user.username

  console.log('---getter end')
}

effect(getter, {})

setTimeout(()=>{
    console.log(" --- 手动更新 ---")
    // observed.name = 12
    observed.user.username=12
},1000)
