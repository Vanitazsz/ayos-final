import { corsHeadersFor, failure, handleError, HttpError, jsonBody, success } from "../_shared/http.ts";
import { requestContext } from "../_shared/supabase.ts";
import { runAnalysis, validateCatalogAndCosts, type MediaInput, type ProviderAttempt } from "../_shared/ai.ts";

Deno.serve(async(request)=>{
  Object.assign((await import("../_shared/http.ts")).corsHeaders,corsHeadersFor(request)); if(request.method==="OPTIONS") return new Response("ok",{headers:corsHeadersFor(request)});
  try {
    if(request.method!=="POST") return failure(405,"method_not_allowed","POST required"); const {admin,user}=await requestContext(request); const body=await jsonBody(request); const jobId=String(body.jobId??"");
    const {data:job,error}=await admin.from("ai_analysis_jobs").select("*,ai_processing_consents(*)").eq("id",jobId).eq("account_id",user.id).single(); if(error||!job) throw new HttpError(404,"job_not_found","AI job not found");
    if(job.status==="SUCCEEDED") return success(job,"AI analysis already completed"); if(!["QUEUED","FAILED"].includes(job.status)) throw new HttpError(409,"job_not_processable","AI job is already processing");
    if(job.ai_processing_consents?.revoked_at) throw new HttpError(422,"consent_revoked","AI consent was revoked");
    await admin.from("ai_analysis_jobs").update({status:"PROCESSING",started_at:new Date().toISOString(),error_code:null,error_message:null,retryable:false}).eq("id",job.id).in("status",["QUEUED","FAILED"]);
    try {
      const output=await runAnalysis(admin,user.id,job.description,job.media_paths as MediaInput[]); const checked=await validateCatalogAndCosts(admin,output.result); const firstMedia=(output.media[0]?.path??null); const inputType=output.media.some((m)=>m.contentType.startsWith("audio/"))?"VOICE":output.media.length?"IMAGE":"TEXT";
      const persistResult={detectedIssue:checked.result.detectedIssue,severity:checked.result.severity,possibleCause:checked.result.possibleCauses.join("; "),suggestedCategory:checked.result.suggestedCategoryIds[0]??"",estimatedCostMinimum:checked.result.estimatedCostMinimumMinor/100,estimatedCostMaximum:checked.result.estimatedCostMaximumMinor/100,safetyAdvice:checked.result.safetyAdvice.join("\n"),requestDraft:checked.result.requestDraft};
      const {data:analysis,error:persistError}=await admin.rpc("persist_ai_analysis",{p_account_id:user.id,p_input_type:inputType,p_input_storage_path:firstMedia,p_transcript:checked.result.transcript||null,p_idempotency_key:job.idempotency_key,p_provider:output.provider,p_model:output.model,p_provider_reference:output.reference,p_result:persistResult,p_attempts:output.attempts}); if(persistError) throw persistError;
      const result={...checked.result,costOutlier:checked.costOutlier,provider:output.provider,model:output.model,providerReference:output.reference,analysisId:analysis.id}; const {data:complete,error:completeError}=await admin.from("ai_analysis_jobs").update({status:"SUCCEEDED",analysis_id:analysis.id,result,completed_at:new Date().toISOString(),retryable:false}).eq("id",job.id).select().single(); if(completeError) throw completeError; return success(complete,"AI analysis completed");
    } catch(providerError) {
      const value=providerError as Error&{attempts?:ProviderAttempt[];retryable?:boolean}; if(value.attempts?.length) await admin.from("ai_analysis_attempts").insert(value.attempts.map((attempt)=>({account_id:user.id,job_id:job.id,idempotency_key:job.idempotency_key,provider:attempt.provider,model:attempt.model,outcome:attempt.outcome,retryable:attempt.retryable,latency_ms:attempt.latency_ms,error_code:attempt.error_code,correlation_id:job.correlation_id,usage_metadata:attempt.usage_metadata??{},http_status:attempt.http_status})));
      await admin.from("ai_analysis_jobs").update({status:"FAILED",error_code:value.message,error_message:"AI providers could not complete this request. You can retry or continue manually.",retryable:Boolean(value.retryable),completed_at:new Date().toISOString()}).eq("id",job.id); throw new HttpError(value.retryable?503:422,"ai_processing_failed",value.retryable?"AI processing failed; retry or continue manually":"AI processing rejected this input; continue manually");
    }
  } catch(error){return handleError(error);}
});
