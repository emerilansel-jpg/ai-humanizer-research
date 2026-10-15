# AI Humanizer Research & Studio Engine

Production-grade two-pass neural humanizer engine and research benchmark suite reverse-engineered from TurnItHuman, Grubby.ai, and Turnitin RoBERTa heuristics.

## Features
- **Two-Pass Neural Pipeline**: Structural narrative deconstruction followed by punchy sentence-level variance and slop filtering.
- **Detector Diagnostics**: Real-time sentence-level heatmap scoring calibrated against Turnitin & ZeroGPT classifiers.
- **Fidelity Preservation**: Strict tracking of numbers, entities, and empirical claims to prevent hallucinations.
- **Interactive Studio UI**: Standalone web console for scanning, loop-humanizing, and reviewing text.

## Tech Stack
- Frontend: HTML5, Tailwind CSS, Vanilla JS
- Backend: Node.js / Cloudflare Workers
- AI Provider: PesatRouter (`pesat-pro`)

## Local Development
```bash
npm start
# Studio runs at http://localhost:3000
```

## Running Tests
```bash
npm test
```
