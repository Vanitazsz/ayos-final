import { corsHeaders,corsHeadersFor,failure } from "../_shared/http.ts";
Deno.serve((request)=>{Object.assign(corsHeaders,corsHeadersFor(request));if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeadersFor(request)});return failure(410,"endpoint_replaced","Use ai-analyze-request followed by ai-process-job. No fabricated fallback is available.");});
