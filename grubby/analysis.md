# Reverse Engineering: Grubby.ai

## Overview
- Platform: Grubby.ai
- Frontend: Next.js + Turbopack, ProseMirror editor
- Backend: Next.js API Routes (`/api/*`), Supabase Realtime DB & Auth

## API Routes & Endpoints
- `POST /api/humanizer-proxy`: Core humanization endpoint
- `POST /api/humanizer-anonymous`: Free preview humanization
- `POST /api/humanizer-queue`: Background job processing queue
- `POST /api/rehumanizerFeedback`: User feedback on rehumanized spans
- `POST /api/humanizerFeedback`: Thumbs up/down feedback
- `POST /api/humanizerAnalytics`: Word count, latency, detector mode telemetry

## Execution Modes & Parameters
1. **Modes**:
   - `gptzero`: Tuned to minimize GPTZero perplexity/burstiness flags
   - `zerogpt`: Tuned for ZeroGPT (`enableZeroGPTScoring: true`, `zeroGptThreshold: 80`, `maxRetryAttempts: 2`)
   - `academic`: Tuned for Turnitin (`numSteps: 2`, two-pass rewriting pipeline)

2. **Model & Generation Parameters**:
   - Model ID: `V1` / underlying model `sef750-e7` (fine-tuned LLM)
   - Sampling Parameters:
     - `temperature`: `0.7`
     - `frequencyPenalty`: `0.1` (discourages repetitive phrase structures)
     - `presencePenalty`: `0.1` (encourages topic diversity)
     - `controlLengthTries`: `1`
     - `controlLengthAllowance`: `30` words margin

3. **Extracted System Prompt (Selection Rehumanizer)**:
   ```text
   TASK: Rewrite the selected text to be more natural and human-like while preserving the original meaning and maintaining seamless integration with the surrounding context.

   CONTEXT BEFORE: "{contextBefore}"
   SELECTED TEXT TO REWRITE: "{text}"
   CONTEXT AFTER: "{contextAfter}"

   CRITICAL INSTRUCTIONS:
   1. Rewrite ONLY the selected text marked above - nothing else
   2. Your response must contain EXACTLY the same content as the selected text, just rewritten
   3. Do NOT add any new sentences, phrases, or information beyond what's in the selected text
   4. Do NOT include any part of the context before or after in your response
   5. Do NOT extend incomplete sentences or add missing words
   6. If the selected text cuts off mid-sentence, rewrite only that incomplete portion
   7. Make the rewritten text sound more natural and human-like
   8. Ensure the rewritten text flows perfectly with the surrounding context
   9. Maintain the same tone, style, and register as the surrounding text
   10. Keep approximately the same length (can be slightly shorter or longer if needed for naturalness)
   11. Do not change the core meaning or add new information
   12. Your response should be a direct word-for-word replacement

   Respond with ONLY the rewritten version of the selected text. Do not include any explanations, additional text, or context.
   ```
