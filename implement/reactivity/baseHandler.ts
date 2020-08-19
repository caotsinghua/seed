import { ReactiveFlags, Target, reactive } from './reactive'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './effect'

// 1. 对于一些ReactiveFlag的值的返回
// 2. 对于数字的查询,如includes,indexof ,lastindexof是否需要track
// 3. 对于__proto__,__v_isRef等属性,不该触发track
// 4. 对于readonly的对象,不该track,直接返回值
// 5. 对深度监听的对象,需要进一步reactive / readonly,而浅层的直接返回值即可
// 6. 对非对象的值,不需要深层监听了
// 7. 在getter的时候决定对值进行reactive,而不是一开始就深度遍历,可以避免循环引用
// a = { self:a}
function createGetter(isReadonly: boolean = false, shallow: boolean = false) {
  return function get(target: object, key: string, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? (target as Target)[ReactiveFlags.READONLY]
          : (target as Target)[ReactiveFlags.REACTIVE])
    ) {
      // 只有在代理对象本身获取raw时,才会返回target
      return target
    }
    // 对数组的inlcudes,indexof,lastindexof监听 ?
    const res = Reflect.get(target, key, receiver)
    if (key === '__proto__' || key === '__v_isRef') {
      // 获取原型 / 判断是否ref时,不做监听
      return res
    }
    if (!isReadonly) {
      // todo track
      // console.warn('监听 track', key)
      track(target, key, TrackOpTypes.GET)
    }
    // 如果是浅层监听,可以直接返回
    if (shallow) {
      return res
    }
    // 不是浅层响应式,那么对获取到的值进行进一步的响应化
    if (typeof res === 'object') {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? res : reactive(res)
    }
    // 如果是深层响应,但只是普通值,则直接返回值
    return res
  }
}

function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string,
    value: unknown,
    receiver: object
  ): boolean {
    let oldVal = target[key]
    if (!shallow) {
      // 如果旧的值是ref,直接改变ref.value触发更新,不需要再重复触发refKey的更新
      // 这里没有ref，先不做处理
    } else {
      // 如果是浅层监听,第二层以后的对象,不会走到这里
      // 一旦走到这里,一定是第一层
    }

    let result = Reflect.set(target, key, value, receiver)
    if (result) {
      let hadKey = (target as Object).hasOwnProperty(key)
      if (hadKey) {
        // update
        console.debug('trigger update', key)
        trigger(target, key, TriggerOpTypes.SET, value)
      } else {
        // add
        console.debug('trigger add key', key)
        trigger(target, key, TriggerOpTypes.ADD, value)
      }
    }

    return result
  }
}

const get = createGetter()
const set = createSetter()

function deleteProperty(target: object, key: string): boolean {
  let hadKey = (target as Object).hasOwnProperty(key)
  let result = Reflect.deleteProperty(target, key)
  if (hadKey && result) {
    //   delete
    console.debug('trigger delete', key)
    trigger(target, key, TriggerOpTypes.DELETE,undefined)
  }
  return result
}

// 使用has,也会track更新
function has(target: object, key: string): boolean {
  let result = Reflect.has(target, key)
  if (typeof key !== 'symbol') {
    //   track
    console.debug('通过has进行track', key)
    track(target, key, TrackOpTypes.HAS)
  }
  return result
}
// 获取ownkeys,
// keys,getPropertyNames,getPropertySymbols,assign
// 对iteratekey监听?
function ownKeys(target: object) {
  console.debug('通过ownKeys进行track', target)
  return Reflect.ownKeys(target)
}

export const mutableHandler: ProxyHandler<any> = {
  get,
  set,
  deleteProperty,
  ownKeys,
  has,
}
