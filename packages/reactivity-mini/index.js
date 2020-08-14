const target = {
  meal: 'tacos',
}

const proxy = new Proxy(target, {
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    let result= Reflect.set(target, key, value, receiver)
    if (oldValue !== value) {
      trigger(target, key, oldValue, value)
    }

    return result
  },
})

let activeEffect

const KeyToDeps = new Map()
function track(target, key) {
  if (!activeEffect) {
    console.log('没有activeEffect')
    return
  }
  console.log('track')
  let dep = KeyToDeps.get(key)
  if (!dep) {
    KeyToDeps.set(key, (dep = new Set()))
  }
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
function trigger(target, key, oldValue, newValue) {
  console.log('trigger',key,newValue)
  let effects = []
  let dep = KeyToDeps.get(key)
  if (dep) {
    dep.forEach((effect) => effects.push(effect))
  }
  effects.forEach((effect) => {
    // 执行更新
    effect()
  })
}

function createEffect(getter, options) {
  const effect = function () {
    cleanup(effect)
    try {
      activeEffect = effect
      return getter() // 取值&依赖收集
    } finally {
      activeEffect = undefined
    }
  }
  effect.deps=[]
  return effect
}

function cleanup(effect) {
    effect.deps.forEach(dep=>{
        dep.delete(effect)
    })
    effect.deps=[]
}

function watch(getter, options) {
    let effect = createEffect(getter,options)
    let val = effect()
    return val
}

// ==test
function getter(){
    console.log("==开始取值==")
    console.log('meal:', proxy.meal)
    console.log("==取值结束==")
}

watch(getter)

setTimeout(()=>{
    proxy.meal="hanburger"
},2000)