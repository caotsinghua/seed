export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate',
}

type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>() // target为key，存储依赖的map
// 函数,相当于watcher
interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  id: number
  active: boolean
  raw: () => T // 函数本身
  deps: Dep[]
  options: ReactiveEffectOptions
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: (job: ReactiveEffect) => void
  onTrack?: (event: any) => void
  onTrigger?: (event: any) => void
  onStop?: () => void
}

let shouldTrack = true
let activeEffect: ReactiveEffect | undefined
const trackStack: boolean[] = []

export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (!shouldTrack || activeEffect === undefined) {
    // 不收集依赖 or 没有激活的effect
    return
  }

  let depsMap = targetMap.get(target) // 该target的依赖集合

  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key) // 获取值的桶
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  if (!dep.has(activeEffect)) {
    //   该值的依赖集合中没有当前激活的effect
    dep.add(activeEffect)
    activeEffect.deps.push(dep) // 相当于原来的Dep.target.deps.push(dep)
    // 开发环境，触发onTrack
    // 即，在触发依赖收集的时候，触发ontrack方法
    if (__DEV__ && activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key,
      })
    }
  }
}

// === === 创建effect
// fn是依赖收集的get
// option是一些配置
export function effect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions = {}
) {
  if (isEffect(fn)) {
    fn = fn.raw
  }
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect() // 非computed，先立刻执行一次，收集依赖
  }
  return effect
}

let uid = 0
const effectStack: ReactiveEffect[] = []
function createReactiveEffect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions
): ReactiveEffect<T> {
  const effect = function reactiveEffect(): unknown {
    // 此处意义不明？
    if (!effect.active) {
      // active = false
      // 停止侦听的时候，如果有scheduler，不执行，否则直接执行fn，即getter
      return options.scheduler ? undefined : fn()
    }
    if (!effectStack.includes(effect)) {
      cleanup(effect) // 解除所有绑定
      try {
        enableTraking() // 开始依赖收集
        effectStack.push(effect) // 避免
        activeEffect = effect
        return fn() // 重新收集依赖
      } finally {
        // 依赖收集结束
        effectStack.pop()
        resetTraking() // 重置
        activeEffect = effectStack[effectStack.length - 1] // activeEffect=最后一个effect
      }
    }
  } as ReactiveEffect

  // 赋值属性
  effect.id = uid++
  effect._isEffect = true
  effect.active = true
  effect.raw = fn // fn
  effect.deps = []
  effect.options = options
  return effect
}

function cleanup(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps && deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect) // 解除dep和effect的绑定
    }
  }
  deps.length = 0
}

// 允许收集当前effect的依赖
function enableTraking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

// 重置收集依赖的锁
function resetTraking() {
  let last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

// ==== utils====
function isEffect(fn: any): fn is ReactiveEffect {
  return fn && fn._isEffect === true
}

// 停止触发更新
function stop(effect: ReactiveEffect) {
  if (effect.active) {
    cleanup(effect)
    if (effect.options.onStop) {
      // 触发停止侦听的函数
      effect.options.onStop()
    }
    effect.active = false
  }
}
