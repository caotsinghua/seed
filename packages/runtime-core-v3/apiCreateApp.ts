import { ComponentOptions, PublicAPIComponent, Data } from './component'
import { Directive } from './directives'
import { RootRenderFunction } from './renderer'
import { RootHydrateFunction } from './hydration'
import { type } from 'os'

const version = 'dev.0.0'

export interface App<HostElement = any> {
  version: string
  config: AppConfig
  use(plugin: Plugin, ...options: any[]): this
  mixin(mixin: ComponentOptions): this
  component(name: string): PublicAPIComponent | undefined // 获取组件
  component(name: string, component: PublicAPIComponent): this // 注册组件
  directive(name: string): Directive | undefined // 获取指令
  directive(name: string, directive: Directive): this
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean
  ): ComponentPublicInstance // 挂载
  unmount(rootContainer: HostElement | string): void
  provide<T>(key: string, value: T): this
  //   ==一些内部的属性，但是需要暴露给ssr和devtool
  _component: Component // 这是哪个组件？
  _props: Data | null // 这是哪个props？
  _container: HostElement | null
  _context: AppContext
}

export type OptionMergeFunction = (
  to: unknown,
  from: unknown,
  instance: any,
  key: string
) => any

export interface AppConfig {
  // 检查原生tag？
  readonly isNativeTag?: (tag: string) => boolean

  performance: boolean
  optionMergeStrategies: Record<string, OptionMergeFunction>
  globalProperties: Record<string, any> // 在实例中使用的全局属性
  isCustomElement: (tag: string) => boolean
  errorHandler?: (err: unknown, instance: unknown | null, info: string) => void
  warnHandler?: (msg: string, instance: unknown | null, trace: string) => void
}

export interface AppContext {
  app: App // app实例本身
  config: AppConfig // 配置
  mixins: ComponentOptions[] // 混入的一些配置
  components: Record<string, PublicAPIComponent> // 内部注册组件
  directives: Record<string, Directive> // 内部注册指令
  provides: Record<string | symbol, any> // 内部依赖注入的东西
  reload?: () => void // HMR
}

// 创建app实例的的上下文
export function createAppContext(): AppContext {
  return {
    app: null as any,
    config: {
      isNativeTag: () => false,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      isCustomElement: () => false,
      errorHandler: undefined,
      warnHandler: undefined,
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
  }
}

export type CreateAppFunction<HostElement> = (
  rootComponent: PublicAPIComponent,
  rootProps?: Data | null
) => App<HostElement>

export function createAppApi<HostElement>(
  render: RootRenderFunction, // 渲染器
  hydrate?: RootHydrateFunction
): CreateAppFunction<HostElement> {
  // 以根组件创建app，rootprops为传入根组件的props
  //   单纯的创建app实例对象而已
  return function createApp(rootComponent, rootProps = null): App<HostElement> {
    if (
      rootProps != null &&
      Object.prototype.toString.call(rootProps) !== '[object Object]'
    ) {
      rootProps = null
    }

    const context = createAppContext()
    const installedPlugins = new Set() // 安装的插件
    let isMounted = false
    const app: App = (context.app = {
      version,
      _component: rootComponent as Component,
      _props: rootProps,
      _container: null, // 尚未挂载
      _context: context,

      get config() {
        return context.config
      },
      set config(v) {
        console.log('无法赋值config')
      },
      use(plugin: Plugin, ...options: any[]) {
        // 使用插件
        if (installedPlugins.has(plugin)) {
          console.warn('不能重复添加插件', plugin)
        } else if (plugin && typeof plugin.install === 'function') {
          installedPlugins.add(plugin)
          plugin.install(app, ...options)
        } else if (typeof plugin === 'function') {
          installedPlugins.add(plugin)
          plugin(app, ...options)
        } else {
          console.warn('插件必须是函数或含有install的对象')
        }
        return app
      },
      mixin(mixin: ComponentOptions): any {
        if (!context.mixins.includes(mixin)) {
          context.mixins.push(mixin)
        }
        return app
      },
      component(name: string, component?: PublicAPIComponent): any {
        if (!component) {
          return context.components[name]
        }
        if (context.components[name]) {
          // 已经注册过
          console.warn(name, '已经注册过组件')
        }
        context.components[name] = component
        return app
      },
      directive(name: string, directive?: Directive): any {
        if (!directive) {
          return context.directives[name]
        }
        if (context.directives[name]) {
          console.warn('已经注册过指令', name)
        }
        context.directives[name] = directive
        return app
      },
      mount(rootContainer: HostElement, isHydrate?: boolean): any {
        if (!isMounted) {
          const vnode = createVnode(rootComponent, rootProps) // 根node
          vnode.appContext = context // app上下文绑定到node
          if (__DEV__) {
            context.reload = () => {
              render(cloneVNode(vnode), rootContainer) // 热更新
            }
          }
          if (isHydrate && hydrate) {
            //    吸水
            hydrate(vnode, rootContainer)
          } else {
            //    普通渲染
            render(vnode, rootContainer)
          }
          isMounted = true
          app._container = rootContainer
          ;(rootContainer as any).__vue_app__ = app
          return vnode.component!.proxy // 返回一个代理？
        }
      },
      unmount(): any {
        if (isMounted) {
          render(null, app._container)
        }
      },
      provide(key, value): any {
        if (key in context.provides) {
          console.warn('已经provide了', key)
        }
        context.provides[key as string] = value
        return app
      },
    })
    return app
  }
}
