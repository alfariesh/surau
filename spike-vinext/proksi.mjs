// Proksi HTTP/2 + brotli di depan workerd lokal (wrangler dev = HTTP/1.1 tanpa kompresi).
// node proksi.mjs <portTLS> <portBackend>
import http2 from "node:http2";
import http from "node:http";
import zlib from "node:zlib";
import fs from "node:fs";
const [port, backend] = process.argv.slice(2).map(Number);
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "http2-settings",
  "host",
]);
const COMPRESSIBLE = /text\/|javascript|json|x-component|svg|xml|css/;
const srv = http2.createSecureServer({
  key: fs.readFileSync(process.env.KEY ?? "key.pem"),
  cert: fs.readFileSync(process.env.CERT ?? "cert.pem"),
  allowHTTP1: true,
});
srv.on("request", (req, res) => {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers))
    if (!k.startsWith(":") && !HOP.has(k)) headers[k] = v;
  headers.host = `localhost:${backend}`;
  headers["accept-encoding"] = "identity";
  const up = http.request(
    { host: "127.0.0.1", port: backend, method: req.method, path: req.url, headers, agent },
    (r) => {
      const out = {};
      for (const [k, v] of Object.entries(r.headers)) if (!HOP.has(k)) out[k] = v;
      const ae = String(req.headers["accept-encoding"] ?? "");
      const br =
        ae.includes("br") &&
        (!r.headers["content-encoding"] || r.headers["content-encoding"] === "identity") &&
        COMPRESSIBLE.test(String(r.headers["content-type"] ?? "")) &&
        r.statusCode !== 204 &&
        r.statusCode !== 304;
      if (br) {
        delete out["content-length"];
        out["content-encoding"] = "br";
        out.vary = out.vary ? `${out.vary}, Accept-Encoding` : "Accept-Encoding";
      }
      res.writeHead(r.statusCode, out);
      if (br)
        r.pipe(
          zlib.createBrotliCompress({
            flush: zlib.constants.BROTLI_OPERATION_FLUSH,
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
          }),
        ).pipe(res);
      else r.pipe(res);
    },
  );
  up.on("error", (e) => {
    if (!res.headersSent) res.writeHead(502);
    res.end(String(e));
  });
  req.pipe(up);
});
srv.listen(port, () => console.log(`h2+br https://localhost:${port} -> :${backend}`));
