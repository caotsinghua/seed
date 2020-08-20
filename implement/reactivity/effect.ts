export function effect(fn: () => any, options: ReactiveEffectOptions = {}) {
  if (isEffect(fn as ReactiveEffect)) {
    fn = (fn as ReactiveEffect).raw
  }
  // -- create effect
  const result = createReactiveEffect(fn, options)
  if (!result.options.lazy) {
    result()
  }
  return result
}

const targetMap = new WeakMap<object, DepsMap>()
type DepsMap = Map<string, Dep>
type Dep = Set<ReactiveEffect>

// 依赖收集
export function track(target: object, key: string, type: TrackOpTypes) {
  if (!shouldTrack || activeEffect == null) {
    // 无法进行依赖收集
    return
  }

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  // --- 初始化完毕 ---

  // 添加依赖
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    console.log(` ----- track ---- ${target}.${key}  `)
  }
}
// 触发更新
export function trigger(
  target: object,
  key: string,
  type: TriggerOpTypes,
  newVal: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return // 没有什么可更新的

  const effects = new Set<ReactiveEffect>()
  function add(effectsToAdd: Dep | undefined) {
    if (effectsToAdd) {
      effectsToAdd.forEach((ef) => {
        effects.add(ef)
      })
    }
  }

  const isArray = Array.isArray(target)
  if (key === 'length' && isArray) {
    depsMap.forEach((dep, index) => {
      if (index >= newVal || index === 'length') {
        add(dep)
      }
    })
  }
  // clear/set/add/delete
  else {
    if (key != undefined) {
      add(depsMap.get(key))
      if (
        isArray &&
        (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) &&
        Number.isInteger(((key as unknown) as number) - 0)
      ) {
        // 数组的长度会随之发生变化
        add(depsMap.get('length'))
      }
    }
  }

  effects.forEach((effect) => {
    if (effect.options.scheduler) {
      console.log('异步执行trigger', effect)
      effect.options.scheduler(effect)
    } else {
      console.log('同步执行trigger', effect)
      effect()
    }
  })
}

export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate',
}

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
}
export interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  active: boolean
  id: number
  raw: () => T
  deps: Dep[]
  options: ReactiveEffectOptions
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: (effecg: ReactiveEffect) => void
}

let uid = 0
const effectStack = []
let activeEffect: ReactiveEffect | null = null
function createReactiveEffect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions
) {
  console.log('创建effect')
  const result: ReactiveEffect<T> = function reactiveEffect(): T {
    console.log('--- --- effect run start ---')
    if (!result.active) {
      // 该effect已经stop
      console.log('--- --- effect run end -inactive --- ')
      return fn()
    }

    // 一个render，依赖了两个值，当a触发更新时，b变化，此时不需要再次更新
    if (effectStack.includes(result)) {
      console.warn('当前effect已经在更新中', result)
    }

    try {
      console.log('开始收集依赖，当前具有的依赖', result.deps)
      // 每次收集依赖前，先把上次收集的全部清理叼
      cleanup(result)
      enableTracking()
      effectStack.push(result)
      activeEffect = result
      // 收集依赖
      return fn()
    } finally {
      effectStack.pop()
      resetTraking()
      activeEffect = effectStack[effectStack.length - 1]
      console.log('--- --- effect run end --- ')
    }
  }
  result._isEffect = true
  result.id = uid++
  result.raw = fn
  result.deps = []
  result.options = {}
  result.active = true
  result.options = options
  return result
}

function cleanup(effect: ReactiveEffect) {
  let deps = effect.deps
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      let dep = deps[i]
      dep.delete(effect)
    }
    deps.length = 0
    // 清楚deps和dep
  }
}

let shouldTrack = true
let trackStack: boolean[] = []

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTraking() {
  let last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function pauseTraking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

//  ----- ----- utils
function isEffect(effect: ReactiveEffect) {
  return !!effect._isEffect
}
