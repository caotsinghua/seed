const { createApp, onMounted, getCurrentInstance, reactive } = Vue

const Home = {
  template: `
        <div>
            <h1>Home page</h1>
        </div>
    `,
}

const About = {
  template: `
        <div>
            <h1>About page</h1>
        </div>
    `,
}

const root = {
  template: `
    <div>
        <h1>root</h1>
        <RouterLink to="/home">home</RouterLink>
        <RouterLink to="/about">about</RouterLink>
        <RouterView/>
    </div>
    `,
  mounted() {
    //   console.log()
    const { routerContext } = this.$.appContext.provides
    console.log(routerContext)
    console.log('app mount,触发popstate')
    routerContext.onPopStateChange({})
  },
}
const RouterView = {
  template: `
  <div style="border:1px solid">
    <h1>router-view</h1>
    <component :is="renderComponent"/>
  </div>
  `,
  components: {
    Home,
    About,
  },
  inject: ['routerContext'],
  computed: {
    renderComponent() {
      const path = this.routerContext.routerState.path
      const routes = {
        '/home': Home,
        '/about': About,
      }
      const component = routes[path]
      return component
    },
  },
  methods: {
    onPopChange(state) {
      this.routerContext.onPopStateChange(state)
    },
  },
  mounted() {
    console.log(this.routerContext)
  },
}

const RouterLink = {
  template: `
    <a href="" @click.prevent="handleTo">
        <slot></slot>
    </a>
    `,
  props: {
    to: String,
  },
  inject: ['routerContext'],
  methods: {
    handleTo() {
      const path = this.to
      history.pushState({}, '', path)
      this.routerContext.onPopStateChange({})
    },
  },
}

const routerState = reactive({
  path: '',
})

// 触发路由改变
function onPopStateChange(e) {
  console.log('-- pop state chage', e)
  routerState.path = location.pathname
}

const app = createApp(root)
app.provide('routerContext', {
  routerState,
  onPopStateChange,
})

app.component('RouterView', RouterView)
app.component('RouterLink', RouterLink)
app.mount('#app')
