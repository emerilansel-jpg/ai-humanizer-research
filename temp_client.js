
    let currentEvaluation = null;
    let selectedSentence = null;
    let activeTab = 'clean';

    function updateWordCounts() {
      const inText = document.getElementById('inputText').value.trim();
      const inWords = inText ? inText.split(/\\s+/).filter(Boolean).length : 0;
      document.getElementById('inputWordCount').textContent = 'Words: ' + inWords;

      const outText = document.getElementById('outputText').value.trim();
      const outWords = outText ? outText.split(/\\s+/).filter(Boolean).length : 0;
      const diff = inWords > 0 ? ((outWords - inWords) / inWords * 100).toFixed(0) : 0;
      const diffStr = diff > 0 ? '(+' + diff + '%)' : '(' + diff + '%)';
      document.getElementById('outputWordCount').textContent = 'Words: ' + outWords + (inWords > 0 && outWords > 0 ? ' ' + diffStr : '');
    }

    function switchOutputTab(tab) {
      activeTab = tab;
      const cleanTab = document.getElementById('tabClean');
      const heatTab = document.getElementById('tabHeatmap');
      const outText = document.getElementById('outputText');
      const heatBox = document.getElementById('heatmapBox');

      if (tab === 'clean') {
        cleanTab.className = 'tab-btn active';
        heatTab.className = 'tab-btn';
        outText.style.display = 'block';
        heatBox.style.display = 'none';
      } else {
        cleanTab.className = 'tab-btn';
        heatTab.className = 'tab-btn active';
        outText.style.display = 'none';
        heatBox.style.display = 'block';
      }
    }

    function updateDetectorsUI(evalData) {
      currentEvaluation = evalData;
      const aiScore = evalData.overallAiPercent;
      const gauge = document.getElementById('gaugeElem');
      const gaugeVal = document.getElementById('gaugeVal');

      gaugeVal.textContent = aiScore + '%';
      if (aiScore > 50) {
        gauge.className = 'gauge-circle ai-high';
      } else if (aiScore > 20) {
        gauge.className = 'gauge-circle ai-mid';
      } else {
        gauge.className = 'gauge-circle';
      }

      document.getElementById('valHuman').textContent = evalData.humanPercent + '%';
      document.getElementById('valMixed').textContent = evalData.mixedPercent + '%';
      document.getElementById('valAi').textContent = evalData.overallAiPercent + '%';

      const d = evalData.detectors;
      const setBadge = (id, obj, text) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.className = 'badge-status ' + (obj.passed ? 'pass' : 'fail');
      };

      setBadge('det_turnitin', d.turnitin, d.turnitin.passed ? '✓ ' + d.turnitin.score : '⚠ ' + d.turnitin.score);
      setBadge('det_zerogpt', d.zerogpt, d.zerogpt.passed ? '✓ ' + d.zerogpt.score : '⚠ ' + d.zerogpt.score);
      setBadge('det_gptzero', d.gptzero, d.gptzero.score);
      setBadge('det_copyleaks', d.copyleaks, d.copyleaks.passed ? '✓ Human' : '⚠ AI');
      setBadge('det_writer', d.writer, d.writer.passed ? '✓ Pass' : '⚠ Flagged');
      setBadge('det_originality', d.originality, d.originality.score);
    }

    function renderHeatmapGrouped(evalData) {
      const box = document.getElementById('heatmapBox');
      box.innerHTML = '';

      if (!evalData.paragraphs || evalData.paragraphs.length === 0) {
        // Fallback to flat sentences
        const pElem = document.createElement('p');
        pElem.className = 'heatmap-p';
        evalData.sentences.forEach((s, idx) => {
          const span = createSentenceSpan(s, idx);
          pElem.appendChild(span);
        });
        box.appendChild(pElem);
        return;
      }

      evalData.paragraphs.forEach((pObj) => {
        const pElem = document.createElement('p');
        pElem.className = 'heatmap-p';
        pObj.sentences.forEach((s) => {
          const span = createSentenceSpan(s, s.id);
          pElem.appendChild(span);
        });
        box.appendChild(pElem);
      });
    }

    function createSentenceSpan(s, id) {
      const span = document.createElement('span');
      span.className = 'sent-span sent-' + s.status;
      span.textContent = s.text + ' ';
      span.title = s.status.toUpperCase() + ' (' + s.score + '%)' + (s.reasons?.length ? ': ' + s.reasons.join(', ') : '');
      span.onclick = () => openSentenceFixer(s);
      return span;
    }

    function openSentenceFixer(s) {
      selectedSentence = s;
      document.getElementById('fixerTargetText').textContent = '"' + s.text + '"';
      document.getElementById('fixerBox').className = 'fixer-box active';
    }

    function closeFixer() {
      document.getElementById('fixerBox').className = 'fixer-box';
      selectedSentence = null;
    }

    async function runScanOriginal() {
      const text = document.getElementById('inputText').value;
      if (!text.trim()) return;

      document.getElementById('scanStatus').textContent = 'Scanning Original Input...';
      const res = await fetch('/api/analyze-heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();

      updateDetectorsUI(data.evaluation);
      renderHeatmapGrouped(data.evaluation);
      switchOutputTab('heatmap');
      document.getElementById('scanStatus').textContent = 'Original Input Scanned';
    }

    async function runAutoLoop() {
      const text = document.getElementById('inputText').value;
      const mode = document.getElementById('mode').value;
      if (!text.trim()) return;

      const btn = document.getElementById('btnAutoLoop');
      btn.disabled = true;
      btn.textContent = '⏳ Auto-Looping & Verifying...';
      document.getElementById('scanStatus').textContent = 'Iterative Multi-Pass Humanizing...';

      try {
        const res = await fetch('/api/auto-loop-humanize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode })
        });
        const data = await res.json();

        // Populate Right Panel ONLY - DO NOT touch inputText!
        document.getElementById('outputText').value = data.rewritten;
        updateWordCounts();
        if (data.liveScanResult) {
          applyLiveScanData(data.liveScanResult);
        } else {
          updateDetectorsUI(data.evaluation);
          renderHeatmapGrouped(data.evaluation);
        }
        switchOutputTab('clean');

        document.getElementById('scanStatus').textContent = '100% Cleaned (' + data.retryTries + ' Loop Tries)';
        closeFixer();
      } catch (e) {
        alert('Failed: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🛡️ Auto-Loop Humanize';
      }
    }

    function applyLiveScanData(ld) {
      const turnitinPercent = Math.round((ld.aiRateResult?.Turnitin || 0) * 100);
      const zeroGptPercent = Math.round((ld.aiRateResult?.ZeroGPT || 0) * 100);
      const gptZeroPercent = Math.round((ld.aiRateResult?.GPTZero || 0) * 100);
      const copyLeaksPercent = Math.round((ld.aiRateResult?.CopyLeaks || 0) * 100);
      const writerPercent = Math.round((ld.aiRateResult?.Writer || 0) * 100);

      document.getElementById('valAi').textContent = Math.round(ld.aiConfidence * 100) + '%';
      document.getElementById('valHuman').textContent = Math.round(ld.humanRate * 100) + '%';
      document.getElementById('valMixed').textContent = Math.max(0, 100 - Math.round(ld.aiConfidence * 100) - Math.round(ld.humanRate * 100)) + '%';
      document.getElementById('gaugeVal').textContent = Math.round(ld.aiConfidence * 100) + '%';

      const setBadge = (id, pass, text) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.className = 'badge-status ' + (pass ? 'pass' : 'fail');
      };

      setBadge('det_turnitin', turnitinPercent <= 38, (turnitinPercent <= 38 ? '✓ ' : '⚠ ') + turnitinPercent + '% AI');
      setBadge('det_zerogpt', zeroGptPercent <= 38, (zeroGptPercent <= 38 ? '✓ ' : '⚠ ') + zeroGptPercent + '%');
      setBadge('det_gptzero', gptZeroPercent <= 38, gptZeroPercent + '%');
      setBadge('det_copyleaks', copyLeaksPercent <= 38, copyLeaksPercent + '%');
      setBadge('det_writer', writerPercent <= 38, writerPercent <= 38 ? '✓ Pass' : '⚠ Flagged');

      // Render live sentences heatmap
      if (ld.sentences && ld.sentences.length > 0) {
        const mapped = ld.sentences.map((s, idx) => ({
          id: 'live_' + idx,
          text: s.sentence,
          status: s.class === 'ai' ? 'ai' : (s.class === 'mixed' ? 'mixed' : 'human'),
          score: Math.round(s.generated_prob * 100),
          reasons: [s.class.toUpperCase() + ' prob ' + Math.round(s.generated_prob * 100) + '%']
        }));
        renderHeatmapGrouped({ sentences: mapped, paragraphs: [{ paragraphIndex: 0, sentences: mapped }] });
      }
    }

    async function runLiveTurnitinScan() {
      // Prioritize scanning the output text if present, otherwise input text
      const outputVal = document.getElementById('outputText').value.trim();
      const inputVal = document.getElementById('inputText').value.trim();
      const textToScan = outputVal || inputVal;
      if (!textToScan) return;

      const btn = document.getElementById('btnLiveTurnitin');
      btn.disabled = true;
      btn.textContent = '⏳ Calling Live API...';
      document.getElementById('scanStatus').textContent = 'Querying turnitindetector.ai live API...';

      try {
        const res = await fetch('/api/live-scan-turnitin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToScan })
        });
        const data = await res.json();

        if (data.liveData) {
          applyLiveScanData(data.liveData);
          switchOutputTab('heatmap');
          document.getElementById('scanStatus').textContent = 'Live Scan Complete (Verdict: ' + data.liveData.class.toUpperCase() + ')';
        }
      } catch (e) {
        alert('Live scan failed: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🌐 Live Turnitin Scan';
      }
    }

    async function fixSingleSentence() {
      if (!selectedSentence) return;
      const btn = document.getElementById('btnFixSentence');
      btn.disabled = true;
      btn.textContent = '⏳ Fixing sentence...';

      try {
        const outBox = document.getElementById('outputText');
        let fullText = outBox.value;

        const res = await fetch('/api/rehumanize-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: selectedSentence.text,
            contextBefore: '',
            contextAfter: '',
            mode: document.getElementById('mode').value
          })
        });
        const data = await res.json();

        fullText = fullText.replace(selectedSentence.text, data.rewritten);
        outBox.value = fullText;
        updateWordCounts();

        // Re-analyze
        const scanRes = await fetch('/api/analyze-heatmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fullText })
        });
        const scanData = await scanRes.json();
        updateDetectorsUI(scanData.evaluation);
        renderHeatmapGrouped(scanData.evaluation);
        closeFixer();
      } catch (e) {
        alert('Failed to fix sentence: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Re-humanize This Sentence';
      }
    }

    function copyCleanText() {
      const outText = document.getElementById('outputText').value.trim();
      if (!outText) {
        alert('No humanized text to copy yet.');
        return;
      }
      navigator.clipboard.writeText(outText);
      alert('Clean humanized text copied to clipboard!');
    }

    function clearInput() {
      document.getElementById('inputText').value = '';
      updateWordCounts();
    }

    function pasteSample() {
      document.getElementById('inputText').value = \`Artificial intelligence plays a pivotal role in the transformation of modern higher education. In today's rapidly evolving digital landscape, universities are increasingly adopting automated machine learning systems to optimize administrative workflows and enhance pedagogical outcomes. Furthermore, adaptive algorithms foster personalized learning by continuously tracking individual student metrics and dynamically tailoring curricular materials.

It is important to note that these computational frameworks serve as a cornerstone for contemporary educational methodology, thereby ensuring that students receive targeted feedback in real time. Moreover, the integration of generative AI delves into novel paradigms of research and critical inquiry, paving the way for unprecedented intellectual breakthroughs. In conclusion, while algorithmic assessment presents certain ethical dilemmas regarding data privacy and academic integrity, its capacity to revolutionize pedagogical paradigms stands as an enduring testament to the power of human ingenuity.\`;
      updateWordCounts();
    }

    document.getElementById('inputText').addEventListener('input', updateWordCounts);
    document.getElementById('outputText').addEventListener('input', updateWordCounts);
    document.getElementById('btnScanOriginal').addEventListener('click', runScanOriginal);
    document.getElementById('btnAutoLoop').addEventListener('click', runAutoLoop);
    document.getElementById('btnLiveTurnitin').addEventListener('click', runLiveTurnitinScan);
    document.getElementById('btnFixSentence').addEventListener('click', fixSingleSentence);

    // Initial setup
    pasteSample();
  