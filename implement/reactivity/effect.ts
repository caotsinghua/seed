export function effect() {}

// 依赖收集
export function track() {}
// 触发更新
export function trigger() {}

export interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  active: boolean
  id: number
  raw: () => T
  deps: Dep[]
  options: object
}

export interface Dep {}

let uid = 0
const effectStack = []
let activeEffect: ReactiveEffect | null = null
function createReactiveEffect<T = any>(fn: () => T) {
  const result: ReactiveEffect<T> = function reactiveEffect(): T {
    if (!result.active) {
      return fn()
    }
    
  }
  result._isEffect = true

  result.id = uid++
  result.raw = fn
  result.deps = []
  result.options = {}
  result.active = true
  return result
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
