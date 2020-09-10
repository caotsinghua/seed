function initHashChangeHandler(handler) {
  // 页面加载完成不会触发hashchange，需要主动触发
  window.addEventListener('DOMContentLoaded', handler)
  window.addEventListener('hashchange', handler)
}
initHashChangeHandler(hashChangeHandler)

function hashChangeHandler(e) {
  console.log('-- hash改变 --')
  console.log(location)
  let hash = location.hash.substr(1)

  const routerMap = {
    '/home': 'Home',
    '/about': 'About',
  }
  render(routerMap[hash])
}

function render(component) {
  const container = document.getElementById('app')
  if (container) {
    console.log('渲染', component)
    if (window[component]) {
      container.innerHTML = window[component]()
    } else {
      container.innerHTML = '<h1>404</h1>'
    }
  }
}

window.Home = function () {
  return `
        <div>
            <h1>Home Page</h1>
        </div>
    `
}

window.About = function () {
  return `
        <div>
            <h1>About Page</h1>
        </div>
    `
}

document.getElementById('btn').onclick = function () {
  window.location.hash = '#/asd'
}
