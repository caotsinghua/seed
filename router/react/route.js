const { Component, createContext } = React
const RouteContext = createContext({
  path: '',
  onPopState: () => {
    console.log(11)
  },
})

class BrowserRouter extends Component {
  constructor(props) {
    super(props)

    window.addEventListener('popstate', this.onPopState)
    this.state = {
      path: '',
    }
  }
  componentDidMount() {
    this.onPopState({})
  }

  onPopState = (e) => {
    console.log('-- pop state --', e)
    console.log(location.pathname)
    this.setState({
      path: location.pathname,
    })
  }

  render() {
    const { path } = this.state
    return (
      <RouteContext.Provider value={{ path, onPopState: this.onPopState }}>
        {this.props.children}
      </RouteContext.Provider>
    )
  }
}

class Route extends Component {
  static contextType = RouteContext
  mapComponent() {
    const { path, component: Component } = this.props

    const { path: curPath } = this.context
    console.log('当前路径', curPath)
    if (path === curPath) {
      return <Component />
    } else {
      // 不匹配
      return null
    }
  }
  render() {
    return this.mapComponent()
  }
}

class Link extends Component {
  static contextType = RouteContext
  handleTo = (e) => {
    e.preventDefault()
    const { onPopState } = this.context
    const { to } = this.props
    if (to === undefined) {
      console.warn('link的to不能为空')
      return
    }
    history.pushState({}, '', to)
    onPopState({})
  }
  render() {
    return (
      <a href="" onClick={this.handleTo}>
        {this.props.children}
      </a>
    )
  }
}

function Home() {
  return (
    <div>
      <h1>home page</h1>
    </div>
  )
}

function About() {
  return (
    <div>
      <h1>About</h1>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Link to="/home">Home</Link>
      <Link to="/about">About</Link>
      <Route path="/home" component={Home} />
      <Route path="/about" component={About} />
    </BrowserRouter>
  )
}
ReactDOM.render(<App />, document.getElementById('app'))
