import { ReactiveFlags, hasOwn } from './reactive'

const arrayInstrumentations: Record<string, Function> = Object.create(null)

;['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
  arrayInstrumentations[key] = function () {}
})

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key) => (Symbol as any)[key])
    .filter((val) => typeof val === 'symbol')
)

// 创建proxy的get陷阱
function createGetter(isReadonly: boolean, shallow = false) {
  // 陷阱触发器
  return function get(target: object, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 获取是否是reactive的，取决于使用的isReadonly是否为false
      return !isReadonly
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    // 如果为了获取原始值，且触发get的对象就是绑定的proxy
    if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? (target as any)[ReactiveFlags.READONLY]
          : (target as any)[ReactiveFlags.REACTIVE])
    ) {
      return target
    }

    const targetIsArray = Array.isArray(target)
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      // 获取数组的查询函数
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)
    // 如果key是内置的symbol，或者key是__proto__,或key是__v_isref,返回原始结果
    // TODO:意义不明
    if (
      isSymbol(key)
        ? builtInSymbols.has(key)
        : key === '__proto__' || key === '__v_isRef'
    ) {
      return res
    }

    if(!isReadonly){
        // 不是只读的get
        // track
    }
  }
}

function isSymbol(v: any) {
  return typeof v === 'symbol'
}
