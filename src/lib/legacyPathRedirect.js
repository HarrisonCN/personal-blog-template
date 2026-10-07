// The SPA uses HashRouter (works on any static host). The Node server also
// answers clean share URLs such as /articles/<slug> so crawlers get real meta
// tags; when a browser lands on one, move it onto the equivalent hash route
// before React Router reads the location.
const ROUTE_PATTERN = /^(.*?\/)(articles|projects|archive|studio)(?:\/([^/]+))?\/?$/;

export function hashRouteForPath(pathname, search = "", hash = "") {
  if (hash && hash !== "#" && hash !== "#/") {
    return null;
  }
  const match = ROUTE_PATTERN.exec(pathname);
  if (!match) {
    return null;
  }
  const [, base, section, slug] = match;
  return `${base}#/${section}${slug ? `/${slug}` : ""}${search}`;
}

export function redirectPathToHashRoute(location = window.location, history = window.history) {
  const target = hashRouteForPath(location.pathname, location.search, location.hash);
  if (target) {
    history.replaceState(null, "", target);
  }
}
