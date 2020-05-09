import { Seed } from '../seed'
import { noop, isObject } from '../utils'
import { pushTarget, popTarget, Dep } from './dep'
import { isArray } from 'util'
import { Observer } from '.'
import { queueWatcher } from './scheduler'
export type WatchGetter = (vm: Seed) => any
export type ExpOrFunc = string | WatchGetter
export interface WatcherOptions {
  handler: Function
  userDefined?: boolean
  deep?: boolean
  sync?: boolean
  before?: Function
  lazy?: boolean
}

let uid = 0
// 一个watcher代表着某些依赖属性变化后要触发的动作
export class Watcher {
  _uid: number
  value: any
  getter: WatchGetter
  vm: Seed
  deep: boolean = false
  userDefined: boolean = false
  sync: boolean = false
  before: Function = noop
  lazy: boolean = false
  dirty: boolean = false
  handler: Function = noop
  // 避免重复依赖收集
  newDepIds: Set<number> = new Set()
  newDeps: Dep[] = []
  depIds: Set<number> = new Set()
  deps: Dep[] = []
  active: boolean = true

  constructor(vm: Seed, expOrFunc: ExpOrFunc, options: WatcherOptions) {
    this._uid = uid++
    this.vm = vm
    this.vm._watchers.push(this)

    if (typeof expOrFunc === 'function') {
      this.getter = expOrFunc
    } else {
      this.getter = parsePathToGetter(expOrFunc)
    }

    this.deep = !!options.deep
    this.userDefined = !!options.userDefined
    this.sync = !!options.sync
    this.dirty = this.lazy = !!options.lazy
    if (typeof options.before === 'function') {
      this.before = options.before
    }

    const { handler } = options
    if (typeof handler === 'function') {
      this.handler = handler
    }
    //  == init end
    this.value = this.get()
  }
  //   1.设置target 2. 触发依赖收集 & 获取值 3. 移除target
  get() {
    pushTarget(this)
    let value
    try {
      value = this.getter.call(this.vm, this.vm)
    } catch (e) {
      throw e
    } finally {
      if (this.deep) {
        // 深度依赖收集
        tranverse(value)
      }
      popTarget()
      // 一次依赖收集完成
      this.cleanDeps()
    }

    return value
  }

  evaluate() {
    if (this.dirty) {
      this.value = this.get() // 获取最新的值
      this.dirty = false // 缓存，只有当值变化的时候才重新获取值，否则还是使用缓存。
    }
  }

  addDep(dep: Dep) {
    //   get name:2 ,添加2次该watcher，则更新时update2次?
    // dep.addSub(this)
    // console.log(
    //   'watcher add Dep',
    //   dep.subs.map((w) => w._uid)
    // )
    const depId = dep._uid

    if (!this.newDepIds.has(depId)) {
      // 避免一次依赖收集中收集多个值
      this.newDepIds.add(depId)
      this.newDeps.push(dep)
      // 避免多次收集时重复
      if (!this.depIds.has(depId)) {
        dep.addSub(this) // 添加watcher
      }
    }
  }
  // 去除不需要监听dep的watcher，
  // 设置上一次收集的依赖deps
  // 清空newdeps
  cleanDeps() {
    let deps = this.deps
    for (let i = 0; i < deps.length; i++) {
      if (!this.newDepIds.has(deps[i]._uid)) {
        // 这个值不再监听
        deps[i].removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    let tmp2 = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp2
    this.newDeps.length = 0 // clear
  }

  update() {
    // getter中的值触发了set
    if (this.lazy) {
      // 下一次成功惰性evaluate
      this.dirty = true
    } else if (this.sync) {
      // 同步
      // 触发回调
      this.run()
    } else {
      // 添加到异步队列，下个tick触发
      queueWatcher(this)
    }
  }
  // 同步更新
  run() {
    if (this.active) {
      let newValue = this.get() // 值发生变化后，重新收集一遍该依赖
      console.log(
        'need update?',
        { newValue, value: this.value },
        newValue !== this.value ||
          isObject(newValue) ||
          isArray(newValue) ||
          this.deep
      )
      if (
        newValue !== this.value ||
        isObject(newValue) ||
        isArray(newValue) ||
        this.deep
      ) {
        const oldValue = this.value
        this.value = newValue
        // 值发生变化，调用回调
        this.handler.call(this.vm, newValue, oldValue)
      }
    }
  }

  // 使该watcher失效
  teardown() {
    if (this.active) {
      // todo:从vm.watchers中删除当前watcher
      for (let i = 0, l = this.deps.length; i < l; i++) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
  depend() {
    for (let i = 0, l = this.deps.length; i < l; i++) {
      // 当触发computed的值的get的时候，对于computed里用到的每个值的dep进行依赖收集
      this.deps[i].depend()
    }
  }
}

function parsePathToGetter(exp: string): WatchGetter {
  const pathArr = exp.split('.')
  return function (obj: any) {
    for (let i = 0; i < pathArr.length; i++) {
      if (!obj) return
      obj = obj[pathArr[i]]
    }
    return obj
  }
}

// === tranverse
const seenSet = new Set<number>()
interface ObservedValue {
  __ob__?: Observer
  [key: string]: any
}
function tranverse(value: ObservedValue) {
  _tranverse(value, seenSet)
  seenSet.clear()
}
function _tranverse(value: ObservedValue, seen: Set<number>) {
  if (
    !value ||
    (!isArray(value) && !(typeof value === 'object')) ||
    Object.isFrozen(value)
  ) {
    return
  }
  if (value.__ob__) {
    // 这个值被observe
    const depId = value.__ob__.dep._uid
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  //   colletc dep
  if (isArray(value)) {
    let val: any[] = value
    for (let i = 0; i < val.length; i++) {
      _tranverse(val[i], seen)
    }
  } else {
    let keys = Object.keys(value)
    for (let i = 0; i < keys.length; i++) {
      _tranverse(value[keys[i]], seen)
    }
  }
}
