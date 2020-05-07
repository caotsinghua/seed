/** 类型判定*/
export function isPlainObject(o: any) {
  return typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype
}

export function isObject(o:any){
  return Object.prototype.toString.call(o) === '[object Object]'
}

export function isWindow(o: any) {
  return o != null && o === o.window
}

export function isNumber(o: any) {
  return o - o >= 0
}

export function isFunction(o: any) {
  return Object.prototype.toString.call(o) === '[object Function]'
}

export function isUndefined(o: any) {
  return o === void 0
}

export function isNull(o: any) {
  return o === null
}

export function isDate(o: any) {
  return (
    Object.prototype.toString.call(o) === '[object Date]' &&
    o.toString() !== 'Invalid Date' &&
    !isNaN(o)
  )
}

export function isArray(o: any) {
  return Array.isArray(o)
}

export function isNotANumber(o:any){
  return o!==o;
}
