"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const root = __dirname;
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "0.0.0.0";

const walletEnvKeys = [
  "USDT_TON_ADDRESS",
  "USDT_TRC20_ADDRESS",
  "USDT_BEP20_ADDRESS",
  "TON_ADDRESS",
  "BTC_ADDRESS",
];

function loadLocalEnv() {
  const envPath = path.join(root, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      const separatorIndex = trimmed.indexOf("=");

      if (!trimmed || trimmed.startsWith("#") || separatorIndex < 0) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

function walletAddresses() {
  return walletEnvKeys.reduce((addresses, key) => {
    addresses[key] = process.env[key] || "";
    return addresses;
  }, {});
}

loadLocalEnv();

const routes = new Map([
  ["/", "index.html"],
  ["/our-work", "our-work.html"],
  ["/volunteer", "volunteer.html"],
  ["/support-us", "support-us.html"],
  ["/donate", "supports-us_donate.html"],
  ["/payment", "payment.html"],
  ["/volunteering-opportunities", "supports-us_volunteering-opportunities.html"],
  ["/initiatives", "initiatives.html"],
  ["/maintenance", "maintenance.html"],
]);

const htmlRedirects = new Map([
  ["/index.html", "/"],
  ["/our-work.html", "/our-work"],
  ["/volunteer.html", "/volunteer"],
  ["/support-us.html", "/support-us"],
  ["/supports-us_donate.html", "/donate"],
  ["/payment.html", "/payment"],
  ["/supports-us_volunteering-opportunities.html", "/volunteering-opportunities"],
  ["/initiatives.html", "/initiatives"],
  ["/maintenance.html", "/maintenance"],
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function normalizeUrlPath(urlPath) {
  let pathname = decodeURIComponent(urlPath).replace(/\\/g, "/");

  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/g, "");
  }

  return pathname || "/";
}

function cleanRouteFor(pathname) {
  const pathName = normalizeUrlPath(pathname).toLowerCase();
  const slug = pathName.replace(/^\/+|\/+$/g, "");

  if (routes.has(pathName)) {
    return pathName;
  }

  if (htmlRedirects.has(pathName)) {
    return htmlRedirects.get(pathName);
  }

  if (!slug || slug === "index") {
    return "/";
  }

  if (
    slug === "volunteer/volunteering-opportunities" ||
    slug === "initiatives/volunteering-opportunities" ||
    slug === "volunteering-opportunities"
  ) {
    return "/volunteering-opportunities";
  }

  if (
    slug === "support-us/donate" ||
    slug === "supports-us/donate" ||
    slug === "donate"
  ) {
    return "/donate";
  }

  if (slug === "payment") {
    return "/payment";
  }

  if (!path.extname(pathName)) {
    return "/maintenance";
  }

  if (path.extname(pathName).toLowerCase() === ".html") {
    return "/maintenance";
  }

  return null;
}

function sendRedirect(response, location, search) {
  response.writeHead(302, { Location: location + (search || "") });
  response.end();
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";

  fs.createReadStream(filePath)
    .on("open", () => {
      response.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "no-store",
      });
    })
    .on("error", () => {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    })
    .pipe(response);
}

function sendJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^\/+/, "");

  if (relative === ".env" || relative.split(/[\\/]/).includes(".env")) {
    return null;
  }

  const candidate = path.resolve(root, relative);

  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    return null;
  }

  return candidate;
}

function resolveDirectoryIndex(pathname) {
  const staticPath = resolveStaticPath(pathname);

  if (!staticPath) {
    return null;
  }

  const indexPath = path.join(staticPath, "index.html");

  if (
    fs.existsSync(staticPath) &&
    fs.statSync(staticPath).isDirectory() &&
    fs.existsSync(indexPath) &&
    fs.statSync(indexPath).isFile()
  ) {
    return indexPath;
  }

  return null;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = normalizeUrlPath(requestUrl.pathname);
  const staticPath = resolveStaticPath(pathname);
  const directoryIndexPath = resolveDirectoryIndex(pathname);
  const cleanRoute = cleanRouteFor(pathname);

  if (pathname.toLowerCase() === "/api/wallets") {
    sendJson(response, walletAddresses());
    return;
  }

  if (pathname.toLowerCase() === "/healthz") {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("ok");
    return;
  }

  if (cleanRoute && cleanRoute !== pathname.toLowerCase()) {
    sendRedirect(response, cleanRoute, requestUrl.search);
    return;
  }

  if (directoryIndexPath) {
    sendFile(response, directoryIndexPath);
    return;
  }

  if (cleanRoute && routes.has(cleanRoute)) {
    sendFile(response, path.join(root, routes.get(cleanRoute)));
    return;
  }

  if (staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    sendFile(response, staticPath);
    return;
  }

  if (!path.extname(pathname) || path.extname(pathname).toLowerCase() === ".html") {
    sendRedirect(response, "/maintenance", requestUrl.search);
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Dubai Cares local site: http://localhost:${port}/`);
});
