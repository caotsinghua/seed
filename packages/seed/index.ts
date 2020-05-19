import { noop, isPlainObject, isUndefined } from '../utils'
import {
  Watcher,
  ExpOrFunc,
  WatcherOptions,
  WatchGetter,
} from '../reactivity/watcher'
import {
  observe,
  defineReactive,
  toggleObserver,
  shouldObserve,
} from '../reactivity'
import { Dep } from '../reactivity/dep'

///////////////////////////////////////
// 能够引起视图更新的
// props，data，
// computed中引用的值
//
//////////////////////////////////////
interface Options {
  data?: (vm: Seed) => Object
  methods?: Record<string, Function>
  props?: Props
  propsData?: PropsData
  // watch?:Object,
  computed?: ComputedOption
}
interface ComputedOption {
  [key: string]: {
    get: WatchGetter
    set?: (val: any) => void
  }
}

interface Props {
  [key: string]: {
    default?: () => any
  }
}
type PropsData = Record<string, any>

let uid = 0
export class Seed {
  isVm: boolean
  _uid: number
  _options: Options // 原始配置
  $options: Options = {} // 序列化后配置
  _watchers: Watcher[] = []
  _computedWatchers: Map<string, Watcher> = new Map()
  _data: Record<string, any> = {}
  _props: Props = {};
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

    if (this.$options.props) {
      this._initProps(this.$options.props)
    }
    if (this.$options.methods) {
      this._initMethods(this.$options.methods)
    }

    // init state
    this._watchers = []
    if (this.$options.data) {
      this._initData(this.$options.data)
    }
    if (this.$options.computed) {
      this._initComputed(this.$options.computed)
    }
  }

  private _initMethods(methods: Record<string, Function>) {
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

  private _initData(data: Function) {
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
    observe(_data)
  }
  // TODO:
  // 监听props的key的值是否变更
  // 深度监听prop的值本身
  // props的值从propsData中来
  // 每次render产生新的propsData，
  private _initProps(props: Props) {
    const _props = (this._props = {}) // key:propsData[key]
    const propsData = this.$options.propsData || {}

    const propKeys = Object.keys(props)
    toggleObserver(false)
    for (let i = 0, l = propKeys.length; i < l; i++) {
      let key = propKeys[i]
      let value
      if (!isUndefined(propsData[key])) {
        value = propsData[key] // 触发propsData[key]的getter，添加当前watcher
      } else if (typeof props[key].default === 'function') {
        value = (props[key].default as Function)()
      }
      let prevState = shouldObserve
      toggleObserver(true)
      observe(value)
      toggleObserver(prevState)
      // 这里不再observe
      defineReactive(_props, key, value)
      if (!(key in this)) {
        proxy(this, '_props', key) // this.key = this._props.key
      }
    }
    toggleObserver(true)
  }

  private _initComputed(computed: ComputedOption) {
    const watchers = this._computedWatchers
    const keys = Object.keys(computed)
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      const userDef = computed[key]
      const getter = userDef.get
      watchers.set(
        key,
        new Watcher(this, getter, {
          handler: noop,
          lazy: true,
        })
      )
      if (!(key in this)) {
        // 劫持get
        Object.defineProperty(this, key, {
          enumerable: true,
          configurable: true,
          get() {
            const watcher:
              | Watcher
              | undefined = (this as Seed)._computedWatchers.get(key)
            if (watcher) {
              watcher.evaluate() // 惰性求值
              if (Dep.target) {
                watcher.depend() // 收集依赖
              }
              return watcher.value
            }
          },
          set: userDef.set || noop,
        })
      }
    }
  }

  //   创建watch的时候会直接进行依赖收集
  $watch(expOrFunction: ExpOrFunc, options: WatcherOptions) {
    options.userDefined = true
    const watcher = new Watcher(this, expOrFunction, options)
    // return unwatch
    return function unwatch() {
      watcher.teardown()
    }
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
