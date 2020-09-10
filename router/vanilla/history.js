const links = [
  {
    name: 'Home',
    path: '/home',
  },
  {
    name: 'About',
    path: '/about',
  },
  {
    name: 'Other',
    path: '/other',
  },
]
const root = document.getElementById('root')
links.forEach((item) => {
  let aEl = document.createElement('a')
  aEl.href = item.path
  aEl.textContent = item.name
  root.appendChild(aEl)
  aEl.addEventListener('click', function (e) {
    e.preventDefault()
    history.pushState({}, '', item.path)
    onPopStateChange({ state: {} })
  })
})

const historyLenSpan = document.createElement('p')
historyLenSpan.textContent = 'historyLen:' + history.length
root.appendChild(historyLenSpan)
setInterval(() => {
    historyLenSpan.textContent = 'historyLen:' + history.length
}, 100);

const container = document.createElement('div')
container.style.border = '1px solid'
root.appendChild(container)

window.Home = () => {
  return `
        <div>
            <h1>Home Page</h1>
        </div>
    `
}
window.About = () => {
  return `
        <div>
            <h1>About Page</h1>
        </div>
    `
}

const routeMap = {
  '/home': window.Home,
  '/about': window.About,
}

window.addEventListener('popstate', onPopStateChange)
function onPopStateChange(e) {
  console.log(e)
  const path = location.pathname
  const component = routeMap[path]
  if(component){
      container.innerHTML = component()
  }else{
      container.innerHTML=`<h1>404</h1>`
  }
}
