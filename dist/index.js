const Fragment = Symbol('Fragment');

function h(type, props = {}, ...children) {
  return {
    type,
    props: { ...props, children: children.flat() }
  }
}

function createElement(vnode) {
  if (vnode == null || vnode === false) {
    return document.createTextNode('')
  }

  // Texto plano
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(vnode)
  }

  // 🔥 COMPONENTE (función)
  if (typeof vnode.type === 'function') {
    const componentVNode = vnode.type(vnode.props || {});
    return createElement(componentVNode)
  }

  // Fragment
  if (vnode.type === Fragment) {
    const fragment = document.createDocumentFragment();
    vnode.props?.children?.forEach(c => {
      fragment.appendChild(createElement(c));
    });
    return fragment
  }

  // Elemento HTML normal
  const el = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props || {})) {
    if (key === 'children') continue

    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  vnode.props?.children?.forEach(child => {
    el.appendChild(createElement(child));
  });

  return el
}

function render(vnode, container) {
  container.innerHTML = '';
  container.appendChild(createElement(vnode));
}

function patch(parent, patch, index = 0) {
  if (!patch) return

  const el = parent.childNodes[index];

  switch (patch.type) {
    case 'CREATE':
      parent.appendChild(createElement(patch.newNode));
      break

    case 'REMOVE':
      if (el) parent.removeChild(el);
      break

    case 'REPLACE':
      parent.replaceChild(createElement(patch.newNode), el);
      break

    case 'UPDATE':
      patch.props.forEach(p => {
        if (p.type === 'SET') {
          el.setAttribute(p.key, p.value);
        }
        if (p.type === 'REMOVE') {
          el.removeAttribute(p.key);
        }
      });

      patch.children.forEach((childPatch, i) => {
        patch(el, childPatch, i);
      });
      break
  }
}

function diff(oldNode, newNode) {
  if (!oldNode) {
    return { type: 'CREATE', newNode }
  }

  if (!newNode) {
    return { type: 'REMOVE' }
  }

  if (changed(oldNode, newNode)) {
    return { type: 'REPLACE', newNode }
  }

  if (typeof newNode !== 'object') {
    return null
  }

  return {
    type: 'UPDATE',
    props: diffProps(oldNode.props, newNode.props),
    children: diffChildren(
      oldNode.props?.children || [],
      newNode.props?.children || []
    )
  }
}

function changed(a, b) {
  return (
    typeof a !== typeof b ||
    (typeof a === 'string' && a !== b) ||
    a.type !== b.type
  )
}

function diffProps(oldProps = {}, newProps = {}) {
  const patches = [];

  for (const key in newProps) {
    if (key === 'children') continue
    if (newProps[key] !== oldProps[key]) {
      patches.push({ type: 'SET', key, value: newProps[key] });
    }
  }

  for (const key in oldProps) {
    if (key === 'children') continue
    if (!(key in newProps)) {
      patches.push({ type: 'REMOVE', key });
    }
  }

  return patches
}

function diffChildren(oldChildren, newChildren) {
  const patches = [];
  const max = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < max; i++) {
    patches.push(diff(oldChildren[i], newChildren[i]));
  }

  return patches
}

let hooks = [];
let index = 0;
let rerenderFn = null;

function resetHooks() {
  index = 0;
}

function setRerender(fn) {
  rerenderFn = fn;
}

function rerender() {
  if (rerenderFn) rerenderFn();
}

function useState(initial) {
  const i = index;

  hooks[i] ??= initial;

  const setState = value => {
    hooks[i] = typeof value === 'function'
      ? value(hooks[i])
      : value;

    rerender();
  };

  index++;
  return [hooks[i], setState]
}

function useEffect(fn, deps) {
  const i = index;
  const prev = hooks[i];

  const hasChanged =
    !prev ||
    !deps ||
    deps.some((d, j) => d !== prev[j]);

  if (hasChanged) fn();

  hooks[i] = deps;
  index++;
}

let routes = [];
let notFoundRoute = null;
let initialized = false;

function Router({ children }) {
  const list = Array.isArray(children) ? children : [children];

  routes = [];
  notFoundRoute = null;

  list.forEach(v => {
    if (!v || v.type !== Route) return

    const route = Route(v.props);

    if (route.isNotFound) {
      notFoundRoute = route;
    } else {
      routes.push(route);
    }
  });

  if (!initialized) {
    window.addEventListener('popstate', () => {
      resetHooks();
      rerender();
    });
    initialized = true;
  }

  return resolveRoute()
}

function Route({ path, component }) {
  // 404 / catch-all
  if (path === '*') {
    return {
      isNotFound: true,
      component
    }
  }

  const keys = [];

  const regex = new RegExp(
    '^' +
      path.replace(/\/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return '/([^/]+)'
      }) +
      '$'
  );

  return {
    path,
    component,
    regex,
    keys,
    isNotFound: false
  }
}

function Link({ to, children, class: className }) {
  return h(
    'a',
    {
      href: to,
      class: className,
      onclick: e => {
        e.preventDefault();
        navigate(to);
      }
    },
    ...(Array.isArray(children) ? children : [children])
  )
}

/* ======================
   HISTORY
====================== */

function navigate(path) {
  history.pushState({}, '', path);
  resetHooks();
  rerender();
}

/* ======================
   MATCHING
====================== */

function resolveRoute() {
  const current = location.pathname || '/';

  for (const route of routes) {
    const match = current.match(route.regex);
    if (!match) continue

    const params = {};
    route.keys.forEach((k, i) => {
      params[k] = match[i + 1];
    });

    return route.component({ params })
  }

  if (notFoundRoute) {
    return notFoundRoute.component()
  }

  return h(
    'div',
    { class: 'p-10 text-center text-red-400 text-xl' },
    '404 bro 😵'
  )
}

export { Fragment, Link, Route, Router, diff, h, navigate, patch, render, resetHooks, setRerender, useEffect, useState };
//# sourceMappingURL=index.js.map
