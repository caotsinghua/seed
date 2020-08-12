import { isArray } from 'util'

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

type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>() // target为key，存储依赖的map
// 函数,相当于watcher
export interface ReactiveEffect<T = any> {
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
let activeEffect: ReactiveEffect | undefined // 当前激活的effect/watcher
const trackStack: boolean[] = []
// target是一个原始对象
// 依赖收集
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
    // 当前key没有dep，初始化
    dep = new Set()
    depsMap.set(key, dep)
  }
  if (!dep.has(activeEffect)) {
    //   该值的依赖集合中没有当前激活的effect
    dep.add(activeEffect) // dep.push(watcher)
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

export const ITERATE_KEY = Symbol('iterate')
export const MAP_KEY_ITERATE_KEY = Symbol('map key iterate')

// 触发更新
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(targetMap)
  if (!depsMap) {
    // target没有收集过依赖，直接返回
    return
  }
  const effects = new Set<ReactiveEffect>()
  // 添加副作用
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach((effect) => effects.add(effect))
    }
  }

  if (type === TriggerOpTypes.CLEAR) {
    // 清除
    depsMap.forEach((dep) => {
      add(dep)
      // 对dep的set遍历，把当前target的所有key的dep中的effect都加入到effects中
    })
  } else if (key === 'length' && Array.isArray(target)) {
    // 修改数组长度
    depsMap.forEach((dep, key) => {
      // length的dep
      // 数组中>=新length的下标，即即将被删除的部分
      // 会触发更新
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // set,add,delete ，单个修改
    if (key !== undefined) {
      //
      add(depsMap.get(key)) // 先把相关的key的依赖加入到effects
    }
    // 再针对add/delete/map.set 处理
    // 添加或非数组的删除
    const isAddOrDelete =
      type === TriggerOpTypes.ADD ||
      (type === TriggerOpTypes.DELETE && !Array.isArray(target))

    // 任何类型的添加都会触发以下块
    if (
      isAddOrDelete ||
      (type === TriggerOpTypes.SET && target instanceof Map)
    ) {
      // 对象属性的删除，只能ITERATE_KEY
      // 添加：数组长度会改变，所以对length的依赖进行触发
      // map的设置属性，ITERATE_KEY
      add(depsMap.get(Array.isArray(target) ? 'length' : ITERATE_KEY))
    }
    // map类型的添加/删除
    if (isAddOrDelete && target instanceof Map) {
      add(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }
  const run = (effect: ReactiveEffect) => {
    if (__DEV__ && effect.options.onTrigger) {
      // debug 触发了更新
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        oldValue,
        newValue,
        oldTarget,
      })
    }
    if (effect.options.scheduler) {
      // 把effect加到队列？
      effect.options.scheduler(effect)
    } else {
      // 同步触发更新
      effect()
    }
  }

  effects.forEach((effect) => run(effect)) // 执行更新
}
