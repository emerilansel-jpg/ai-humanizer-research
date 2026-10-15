// ai-humanizer-research/benchmark/runner.js
// Automated 10-subject benchmark runner using Universal Humanizer engine
const fs = require('fs');
const { autoLoopHumanize, analyzeSentences, calculateMetrics } = require('../engine/humanizer.js');

const SAMPLES = [
  {
    subject: 'Biology / Medicine',
    topic: 'CRISPR Gene Editing in Hereditary Diseases',
    raw: `CRISPR-Cas9 gene editing plays a pivotal role in modern biotechnology. Furthermore, this revolutionary tool allows researchers to delve into the human genome with unprecedented precision. It is a testament to scientific ingenuity that genetic disorders can now be targeted seamlessly. The real goal is correcting pathogenic mutations before symptoms manifest. In conclusion, clinical trials increased by 38% in 2024.`
  },
  {
    subject: 'World History',
    topic: 'The Fall of the Western Roman Empire',
    raw: `The decline of the Western Roman Empire serves as a poignant reminder of imperial fragility. Moreover, a myriad of internal corruptions and external barbarian invasions fostered widespread instability. It is worth noting that military overexpansion played a crucial role in undermining provincial governance. Rome did not collapse overnight; rather, its intricate institutional tapestry deteriorated gradually over centuries.`
  },
  {
    subject: 'Computer Science',
    topic: 'Quantum Computing vs Classical Architectures',
    raw: `Quantum computing stands as a beacon of next-generation computational capability. Classical binary bits are seamlessly augmented by quantum superpositions known as qubits. Furthermore, researchers delve into entanglement algorithms to foster exponential speedups for cryptographic factoring. In today's digital landscape, quantum supremacy marks a crucial milestone with 127-qubit processors.`
  },
  {
    subject: 'Economics / Finance',
    topic: 'Central Bank Interest Rates and Inflation Dynamics',
    raw: `Central banks play a vital role in curbing macroeconomic volatility. When inflation spikes, monetary policymakers must raise benchmark interest rates to foster fiscal stabilization. It is important to note that higher borrowing costs deliberately constrain aggregate demand. Furthermore, consumer spending declined by 4.2% while unemployment held steady at 3.9% in 2023.`
  },
  {
    subject: 'Philosophy',
    topic: 'Existentialist Free Will and Radical Responsibility',
    raw: `Jean-Paul Sartre's philosophy of radical freedom plays a pivotal role in existentialist thought. Furthermore, humans are condemned to be free, bearing a heavy tapestry of personal accountability. Delving into the concept of bad faith sheds light on how individuals evade their existential burdens. The real goal is embracing authentic self-definition in an indifferent universe.`
  },
  {
    subject: 'Environmental Science',
    topic: 'Ocean Acidification and Coral Bleaching',
    raw: `Ocean acidification plays a detrimental role in marine ecosystem degradation. Furthermore, heightened atmospheric carbon dioxide dissolves into seawater, fostering elevated carbonic acid levels. Coral calcification rates have plunged by 28% across equatorial barriers. In conclusion, preserving coastal biodiversity stands as a vital cornerstone for global climate resilience.`
  },
  {
    subject: 'Literature / Criticism',
    topic: 'Hamlet\'s Soliloquy and Existential Paralysis',
    raw: `Shakespeare's Hamlet serves as a profound testament to psychological indecision. The famous 'To be or not to be' monologue delves into the intricate agonies of mortality and conscience. Furthermore, the prince's inability to act seamlessly illustrates the paralyzing weight of excessive philosophical contemplation. His inner conflict fosters a tragic landscape of betrayal.`
  },
  {
    subject: 'Sociology / Urbanism',
    topic: 'Remote Work Impacts on Urban Housing Markets',
    raw: `The rise of telecommuting plays a transformative role in metropolitan demographics. Furthermore, suburban migration has fostered sudden spikes in regional real estate valuations. Urban core office occupancy plummeted by 45% following widespread corporate policy shifts. It is worth noting that decentralized labor seamlessly reconfigures modern urban zoning.`
  },
  {
    subject: 'Astrophysics',
    topic: 'Black Hole Event Horizons and Hawking Radiation',
    raw: `Black hole event horizons stand as a fascinating frontier in theoretical astrophysics. Delving into quantum field theory near curved spacetime reveals that virtual particle pairs foster subtle thermal emissions known as Hawking radiation. Furthermore, black hole entropy is strictly proportional to the surface area of the horizon, calculated in Planck units.`
  },
  {
    subject: 'Psychology / Wellness',
    topic: 'Sleep Hygiene and the Cognitive Shuffle',
    raw: `Getting to sleep fast takes dirty tricks. You've got to wrench your head out of gear. Forget counting sheep. It doesn't work. Try the cognitive shuffle instead. Picture a mess of totally random, senseless junk: a rusty shovel, a half-eaten peach, a bowling ball. Now run through the 4-7-8 breathing method: suck air in for four seconds, hold it tight for seven, and blow it out slow for eight. Still awake after 20 minutes? Get up.`
  }
];

