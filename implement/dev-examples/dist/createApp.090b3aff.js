// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../runtime/vnode.ts":[function(require,module,exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ShapeFlags;

(function (ShapeFlags) {
  ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
  ShapeFlags[ShapeFlags["FUNCTIONAL_COMPONENT"] = 2] = "FUNCTIONAL_COMPONENT";
  ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 4] = "STATEFUL_COMPONENT";
  ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 8] = "TEXT_CHILDREN";
  ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 16] = "ARRAY_CHILDREN";
  ShapeFlags[ShapeFlags["COMPONENT"] = 6] = "COMPONENT";
})(ShapeFlags = exports.ShapeFlags || (exports.ShapeFlags = {}));

exports.Fragment = Symbol('Fragment');
exports.Text = Symbol('Text');
exports.Comment = Symbol('Comment');
exports.Static = Symbol('Static');

exports.createVNode = function (type, props, children) {
  if (props === void 0) {
    props = null;
  }

  if (children === void 0) {
    children = null;
  }

  var vnode = {
    __isVNode: true,
    type: type,
    props: props,
    children: children,
    key: null,
    ref: null,
    shapeFlag: 0,
    component: null,
    el: null
  };
  return vnode;
}; // 对即将挂载的node进行处理


function normalizeVNode(node) {
  if (node == null || typeof node === 'boolean') {
    // 创建空的注释节点
    return exports.createVNode(exports.Comment);
  } else if (Array.isArray(node)) {
    return exports.createVNode(exports.Fragment, null, node);
  } else if (_typeof(node) === 'object') {
    // 已经是vnode,这是最多的情况
    if (node.el == null) {
      // 没有挂载过
      return node;
    } else {
      // 已经挂载过
      return cloneVNode(node);
    }
  } else {
    //   其余情况都作为文本处理
    return exports.createVNode(exports.Text, null, String(node));
  }
}

exports.normalizeVNode = normalizeVNode;

function cloneVNode(vnode, extraProps) {
  return {
    __isVNode: true,
    type: vnode.type,
    props: vnode.props,
    children: vnode.children,
    key: vnode.key,
    ref: vnode.ref,
    shapeFlag: vnode.shapeFlag,
    component: vnode.component,
    el: vnode.el
  };
}

exports.cloneVNode = cloneVNode;
},{}],"../runtime/render.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var vnode_1 = require("./vnode");

var rendererOptions = {
  nextSibling: function nextSibling(node) {
    var el = node;
    return el.nextSibling;
  },
  //   暂不支持is ,web-component
  createElement: function createElement(tag, isSVG, is) {
    if (isSVG === void 0) {
      isSVG = false;
    }

    var el;

    if (isSVG) {
      el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    } else {
      el = document.createElement(tag);
    }

    return el;
  },
  setElementText: function setElementText(el, text) {
    ;
    el.innerText = text;
  },
  insert: function insert(el, container, anchor) {
    if (anchor == null) {
      ;
      container.appendChild(el);
    } else {
      ;
      container.insertBefore(el, anchor);
    }
  }
};

function render(vnode, container) {
  if (vnode) {
    //
    patch(container._vnode || null, vnode, container);
  } else {
    // 卸载
    if (container._vnode) {
      unmount(container._vnode);
    }
  }

  container._vnode = vnode;
}

exports.render = render;

function patch(oldNode, newNode, container, anchor, // 插入节点
isSVG) {
  if (anchor === void 0) {
    anchor = null;
  }

  if (isSVG === void 0) {
    isSVG = false;
  }

  if (oldNode && !isSameNodeType(oldNode, newNode)) {
    anchor = getNextAnchor(oldNode);
    unmount(oldNode);
    oldNode = null;
  }

  var type = newNode.type,
      shapeFlag = newNode.shapeFlag; //   先筛选type

  switch (type) {
    case vnode_1.Text:
      console.log('处理text');
      break;

    case vnode_1.Comment:
      console.log('处理注释');
      break;

    case vnode_1.Static:
      console.log('处理静态节点');
      break;

    case vnode_1.Fragment:
      console.log('处理fragment');
      break;

    default:
      // 处理element和component
      if (shapeFlag & vnode_1.ShapeFlags.ELEMENT) {
        console.log('处理element patch');
        processElement(oldNode, newNode, container, anchor, isSVG);
      } else if (shapeFlag & vnode_1.ShapeFlags.COMPONENT) {
        console.log('处理component patch');
        processComponent(oldNode, newNode, container, anchor, isSVG);
      }

  }
}

