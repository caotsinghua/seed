import { Watcher } from './watcher'
let uid = 0
// 一个属性 or 对象，只有一个dep
export class Dep {
  public static target: Watcher | null
  _uid: number
  subs: Watcher[]
  key:any
  constructor(key?:any) {
    this._uid = uid++
    this.subs = []
    this.key=key
  }

  addSub(sub: Watcher) {
    this.subs.push(sub)
  }
  removeSub(sub: Watcher) {
    let findIndex = this.subs.findIndex((item) => item === sub)
    if (findIndex > -1) {
      this.subs.splice(findIndex, 1)
    }
  }
  // 收集依赖
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  // 触发更新
  notify() {
    console.log('notify了',this.subs.length)
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

Dep.target = null

export function pushTarget(target: Watcher) {
  Dep.target = target
}

export function popTarget() {
  Dep.target = null
}