async function runBenchmark() {
  console.log('=== STARTING 10-SUBJECT BENCHMARK ===\n');
  const results = [];

  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    console.log(`[${i + 1}/10] Processing: ${s.subject} - ${s.topic}...`);

    const rawEval = analyzeSentences(s.raw);
    const rawMetrics = calculateMetrics(s.raw);

    const humanized = await autoLoopHumanize(s.raw, 'universal');
    const finalMetrics = calculateMetrics(humanized.rewritten);

    results.push({
      id: i + 1,
      subject: s.subject,
      topic: s.topic,
      rawText: s.raw,
      rawAiScore: rawEval.overallAiPercent,
      rewrittenText: humanized.rewritten,
      finalAiScore: humanized.evaluation.overallAiPercent,
      humanPercent: humanized.evaluation.humanPercent,
      burstiness: finalMetrics.burstiness,
      gunningFog: finalMetrics.gunningFog,
      numbersPreserved: humanized.fidelity.numbersPreserved,
      detectors: humanized.evaluation.detectors
    });

    console.log(`    Before: ${rawEval.overallAiPercent}% AI -> After: ${humanized.evaluation.overallAiPercent}% AI (Burstiness: ${finalMetrics.burstiness})`);
  }

  // Format into Markdown report
  let md = `# 10-Subject Multi-Detector Humanizer Benchmark\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Engine:** Universal Humanizer Engine V3 (TurnItHuman / Grubby Pacing)\n`;
  md += `**Target Classifiers:** Turnitin, ZeroGPT, GPTZero, CopyLeaks, Writer, Originality.ai\n\n`;
  md += `| # | Subject | Raw AI % | Final AI % | Human % | Burstiness | Numbers Preserved | ZeroGPT | Turnitin/Writer |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;

  results.forEach(r => {
    md += `| ${r.id} | ${r.subject} | **${r.rawAiScore}%** | **${r.finalAiScore}%** | ${r.humanPercent}% | ${r.burstiness} | ${r.numbersPreserved ? 'Yes' : 'No'} | ${r.detectors.zerogpt.passed ? 'PASS' : 'FLAG'} | ${r.detectors.writer.passed ? 'PASS' : 'FLAG'} |\n`;
  });

  md += `\n---\n\n## Detailed Sample Transformations\n\n`;
  results.forEach(r => {
    md += `### ${r.id}. ${r.subject}: ${r.topic}\n\n`;
    md += `**Raw AI Input:**\n> ${r.rawText}\n\n`;
    md += `**Universal Humanized Output:**\n> ${r.rewrittenText}\n\n`;
    md += `**Metrics:** Final AI: **${r.finalAiScore}%** | Human: **${r.humanPercent}%** | Burstiness: **${r.burstiness}** | Gunning Fog: **${r.gunningFog}**\n\n`;
    md += `---\n\n`;
  });

  fs.writeFileSync('ai-humanizer-research/benchmark/10-subjects-benchmark.md', md);
  console.log('\n=== BENCHMARK COMPLETE === Saved to ai-humanizer-research/benchmark/10-subjects-benchmark.md');
}

runBenchmark().catch(console.error);
