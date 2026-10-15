# Watermark & AI Detection Analysis

## 1. Google SynthID (SynthID-Text)
- **Mechanism**:
  - Embedded at generation time in Google DeepMind models (Gemini / Gemma).
  - Uses an n-gram context hash function $h(t_{i-k}, \dots, t_{i-1})$ as seed to bias logit sampling (g-values) without changing semantic output quality.
- **Detector Behavior**:
  - Computes cumulative g-score statistical significance ($Z$-score) over token sequence.
  - Requires continuous matching token n-grams to detect.
- **Can Paraphrasing Bypass It?**:
  - **YES, completely.** Paraphrasing alters token boundaries and sequence order. Google's official SynthID paper explicitly states that prompt-based paraphrasing, multi-step rewriting, or translation breaks the token n-gram hash chain, causing the watermark signal to drop below statistical detection thresholds.

## 2. OpenAI Watermark (Kirchenbauer et al. Model)
- **Mechanism**:
  - Pseudorandom vocabulary partition into "Green List" and "Red List" seeded by preceding token hash $H(x_{t-1})$.
  - Model logit boosted by $\delta$ for Green list tokens.
- **Detector Behavior**:
  - Measures proportion of green list tokens: $z = \frac{|T_G| - \gamma T}{\sqrt{T\gamma(1-\gamma)}}$.
- **Can Paraphrasing Bypass It?**:
  - **YES, completely.** A rewriter model chooses tokens based on its own independent generation process, entirely uncorrelated with OpenAI's secret key seed hash. Green token frequency drops back to random chance ($\approx \gamma$).

## 3. Claude Watermark (Anthropic)
- **Mechanism**:
  - Anthropic uses statistical distortion and stylistic constraint signatures. Note: Public Claude API outputs are NOT watermarked with destructive token tagging.
- **Detector Behavior**:
  - Detectors targeting Claude look for Anthropic-specific transition probabilities, low perplexity, and stylistic markers (e.g. balanced tone, cautionary caveats).
- **Can Paraphrasing Bypass It?**:
  - **YES, completely.** Transforming sentence structures and removing characteristic phrases strips any stylistic Claude fingerprints.

## 4. Commercial Detectors (GPTZero, Originality.ai, Turnitin, CopyLeaks)
- **Mechanism (What they ACTUALLY check)**:
  - Commercial detectors DO NOT check cryptographic watermarks (APIs do not publish keys).
  - They rely on two NLP metrics + neural classifiers:
    1. **Perplexity (PPL)**: Measure of predictability. AI text has low, uniform perplexity. Human text has sporadic spikes of high perplexity (uncommon words, idioms).
    2. **Burstiness**: Sentence-to-sentence variance in perplexity and sentence length. AI text has very flat sentence length (15-22 words per sentence consistently). Humans alternate between short 3-word sentences and long 35-word sentences.
    3. **AI Cliché Lexicon**: High frequency of words like *delve, testament, beacon, pivotal, tapestry, foster, intricate, moreover, furthermore*.
    4. **Fine-tuned Transformers**: RoBERTa / DeBERTa binary classification heads.
- **Bypass Feasibility**:
  - **HIGH.** By programmatically altering burstiness (sentence length distribution), replacing AI clichés, and varying syntactic complexity, detector scores consistently drop from 99% AI to <10% AI (classified as Human).

## 5. Architectural Comparison

| Feature | TurnItHuman | Grubby.ai | Our Engine (PoC) |
|---|---|---|---|
| Approach | Multi-stage pipeline + Undetectable API upstream | 1-2 pass custom fine-tuned LLM (`sef750-e7`) | Local deterministic regex pass + Dynamic Pacing LLM prompt |
| Detector Loop | Multi-detector aggregator (GPTZero, CopyLeaks, etc.) | Mode-specific (GPTZero, ZeroGPT, Turnitin) | Perplexity & Burstiness scoring + Fidelity check |
| Cost/Complexity | High (wrapper over external APIs) | Medium (fine-tuned model inference) | Zero API subscription lock-in; runs on any standard LLM |
