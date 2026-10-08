import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";

const origin = "https://brownderby.ca";
const categories = [
  ["food-grocery", "Food & Grocery"],
  ["beverages", "Beverages"],
  ["candy-chocolate", "Candy & Chocolate"],
  ["snacks", "Snacks"],
  ["packaging-disposables", "Packaging & Disposables"],
  ["cleaning-janitorial", "Cleaning & Janitorial"],
  ["baking-foodservice-ingredients", "Baking & Foodservice Ingredients"],
  ["restaurant-equipment-smallwares", "Restaurant Equipment & Smallwares"],
];
const publicPaths = ["/", "/products", "/about", "/contact", ...categories.map(([slug]) => `/products/${slug}`)];
const products = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));

function decode(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]));
}

function meta(html, name) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag));
  return tags.find((tag) => tag.name === name || tag.property === name)?.content;
}

function canonical(html) {
  const tags = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag));
  const links = tags.filter((tag) => tag.rel === "canonical");
  assert.equal(links.length, 1, "Each successful page must have exactly one canonical");
  // Next serializes the root canonical without a trailing slash; normalize
  // that equivalent URL while still asserting the exact scheme, host and path.
  return new URL(links[0].href).href;
}

let server;
let base;
let log = "";

if (process.argv[2]) {
  const target = new URL(process.argv[2]);
  assert.ok(["http:", "https:"].includes(target.protocol));
  assert.ok(!target.username && !target.password && !target.search && !target.hash);
  assert.equal(target.pathname, "/", "Pass a site origin, without a path");
  base = target.origin;
} else {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { log = (log + chunk).slice(-5000); });
  server.stderr.on("data", (chunk) => { log = (log + chunk).slice(-5000); });
  server.on("error", (error) => { log += error.message; });
}

async function get(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { "User-Agent": "Googlebot" },
    signal: AbortSignal.timeout(20000),
  });
  return { response, html: await response.text() };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server && server.exitCode !== null) throw new Error(`Server exited before tests: ${log}`);
    try {
      const { response } = await get("/");
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the production server to listen. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, `Production server failed to start: ${log}`);

  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.response.status, 200);
  assert.match(sitemap.response.headers.get("content-type"), /xml/);
  assert.match(sitemap.html, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  const urls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => decode(url));
  assert.deepEqual([...urls].sort(), publicPaths.map((path) => new URL(path, origin).href).sort());
  assert.equal(new Set(urls).size, urls.length);
  assert.doesNotMatch(sitemap.html, /<lastmod>/, "Do not invent modification dates");

  const robots = await get("/robots.txt");
  assert.equal(robots.response.status, 200);
  assert.match(robots.response.headers.get("content-type"), /text\/plain/);
  assert.match(robots.html, /User-Agent: \*/i);
  assert.match(robots.html, /Allow: \/(?:\r?\n)/);
  assert.match(robots.html, /Disallow: \/api\//);
  assert.match(robots.html, /Sitemap: https:\/\/brownderby.ca\/sitemap.xml/);
  assert.doesNotMatch(robots.html, /Disallow: \/(?:account|login|reset-password|_next)/);

  const titles = new Set();
  const descriptions = new Set();
  for (const path of publicPaths) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200, path);
    assert.equal(canonical(html), new URL(path, origin).href, path);
    const title = decode(html.match(/<title>(.*?)<\/title>/)?.[1] || "");
    const description = meta(html, "description");
    assert.ok(title.includes("Brown Derby Wholesale"), path);
    assert.ok(description?.length > 60, path);
    assert.ok(!titles.has(title), `Duplicate title on ${path}`);
    assert.ok(!descriptions.has(description), `Duplicate description on ${path}`);
    titles.add(title);
    descriptions.add(description);
    assert.ok(!meta(html, "robots")?.includes("noindex"), path);
    assert.equal(new URL(meta(html, "og:url")).href, new URL(path, origin).href);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);

    if (path === "/" || path === "/contact") {
      const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
      assert.equal(scripts.length, 1);
      const schema = JSON.parse(scripts[0][1]);
      assert.equal(schema["@context"], "https://schema.org");
      const business = schema["@graph"].find((node) => node["@type"].includes("LocalBusiness"));
      const website = schema["@graph"].find((node) => node["@type"] === "WebSite");
      assert.ok(business["@type"].includes("Organization"));
      assert.equal(business.name, "Brown Derby Wholesale");
      assert.equal(business.url, `${origin}/`);
      assert.equal(business.telephone.replace(/\D/g, ""), "17094892299");
      assert.deepEqual(business.address, {
        "@type": "PostalAddress", streetAddress: "22 Hardy Avenue",
        addressLocality: "Grand Falls-Windsor", addressRegion: "NL",
        postalCode: "A2A 2P9", addressCountry: "CA",
      });
      assert.equal(website.name, business.name);
      assert.equal(website.url, `${origin}/`);
      assert.equal(website.publisher["@id"], business["@id"]);
      assert.ok(!business.aggregateRating && !business.review && !business.geo);
      const logo = await get(new URL(business.logo).pathname);
      assert.equal(logo.response.status, 200);
    }

    if (path === "/about") {
      assert.match(html, /Connors family/i);
      assert.match(html, /1961/);
      assert.match(html, /communitystories\\.ca\\/v2\\/main-street-merchants-windsor/);
    }

    const category = categories.find(([slug]) => path === `/products/${slug}`);
    if (category) {
      const breadcrumbScripts = [...html.matchAll(/<script\\b[^>]*type="application\\/ld\\+json"[^>]*>([\\s\\S]*?)<\\/script>/g)];
      assert.equal(breadcrumbScripts.length, 1, `Expected one breadcrumb JSON-LD script on ${path}`);
      const breadcrumb = JSON.parse(breadcrumbScripts[0][1]);
      assert.equal(breadcrumb["@context"], "https://schema.org");
      assert.equal(breadcrumb["@type"], "BreadcrumbList");
      assert.deepEqual(breadcrumb.itemListElement, [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Products", item: `${origin}/products` },
        { "@type": "ListItem", position: 3, name: category[1], item: `${origin}${path}` },
      ]);
      const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
      assert.ok(tbody, `Category products must be in initial server HTML: ${path}`);
      const expected = products.filter((product) => product.category === category[1]);
      assert.equal((tbody.match(/<tr>/g) || []).length, expected.length, path);
      assert.match(tbody, new RegExp(expected[0].id));
    }
  }

  for (const path of ["/account", "/login", "/reset-password"]) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(meta(html, "robots"), /noindex/);
    assert.match(meta(html, "robots"), /follow/);
    assert.equal(canonical(html), `${origin}${path}`);
    assert.ok(!urls.includes(`${origin}${path}`));
  }

  for (const path of ["/products/not-a-category", "/products/unknown-item-123"]) {
    const { response, html } = await get(path);
    assert.equal(response.status, 404, path);
    assert.match(meta(html, "robots"), /noindex/);
  }

  const queryPage = await get("/products?search=candy&utm_source=test");
  assert.equal(canonical(queryPage.html), `${origin}/products`);
  const resetPage = await get("/reset-password?code=test-placeholder");
  assert.equal(canonical(resetPage.html), `${origin}/reset-password`);
  assert.match(meta(resetPage.html, "robots"), /noindex/);
  console.log(`SEO checks passed: ${publicPaths.length} public URLs, 8 category tables with breadcrumb schema, heritage history, sitemap, robots, business schema, private noindex and 404 handling.`);
} catch (error) {
  console.error(log);
  throw error;
} finally {
  if (server) {
    server.kill();
    await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
}