exports.patch = patch;

function processElement(oldNode, newNode, container, anchor, isSVG) {
  isSVG = isSVG || newNode.type === 'svg';

  if (!oldNode) {
    // mount
    mountElement(newNode, container, anchor, isSVG);
  } else {// patch
  }
}

function mountElement(node, container, anchor, isSVG) {
  var type = node.type,
      shapeFlag = node.shapeFlag,
      children = node.children;
  var el;
  el = node.el = rendererOptions.createElement(type, isSVG); //   处理children

  if (shapeFlag & vnode_1.ShapeFlags.TEXT_CHILDREN) {
    //   children是text
    rendererOptions.setElementText(el, children);
  } else if (shapeFlag & vnode_1.ShapeFlags.ARRAY_CHILDREN) {
    //   children是数组
    mountChildren(children, el, null, isSVG && type !== 'foreignObject');
  } else {
    console.warn('node', node, '的children不是数组/text');
  } //TODO:   添加属性
  //   挂载


  rendererOptions.insert(el, container, anchor);
  console.log('vnode:', node, 'mounted');
}

function processComponent(oldNode, newNode, container, anchor, isSVG) {}

function mountChildren(children, container, anchor, isSVG) {
  if (anchor === void 0) {
    anchor = null;
  }

  for (var i = 0; i < children.length; i++) {
    var node = vnode_1.normalizeVNode(children[i]); // 挂载

    patch(null, node, container, null, isSVG);
  }
} //  --------


function getNextAnchor(node) {
  if (node.shapeFlag & vnode_1.ShapeFlags.COMPONENT) {
    return getNextAnchor(node.component.subTree);
  }

  return rendererOptions.nextSibling(node.el);
}

function isSameNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
},{"./vnode":"../runtime/vnode.ts"}],"../seed/createApp.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var render_1 = require("../runtime/render");

var vnode_1 = require("../runtime/vnode");

function createAppContext() {
  return {
    app: null
  };
}

exports.createAppContext = createAppContext;

function createApp(rootComponent, rootProps) {
  var context = createAppContext();
  var isMounted = false;
  var app = {
    _component: rootComponent,
    _container: null,
    _context: context,
    mount: function mount(container) {
      if (!isMounted) {
        var vnode = vnode_1.createVNode(rootComponent, rootProps);
        render_1.render(vnode, container);
        isMounted = true;
        app._container = container;
      }
    },
    unmount: function unmount() {
      //   卸载
      if (isMounted) {
        console.log('卸载app');
        render_1.render(null, app._container);
        app._container = null;
        isMounted = false;
      }
    }
  };
  context.app = app;
  return app;
}

exports.createApp = createApp;
},{"../runtime/render":"../runtime/render.ts","../runtime/vnode":"../runtime/vnode.ts"}],"createApp.js":[function(require,module,exports) {
"use strict";

var _createApp = require("../seed/createApp");

var _vnode = require("../runtime/vnode");

var rootNode = (0, _vnode.createVNode)('h1', null, '测试挂载');
var app = (0, _createApp.createApp)(rootNode, null);
console.log(app);
app.mount(document.getElementById('app'));
},{"../seed/createApp":"../seed/createApp.ts","../runtime/vnode":"../runtime/vnode.ts"}],"node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "58480" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel/src/builtins/hmr-runtime.js","createApp.js"], null)
//# sourceMappingURL=/createApp.090b3aff.js.map