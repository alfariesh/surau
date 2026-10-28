// Diagnostik sementara ADR-119: hitung objek di bucket Response Store Worker uji (kunci + ukuran saja).
export default {
  async fetch(req, env) {
    let cursor,
      n = 0,
      size = 0;
    const sample = [];
    do {
      const l = await env.B.list({ cursor, limit: 1000 });
      for (const o of l.objects) {
        n++;
        size += o.size;
        if (sample.length < 8) sample.push(`${o.key} ${o.size}B ${o.uploaded.toISOString()}`);
      }
      cursor = l.truncated ? l.cursor : undefined;
    } while (cursor);
    return Response.json({ objects: n, bytes: size, sample });
  },
};
