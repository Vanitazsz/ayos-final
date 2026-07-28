import { z } from 'zod';
import { AI_INPUT_TYPES, AI_PROVIDERS } from './enums.js';

export const aiAnalysisRequestSchema = z
  .object({
    inputType: z.enum(AI_INPUT_TYPES),
    text: z.string().trim().min(10).max(8_000).optional(),
    storagePath: z.string().trim().min(3).max(1_024).optional(),
    idempotencyKey: z.string().min(16).max(128),
  })
  .superRefine((value, context) => {
    if (value.inputType === 'TEXT' && !value.text) {
      context.addIssue({ code: 'custom', path: ['text'], message: 'Text input is required.' });
    }
    if (value.inputType !== 'TEXT' && !value.storagePath) {
      context.addIssue({
        code: 'custom',
        path: ['storagePath'],
        message: 'A private storage path is required.',
      });
    }
  });

export const aiAnalysisResultSchema = z
  .object({
    detectedIssue: z.string().trim().min(3).max(500),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    possibleCause: z.string().trim().min(3).max(1_000),
    suggestedCategory: z.string().trim().min(2).max(120),
    estimatedCostMinimum: z.number().nonnegative().max(10_000_000),
    estimatedCostMaximum: z.number().nonnegative().max(10_000_000),
    safetyAdvice: z.string().trim().min(3).max(2_000),
    requestDraft: z.string().trim().min(10).max(4_000),
  })
  .refine((value) => value.estimatedCostMinimum <= value.estimatedCostMaximum, {
    path: ['estimatedCostMaximum'],
    message: 'Maximum estimated cost must not be below the minimum.',
  });

export const aiAnalysisResponseSchema = z.object({
  analysisId: z.string().uuid(),
  provider: z.enum(AI_PROVIDERS),
  model: z.string().min(1),
  result: aiAnalysisResultSchema,
});

export type AiAnalysisRequest = z.infer<typeof aiAnalysisRequestSchema>;
export type AiAnalysisResult = z.infer<typeof aiAnalysisResultSchema>;
export type AiAnalysisResponse = z.infer<typeof aiAnalysisResponseSchema>;
