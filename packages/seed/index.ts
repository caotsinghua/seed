import { noop, isPlainObject } from '../utils'
import { Watcher, ExpOrFunc, WatcherOptions } from '../reactivity/watcher'

interface Options {
  data?: (vm: Seed) => Object
  methods?: Record<string, Function>
  // watch?:Object,
  // computed?:Object,
  // props?:Object
}
let uid = 0
export class Seed {
  isVm: boolean
  _uid: number
  _options: Options
  $options?: Options
  _watchers: Watcher[] = [];
  [key: string]: any

  constructor(options: Options) {
    this.isVm = true
    this._uid = uid++
    this._options = options
    this._init()
  }

  private normalizeOptions() {
    this.$options = this._options || {} // parsed
  }

  private _init() {
    this.normalizeOptions()
    this._initMethods()
    // init state
    this._watchers = []
    this._initData()
  }

  private _initMethods() {
    const { methods } = this.$options as Options
    if (methods) {
      if (!isPlainObject(methods)) {
        console.warn('methods不是普通对象')
        return
      }
      for (let key in methods) {
        // warn
        if (typeof methods[key] !== 'function') {
          console.warn(`methods ${key} 不是一个方法`)
        }

        if (typeof methods[key] === 'function') {
          this[key] = methods[key].bind(this)
        } else {
          this[key] = noop
        }
      }
    }
  }

  private _initData() {
    const { data } = this.$options as Options
    if (data) {
      if (typeof data !== 'function') {
        console.warn('data 必须是一个函数')
        return
      }
      // get data object
      const _data = data.call(this, this) || {}
      this._data = _data

      Object.keys(_data).forEach((key) => {
        if (key in this) {
          console.warn(`${key} in data 已经定义过`)
        }
        proxy(this, '_data', key)
      })
      //   对_data进行observe
    }
  }
  //   创建watch的时候会直接进行依赖收集
  $watch(expOrFunction: ExpOrFunc, options: WatcherOptions) {
    options.userDefined = true
    const watcher = new Watcher(this, expOrFunction, options)
    // return unwatch
  }
}

const sharedPropertyDefinition: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  get: noop,
  set: noop,
}

function proxy(target: Object, source: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return (this as any)[source][key]
  }
  sharedPropertyDefinition.set = function proxySetter(val: any) {
    ;(this as any)[source][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
