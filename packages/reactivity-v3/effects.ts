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
  raw: () => T
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
