import {
  ComponentInternalInstance,
  ComponentInternalOptions,
} from './component'
import { ReactiveFlags, hasOwn } from 'packages/reactivity-v3/reactive'
import { track, TrackOpTypes } from 'packages/reactivity-v3/effects'

export interface ComponentRenderContext {
  [key: string]: any
  _: ComponentInternalInstance
}

const enum AccessTypes {
  SETUP,
  DATA,
  PROPS,
  CONTEXT,
  OTHER,
}

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get(target: ComponentRenderContext, key: string, receiver) {
    const { _: instance } = target
    const {
      ctx,
      setupState,
      data,
      props,
      accessCache,
      type,
      appContext,
    } = instance
    // let @vue/reactivity know it should never observe Vue public instances.
    if (key === ReactiveFlags.SKIP) {
      return true
    }
    // data / props / ctx
    // 开销最大的是hasOwn调用，因此使用accessCache缓存值
    let normalizedProps
    if (key[0] !== '$') {
      // key不是以$开头
      const n = accessCache![key]
      // 检查缓存值 和 设置类型
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.SETUP:
            return setupState[key]
          case AccessTypes.DATA:
            return data[key]
          case AccessTypes.CONTEXT:
            return ctx[key]
          case AccessTypes.PROPS:
            return props![key]
        }
      } else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
        accessCache![key] = AccessTypes.SETUP
        return setupState[key]
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache![key] = AccessTypes.DATA
        return data[key]
      } else if (
        (normalizedProps =
          normalizedPropsOptions(type)[0] && hasOwn(normalizedProps, key))
      ) {
        accessCache![key] = AccessTypes.PROPS
        return props![key]
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache![key] = AccessTypes.CONTEXT
        return ctx[key]
      } else if (!isInBeforeCreate) {
        accessCache![key] = AccessTypes.OTHER
      }
    }
    const publicGetter = publicPropertiesMap[key]
    let cssModule, globalProperties
    if (publicGetter) {
      if (key === '$attrs') {
        track(instance, TrackOpTypes.GET, key)
      }
      return publicGetter(instance)
    } else if (
      (cssModule = type.__cssModules) &&
      (cssModule = cssModule[key])
    ) {
      // css 模块？
      return cssModule
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      // 自定义属性？
      accessCache![key] = AccessTypes.CONTEXT
      return ctx[key]
    } else if (
      ((globalProperties = appContext.config.globalProperties),
      hasOwn(globalProperties, key))
    ) {
      return globalProperties[key]
    } else if (
      currentRenderingInstance &&
      (!(typeof key === 'string') || key.indexOf('__v') !== 0)
    ) {
      if (data !== EMPTY_OBJ && key[0] === '$' && hasOwn(data, key)) {
        console.error('该值通过$data访问，因为该值没有代理到render context')
      } else {
        console.warn('该值', key, '在render的时候使用了，但是没有这个值')
      }
    }
  },
  set(target: ComponentRenderContext, key: string, value: any) {
    const { _: instance } = target
    const { data, setupState, ctx } = instance
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      setupState[key] = value
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value
    } else if (key in instance.props) {
      console.warn('props的值是只读的')
      return false
    }
    if (key[0] === '$' && key.slice(1) in instance) {
      console.warn('attempting to mutate public property ')
      return false
    } else {
      if (key in instance.appContext.config.globalProperties) {
        Object.defineProperty(ctx, key, {
          value,
          enumerable: true,
          configurable: true,
        })
      } else {
        ctx[key] = value
      }
    }
    return true
  },
  has(target: ComponentRenderContext, key: string) {
    const { _: instance } = target
    const { data, setupState, accessCache, ctx, type, appContext } = instance
    let normalizedProps = {}
    return (
      accessCache![key] !== undefined ||
      (data !== EMPTY_OBJ && hasOwn(data, key)) ||
      (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
      (normalizedProps =
        normalizedPropsOptions(type)[0] && hasOwn(normalizedProps, key))
    )
  },
  ownKeys(target){
      console.error("避免直接在组件实例遍历属性")
      return Reflect.ownKeys(target)
  }
}
