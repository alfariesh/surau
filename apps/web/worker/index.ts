// Entri Worker web Surau: seluruh permintaan diserahkan ke vinext (App Router di workerd).
import handler from "vinext/server/fetch-handler";

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
};
