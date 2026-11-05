import React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App.jsx";
import { routeFor } from "./site.js";
import { pageMetadata } from "./seo.js";

export function render(pathname, content) {
  return { html: renderToString(<App initialPath={pathname} initialContent={content} />), metadata: pageMetadata(routeFor(pathname), content, pathname) };
}
