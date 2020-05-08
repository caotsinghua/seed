import { Observer } from "."

// 劫持数组的操作
const arrayPrototype = Array.prototype
export const arrayMethods = Object.create(arrayPrototype)

type Operate =
  | 'push'
  | 'pop'
  | 'shift'
  | 'unshift'
  | 'splice'
  | 'sort'
  | 'reverse'
const methodsToPatch: Operate[] = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
]

methodsToPatch.forEach(function (operate) {
  const origin:Function = arrayPrototype[operate]
  function mutator(...args:any[]){
    const result=origin.apply(this,args)
    const ob:Observer=this.__ob__;
    let inserted;
    switch(operate){
        case 'push':
        case 'unshift':
            inserted=args;
            break;
        case 'splice':
            inserted=args.splice(2)
            break;
    }
    // 如果存在插入的值，则对这个值进行观测
    if(inserted){
        ob.observeArray(inserted)
    }
    // 不管调用数组的哪个操作，都会触发原数组的notify
    ob.dep.notify()
    return result;
  }
  Object.defineProperty(arrayMethods,operate,{
      enumerable:false,
      writable:true,
      configurable:true,
      value:mutator
  })
})
