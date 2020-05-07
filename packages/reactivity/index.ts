import { isArray, isObject, isNotANumber } from '../utils'
import { Dep } from './dep'

export class Observer {
  value?: any
  dep: Dep
  constructor(value: Object | Array<any>) {
    this.dep = new Dep()
    // 对象
    if (isArray(value)) {
      // 监听数组
    } else {
      // 监听对象
      this.walk(value)
    }
    // __ob__不能被枚举
    // ;(value as any).__ob__ = this
    Object.defineProperty(value, '__ob__', {
      enumerable: false,
      configurable: true,
      value: this,
      writable: true,
    })
  }

  walk(obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
}

export function observe(obj: Object) {
  if (!isObject(obj) && !isArray(obj)) {
    return
  }
  let ob: Observer | null = null

  if (obj.hasOwnProperty('__ob__') && (obj as any).__ob__ instanceof Observer) {
    ob = (obj as any).__ob__
  } else {
    ob = new Observer(obj)
  }

  return ob
}

export function defineReactive(
  obj: Record<string, any>,
  key: string,
  shallow: boolean = false
) {
  const dep = new Dep(key)
  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key)
  if (propertyDescriptor && !propertyDescriptor.configurable) {
    return
  }

  let value = obj[key] // 初始值

  // 如果value时对象类型，对该对象进行observe(shallow=true)
  //   则对该属性监听的handler，也适用于子对象
  //   {a:{ aa:{ bb:1 } }}
  let childOb = !shallow && observe(value)

  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get: function reactiveGetter() {
    //   console.log('==触发get==', key, val)
      if (Dep.target) {
        //   add watcher to deps
        dep.depend() // 值的dep
        // childOb
        if (childOb) {
          childOb.dep.depend()
          console.log("监听子元素",value)
          console.log('childOb', childOb.dep)
          // 数组，另外处理
        }
      }
      return value
    },
    set: function reactiveSetter(newVal: any) {
      if (value === newVal || (isNotANumber(value) && isNotANumber(newVal))) {
        return
      }
      value = newVal

      // 新的值也是对象 && ！shallow ，深层监听
      childOb = !shallow && observe(value)
      dep.notify()
    },
  })
}
