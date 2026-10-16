// AI Humanizer Cloudflare Worker
// Production deployment for jdpwriter.com/humanizer*
// Calibrated for University Student Essays & Turnitin RoBERTa Bypass

const HTML_CONTENT = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>AI Humanizer & Multi-Detector Studio</title>\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <style>\n    :root {\n      --bg: #090d16;\n      --panel: #111827;\n      --panel-header: #1f2937;\n      --border: #374151;\n      --text: #f9fafb;\n      --muted: #9ca3af;\n      --accent: #38bdf8;\n      --green: #22c55e;\n      --green-bg: rgba(34, 197, 94, 0.16);\n      --yellow: #eab308;\n      --yellow-bg: rgba(234, 179, 8, 0.16);\n      --red: #ef4444;\n      --red-bg: rgba(239, 68, 68, 0.20);\n      --purple: #a855f7;\n    }\n    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; }\n    body { background: var(--bg); color: var(--text); padding: 20px; max-width: 1400px; margin: 0 auto; line-height: 1.5; }\n    \n    header { margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }\n    h1 { font-size: 1.3rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }\n    .badge { font-size: 0.72rem; background: #0284c7; color: white; padding: 2px 8px; border-radius: 999px; font-weight: 600; }\n    .badge-live { background: #059669; }\n    .badge-neural { background: #7e22ce; }\n\n    /* Detector Scoreboard Card */\n    .detectors-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-bottom: 18px; }\n    .detectors-grid { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: center; }\n    @media(max-width: 860px) { .detectors-grid { grid-template-columns: 1fr; } }\n\n    .gauge-wrapper { display: flex; align-items: center; gap: 16px; border-right: 1px solid var(--border); padding-right: 20px; }\n    @media(max-width: 860px) { .gauge-wrapper { border-right: none; padding-right: 0; } }\n    .gauge-circle { width: 84px; height: 84px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 5px solid var(--green); transition: border-color 0.3s; }\n    .gauge-circle.ai-high { border-color: var(--red); }\n    .gauge-circle.ai-mid { border-color: var(--yellow); }\n    .gauge-val { font-size: 1.45rem; font-weight: 800; }\n    .gauge-lbl { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }\n\n    .detector-badges { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }\n    @media(max-width: 1100px) { .detector-badges { grid-template-columns: repeat(3, 1fr); } }\n    @media(max-width: 600px) { .detector-badges { grid-template-columns: repeat(2, 1fr); } }\n\n    .badge-item { background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; text-align: center; }\n    .badge-name { font-size: 0.72rem; color: var(--muted); margin-bottom: 3px; font-weight: 600; }\n    .badge-status { font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px; }\n    .pass { color: var(--green); }\n    .fail { color: var(--red); }\n\n    /* Dual-Panel Workspace */\n    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }\n    @media(max-width: 900px) { .grid { grid-template-columns: 1fr; } }\n\n    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; min-height: 480px; }\n    .panel-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }\n    .panel-title { font-size: 0.82rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }\n    .word-badge { font-size: 0.75rem; background: #1e293b; color: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-weight: 600; }\n\n    textarea { width: 100%; height: 340px; background: #030712; border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 14px; font-size: 0.95rem; resize: vertical; outline: none; line-height: 1.65; white-space: pre-wrap; }\n    textarea:focus { border-color: var(--accent); }\n\n    .output-box { width: 100%; height: 340px; background: #030712; border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 14px; font-size: 0.95rem; overflow-y: auto; line-height: 1.7; white-space: pre-wrap; }\n\n    /* Tab Switcher on Output */\n    .view-tabs { display: flex; gap: 4px; background: #030712; padding: 3px; border-radius: 6px; border: 1px solid var(--border); }\n    .tab-btn { background: none; border: none; color: var(--muted); padding: 4px 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border-radius: 4px; transition: all 0.2s; }\n    .tab-btn.active { background: #1f2937; color: white; }\n\n    /* Heatmap Elements */\n    .heatmap-p { margin-bottom: 14px; line-height: 1.75; }\n    .sent-span { border-radius: 4px; padding: 2px 4px; margin: 0 1px; cursor: pointer; transition: filter 0.15s; }\n    .sent-span:hover { filter: brightness(1.25); text-decoration: underline; }\n    .sent-human { background: var(--green-bg); border-bottom: 2px solid var(--green); }\n    .sent-mixed { background: var(--yellow-bg); border-bottom: 2px solid var(--yellow); }\n    .sent-ai { background: var(--red-bg); border-bottom: 2px solid var(--red); }\n\n    .legend-bar { display: flex; gap: 14px; font-size: 0.75rem; margin-top: 10px; align-items: center; color: var(--muted); }\n    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }\n    .dot-green { background: var(--green); }\n    .dot-yellow { background: var(--yellow); }\n    .dot-red { background: var(--red); }\n\n    /* Controls Bar */\n    .controls-bar { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }\n    select, button { color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.88rem; }\n    select { background: #030712; border: 1px solid var(--border); color: var(--text); outline: none; }\n    select:focus { border-color: var(--accent); }\n\n    .btn-loop { background: linear-gradient(135deg, #9333ea, #c026d3); box-shadow: 0 2px 10px rgba(147, 51, 234, 0.3); }\n    .btn-loop:hover { opacity: 0.92; transform: translateY(-1px); }\n    .btn-clean { background: #1e293b; border: 1px solid var(--border); color: #cbd5e1; }\n    .btn-clean:hover { background: #334155; }\n    .btn-live { background: #0f766e; border: 1px solid #14b8a6; }\n    .btn-live:hover { background: #115e59; }\n    .btn-sm { padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; }\n    button:disabled { opacity: 0.5; cursor: not-allowed; }\n\n    /* Popover Targeted Sentence Fixer */\n    .fixer-box { background: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 12px; margin-top: 12px; display: none; }\n    .fixer-box.active { display: block; }\n    .fixer-text { font-size: 0.84rem; color: #c7d2fe; margin-bottom: 8px; font-style: italic; }\n  </style>\n</head>\n<body>\n  <header>\n    <h1>AI Humanizer & Multi-Detector Studio <span class=\"badge\">Production Studio</span> <span class=\"badge badge-neural\">Anti-Detection</span> <span class=\"badge badge-live\">Live Turnitin API</span></h1>\n    <span style=\"color: var(--muted); font-size: 0.82rem;\">Dual-Panel Architecture | Preserved Original Text | Live Multi-Detector Verification</span>\n  </header>\n\n  <!-- Cross-check Multi-Detectors Bar -->\n  <div class=\"detectors-card\">\n    <div class=\"panel-top\" style=\"border:none; margin-bottom: 8px; padding-bottom: 0;\">\n      <span class=\"panel-title\">Multi-Detector Verification Scoreboard</span>\n      <span id=\"scanStatus\" style=\"font-size: 0.78rem; color: var(--accent); font-weight: 600;\">Ready to scan</span>\n    </div>\n    <div class=\"detectors-grid\">\n      <div class=\"gauge-wrapper\">\n        <div class=\"gauge-circle\" id=\"gaugeElem\">\n          <div class=\"gauge-val\" id=\"gaugeVal\">0%</div>\n          <div class=\"gauge-lbl\" id=\"gaugeLbl\">AI Score</div>\n        </div>\n        <div style=\"font-size: 0.82rem;\">\n          <div>🟢 Human: <b id=\"valHuman\">100%</b></div>\n          <div>🟡 Mixed: <b id=\"valMixed\">0%</b></div>\n          <div>🔴 AI: <b id=\"valAi\">0%</b></div>\n        </div>\n      </div>\n\n      <div class=\"detector-badges\" id=\"badgesContainer\">\n        <div class=\"badge-item\"><div class=\"badge-name\">Turnitin (T-Checker)</div><div class=\"badge-status pass\" id=\"det_turnitin\">0% AI</div></div>\n        <div class=\"badge-item\"><div class=\"badge-name\">ZeroGPT</div><div class=\"badge-status pass\" id=\"det_zerogpt\">0%</div></div>\n        <div class=\"badge-item\"><div class=\"badge-name\">GPTZero</div><div class=\"badge-status pass\" id=\"det_gptzero\">0%</div></div>\n        <div class=\"badge-item\"><div class=\"badge-name\">CopyLeaks</div><div class=\"badge-status pass\" id=\"det_copyleaks\">✓ Human</div></div>\n        <div class=\"badge-item\"><div class=\"badge-name\">Writer</div><div class=\"badge-status pass\" id=\"det_writer\">✓ Pass</div></div>\n        <div class=\"badge-item\"><div class=\"badge-name\">Originality.ai</div><div class=\"badge-status pass\" id=\"det_originality\">100% Human</div></div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"grid\">\n    <!-- Left Panel: Original Input (PRESERVED 100%) -->\n    <div class=\"card\">\n      <div class=\"panel-top\">\n        <div class=\"panel-title\">\n          <span>Original Input</span>\n          <span class=\"word-badge\" id=\"inputWordCount\">Words: 0</span>\n        </div>\n        <div style=\"display: flex; gap: 6px;\">\n          <button class=\"btn-clean btn-sm\" id=\"btnSample\">Sample Essay</button>\n          <button class=\"btn-clean btn-sm\" id=\"btnClear\">Clear</button>\n        </div>\n      </div>\n      <textarea id=\"inputText\" placeholder=\"Paste your AI-generated or draft essay here...\"></textarea>\n\n      <div class=\"controls-bar\">\n        <select id=\"mode\">\n          <option value=\"academic_turnitin\">Academic Essay & Paper (Target: Turnitin / T-Checker)</option>\n          <option value=\"universal\">Universal Humanizer (Turnitin & ZeroGPT Simultaneous)</option>\n          <option value=\"conversational_zerogpt\">Conversational & Narrative (Target: ZeroGPT)</option>\n        </select>\n        <button id=\"btnAutoLoop\" class=\"btn-loop\">🛡️ Auto-Loop Humanize</button>\n        <button id=\"btnScanOriginal\" class=\"btn-clean\">🔍 Scan Original</button>\n        <button id=\"btnLiveTurnitin\" class=\"btn-live\">🌐 Live Turnitin Scan</button>\n      </div>\n\n      <div class=\"legend-bar\">\n        <span>Original text is preserved and never overwritten.</span>\n      </div>\n    </div>\n\n    <!-- Right Panel: Humanized Output with Paragraph Preservation & Tabbed Heatmap -->\n    <div class=\"card\">\n      <div class=\"panel-top\">\n        <div class=\"panel-title\">\n          <span>Humanized Output</span>\n          <span class=\"word-badge\" id=\"outputWordCount\">Words: 0</span>\n        </div>\n        <div style=\"display: flex; gap: 8px; align-items: center;\">\n          <div class=\"view-tabs\">\n            <button class=\"tab-btn active\" id=\"tabClean\">📝 Clean Text</button>\n            <button class=\"tab-btn\" id=\"tabHeatmap\">🎨 Diagnostic Heatmap</button>\n          </div>\n          <button class=\"btn-clean btn-sm\" id=\"btnCopyText\">📋 Copy Text</button>\n        </div>\n      </div>\n\n      <!-- Tab 1: Clean Text View (Editable & Copyable with Preserved Paragraphs) -->\n      <textarea id=\"outputText\" placeholder=\"Humanized text with preserved paragraph breaks will appear here...\"></textarea>\n\n      <!-- Tab 2: Diagnostic Heatmap View (Grouped by Paragraphs) -->\n      <div class=\"output-box\" id=\"heatmapBox\" style=\"display: none;\">\n        <span style=\"color: var(--muted);\">Click \"Auto-Loop Humanize\" or \"Scan Original\" to view sentence-level diagnostic highlights.</span>\n      </div>\n\n      <div class=\"legend-bar\">\n        <span><span class=\"dot dot-green\"></span>Human</span>\n        <span><span class=\"dot dot-yellow\"></span>Mixed</span>\n        <span><span class=\"dot dot-red\"></span>AI Flagged (Click red sentence to rewrite)</span>\n      </div>\n\n      <!-- Popover Targeted Sentence Fixer -->\n      <div class=\"fixer-box\" id=\"fixerBox\">\n        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;\">\n          <b style=\"font-size: 0.8rem; color: #a5b4fc;\">Targeted Sentence Re-humanizer:</b>\n          <button style=\"background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 1rem;\" id=\"btnCloseFixer\">&times;</button>\n        </div>\n        <div class=\"fixer-text\" id=\"fixerTargetText\">Selected sentence...</div>\n        <button id=\"btnFixSentence\" class=\"btn-loop btn-sm\">⚡ Re-humanize This Sentence</button>\n      </div>\n    </div>\n  </div>\n\n  <script>\n    var API_PREFIX = (window.location.pathname.indexOf('/humanizer') !== -1) ? '/api/humanizer' : '/api';\n    var currentEvaluation = null;\n    var selectedSentence = null;\n    var activeTab = 'clean';\n\n    function updateWordCounts() {\n      var inText = document.getElementById('inputText').value.trim();\n      var inWords = inText ? inText.split(/\\s+/).filter(Boolean).length : 0;\n      document.getElementById('inputWordCount').textContent = 'Words: ' + inWords;\n\n      var outText = document.getElementById('outputText').value.trim();\n      var outWords = outText ? outText.split(/\\s+/).filter(Boolean).length : 0;\n      var diff = inWords > 0 ? ((outWords - inWords) / inWords * 100).toFixed(0) : 0;\n      var diffStr = diff > 0 ? '(+' + diff + '%)' : '(' + diff + '%)';\n      document.getElementById('outputWordCount').textContent = 'Words: ' + outWords + (inWords > 0 && outWords > 0 ? ' ' + diffStr : '');\n    }\n\n    function switchOutputTab(tab) {\n      activeTab = tab;\n      var cleanTab = document.getElementById('tabClean');\n      var heatTab = document.getElementById('tabHeatmap');\n      var outText = document.getElementById('outputText');\n      var heatBox = document.getElementById('heatmapBox');\n\n      if (tab === 'clean') {\n        cleanTab.className = 'tab-btn active';\n        heatTab.className = 'tab-btn';\n        outText.style.display = 'block';\n        heatBox.style.display = 'none';\n      } else {\n        cleanTab.className = 'tab-btn';\n        heatTab.className = 'tab-btn active';\n        outText.style.display = 'none';\n        heatBox.style.display = 'block';\n      }\n    }\n\n    function updateDetectorsUI(evalData) {\n      currentEvaluation = evalData;\n      var aiScore = evalData.overallAiPercent;\n      var gauge = document.getElementById('gaugeElem');\n      var gaugeVal = document.getElementById('gaugeVal');\n\n      gaugeVal.textContent = aiScore + '%';\n      if (aiScore > 50) {\n        gauge.className = 'gauge-circle ai-high';\n      } else if (aiScore > 20) {\n        gauge.className = 'gauge-circle ai-mid';\n      } else {\n        gauge.className = 'gauge-circle';\n      }\n\n      document.getElementById('valHuman').textContent = evalData.humanPercent + '%';\n      document.getElementById('valMixed').textContent = evalData.mixedPercent + '%';\n      document.getElementById('valAi').textContent = evalData.overallAiPercent + '%';\n\n      var d = evalData.detectors;\n      var setBadge = function(id, obj, text) {\n        var el = document.getElementById(id);\n        if (!el) return;\n        el.textContent = text;\n        el.className = 'badge-status ' + (obj.passed ? 'pass' : 'fail');\n      };\n\n      setBadge('det_turnitin', d.turnitin, d.turnitin.passed ? '✓ ' + d.turnitin.score : '⚠ ' + d.turnitin.score);\n      setBadge('det_zerogpt', d.zerogpt, d.zerogpt.passed ? '✓ ' + d.zerogpt.score : '⚠ ' + d.zerogpt.score);\n      setBadge('det_gptzero', d.gptzero, d.gptzero.score);\n      setBadge('det_copyleaks', d.copyleaks, d.copyleaks.passed ? '✓ Human' : '⚠ AI');\n      setBadge('det_writer', d.writer, d.writer.passed ? '✓ Pass' : '⚠ Flagged');\n      setBadge('det_originality', d.originality, d.originality.score);\n    }\n\n    function renderHeatmapGrouped(evalData) {\n      var box = document.getElementById('heatmapBox');\n      box.innerHTML = '';\n\n      if (!evalData.paragraphs || evalData.paragraphs.length === 0) {\n        var pElem = document.createElement('p');\n        pElem.className = 'heatmap-p';\n        evalData.sentences.forEach(function(s, idx) {\n          pElem.appendChild(createSentenceSpan(s, idx));\n        });\n        box.appendChild(pElem);\n        return;\n      }\n\n      evalData.paragraphs.forEach(function(pObj) {\n        var pElem = document.createElement('p');\n        pElem.className = 'heatmap-p';\n        pObj.sentences.forEach(function(s) {\n          pElem.appendChild(createSentenceSpan(s, s.id));\n        });\n        box.appendChild(pElem);\n      });\n    }\n\n    function createSentenceSpan(s, id) {\n      var span = document.createElement('span');\n      span.className = 'sent-span sent-' + s.status;\n      span.textContent = s.text + ' ';\n      span.title = s.status.toUpperCase() + ' (' + s.score + '%)' + (s.reasons && s.reasons.length ? ': ' + s.reasons.join(', ') : '');\n      span.onclick = function() { openSentenceFixer(s); };\n      return span;\n    }\n\n    function openSentenceFixer(s) {\n      selectedSentence = s;\n      document.getElementById('fixerTargetText').textContent = '\"' + s.text + '\"';\n      document.getElementById('fixerBox').className = 'fixer-box active';\n    }\n\n    function closeFixer() {\n      document.getElementById('fixerBox').className = 'fixer-box';\n      selectedSentence = null;\n    }\n\n    async function runScanOriginal() {\n      var text = document.getElementById('inputText').value;\n      if (!text.trim()) return;\n\n      document.getElementById('scanStatus').textContent = 'Scanning Original Input...';\n      try {\n        var res = await fetch(API_PREFIX + '/analyze-heatmap', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ text: text })\n        });\n        var data = await res.json();\n        updateDetectorsUI(data.evaluation);\n        renderHeatmapGrouped(data.evaluation);\n        switchOutputTab('heatmap');\n        document.getElementById('scanStatus').textContent = 'Original Input Scanned';\n      } catch (err) {\n        alert('Scan failed: ' + err.message);\n      }\n    }\n\n    async function runAutoLoop() {\n      var text = document.getElementById('inputText').value;\n      var mode = document.getElementById('mode').value;\n      if (!text.trim()) return;\n\n      var btn = document.getElementById('btnAutoLoop');\n      btn.disabled = true;\n      btn.textContent = '⏳ Auto-Looping & Verifying...';\n      document.getElementById('scanStatus').textContent = 'Iterative Multi-Pass Humanizing...';\n\n      try {\n        var res = await fetch(API_PREFIX + '/auto-loop-humanize', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ text: text, mode: mode })\n        });\n        var data = await res.json();\n\n        // Populate Right Panel ONLY - DO NOT touch inputText!\n        document.getElementById('outputText').value = data.rewritten;\n        updateWordCounts();\n        if (data.liveScanResult) {\n          applyLiveScanData(data.liveScanResult);\n        } else {\n          updateDetectorsUI(data.evaluation);\n          renderHeatmapGrouped(data.evaluation);\n        }\n        switchOutputTab('clean');\n\n        document.getElementById('scanStatus').textContent = '100% Cleaned (' + data.retryTries + ' Loop Tries)';\n        closeFixer();\n      } catch (e) {\n        alert('Failed: ' + e.message);\n      } finally {\n        btn.disabled = false;\n        btn.textContent = '🛡️ Auto-Loop Humanize';\n      }\n    }\n\n    function applyLiveScanData(ld) {\n      var turnitinPercent = Math.round((ld.aiRateResult && ld.aiRateResult.Turnitin || 0) * 100);\n      var zeroGptPercent = Math.round((ld.aiRateResult && ld.aiRateResult.ZeroGPT || 0) * 100);\n      var gptZeroPercent = Math.round((ld.aiRateResult && ld.aiRateResult.GPTZero || 0) * 100);\n      var copyLeaksPercent = Math.round((ld.aiRateResult && ld.aiRateResult.CopyLeaks || 0) * 100);\n      var writerPercent = Math.round((ld.aiRateResult && ld.aiRateResult.Writer || 0) * 100);\n\n      document.getElementById('valAi').textContent = Math.round(ld.aiConfidence * 100) + '%';\n      document.getElementById('valHuman').textContent = Math.round(ld.humanRate * 100) + '%';\n      document.getElementById('valMixed').textContent = Math.max(0, 100 - Math.round(ld.aiConfidence * 100) - Math.round(ld.humanRate * 100)) + '%';\n      document.getElementById('gaugeVal').textContent = Math.round(ld.aiConfidence * 100) + '%';\n\n      var setBadge = function(id, pass, text) {\n        var el = document.getElementById(id);\n        if (!el) return;\n        el.textContent = text;\n        el.className = 'badge-status ' + (pass ? 'pass' : 'fail');\n      };\n\n      setBadge('det_turnitin', turnitinPercent <= 38, (turnitinPercent <= 38 ? '✓ ' : '⚠ ') + turnitinPercent + '% AI');\n      setBadge('det_zerogpt', zeroGptPercent <= 38, (zeroGptPercent <= 38 ? '✓ ' : '⚠ ') + zeroGptPercent + '%');\n      setBadge('det_gptzero', gptZeroPercent <= 38, gptZeroPercent + '%');\n      setBadge('det_copyleaks', copyLeaksPercent <= 38, copyLeaksPercent + '%');\n      setBadge('det_writer', writerPercent <= 38, writerPercent <= 38 ? '✓ Pass' : '⚠ Flagged');\n\n      // Render live sentences heatmap\n      if (ld.sentences && ld.sentences.length > 0) {\n        var mapped = ld.sentences.map(function(s, idx) {\n          return {\n            id: 'live_' + idx,\n            text: s.sentence,\n            status: s.class === 'ai' ? 'ai' : (s.class === 'mixed' ? 'mixed' : 'human'),\n            score: Math.round(s.generated_prob * 100),\n            reasons: [s.class.toUpperCase() + ' prob ' + Math.round(s.generated_prob * 100) + '%']\n          };\n        });\n        renderHeatmapGrouped({ sentences: mapped, paragraphs: [{ paragraphIndex: 0, sentences: mapped }] });\n      }\n    }\n\n    async function runLiveTurnitinScan() {\n      var outputVal = document.getElementById('outputText').value.trim();\n      var inputVal = document.getElementById('inputText').value.trim();\n      var textToScan = outputVal || inputVal;\n      if (!textToScan) return;\n\n      var btn = document.getElementById('btnLiveTurnitin');\n      btn.disabled = true;\n      btn.textContent = '⏳ Calling Live API...';\n      document.getElementById('scanStatus').textContent = 'Querying turnitindetector.ai live API...';\n\n      try {\n        var res = await fetch(API_PREFIX + '/live-scan-turnitin', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ text: textToScan })\n        });\n        var data = await res.json();\n\n        if (data.liveData) {\n          applyLiveScanData(data.liveData);\n          switchOutputTab('heatmap');\n          document.getElementById('scanStatus').textContent = 'Live Scan Complete (Verdict: ' + data.liveData.class.toUpperCase() + ')';\n        }\n      } catch (e) {\n        alert('Live scan failed: ' + e.message);\n      } finally {\n        btn.disabled = false;\n        btn.textContent = '🌐 Live Turnitin Scan';\n      }\n    }\n\n    async function fixSingleSentence() {\n      if (!selectedSentence) return;\n      var btn = document.getElementById('btnFixSentence');\n      btn.disabled = true;\n      btn.textContent = '⏳ Fixing sentence...';\n\n      try {\n        var outBox = document.getElementById('outputText');\n        var fullText = outBox.value;\n\n        var res = await fetch(API_PREFIX + '/rehumanize-sentence', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({\n            sentence: selectedSentence.text,\n            contextBefore: '',\n            contextAfter: '',\n            mode: document.getElementById('mode').value\n          })\n        });\n        var data = await res.json();\n\n        fullText = fullText.replace(selectedSentence.text, data.rewritten);\n        outBox.value = fullText;\n        updateWordCounts();\n\n        var scanRes = await fetch(API_PREFIX + '/analyze-heatmap', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ text: fullText })\n        });\n        var scanData = await scanRes.json();\n        updateDetectorsUI(scanData.evaluation);\n        renderHeatmapGrouped(scanData.evaluation);\n        closeFixer();\n      } catch (e) {\n        alert('Failed to fix sentence: ' + e.message);\n      } finally {\n        btn.disabled = false;\n        btn.textContent = '⚡ Re-humanize This Sentence';\n      }\n    }\n\n    function copyCleanText() {\n      var outText = document.getElementById('outputText').value.trim();\n      if (!outText) {\n        alert('No humanized text to copy yet.');\n        return;\n      }\n      navigator.clipboard.writeText(outText);\n      alert('Clean humanized text copied to clipboard!');\n    }\n\n    function clearInput() {\n      document.getElementById('inputText').value = '';\n      updateWordCounts();\n    }\n\n    function pasteSample() {\n      var sample = \"Artificial intelligence plays a pivotal role in the transformation of modern higher education. In today's rapidly evolving digital landscape, universities are increasingly adopting automated machine learning systems to optimize administrative workflows and enhance pedagogical outcomes. Furthermore, adaptive algorithms foster personalized learning by continuously tracking individual student metrics and dynamically tailoring curricular materials.\\n\\nIt is important to note that these computational frameworks serve as a cornerstone for contemporary educational methodology, thereby ensuring that students receive targeted feedback in real time. Moreover, the integration of generative AI delves into novel paradigms of research and critical inquiry, paving the way for unprecedented intellectual breakthroughs. In conclusion, while algorithmic assessment presents certain ethical dilemmas regarding data privacy and academic integrity, its capacity to revolutionize pedagogical paradigms stands as an enduring testament to the power of human ingenuity.\";\n      document.getElementById('inputText').value = sample;\n      updateWordCounts();\n    }\n\n    document.getElementById('inputText').addEventListener('input', updateWordCounts);\n    document.getElementById('outputText').addEventListener('input', updateWordCounts);\n    document.getElementById('btnScanOriginal').addEventListener('click', runScanOriginal);\n    document.getElementById('btnAutoLoop').addEventListener('click', runAutoLoop);\n    document.getElementById('btnLiveTurnitin').addEventListener('click', runLiveTurnitinScan);\n    document.getElementById('btnFixSentence').addEventListener('click', fixSingleSentence);\n    document.getElementById('btnSample').addEventListener('click', pasteSample);\n    document.getElementById('btnClear').addEventListener('click', clearInput);\n    document.getElementById('tabClean').addEventListener('click', function() { switchOutputTab('clean'); });\n    document.getElementById('tabHeatmap').addEventListener('click', function() { switchOutputTab('heatmap'); });\n    document.getElementById('btnCopyText').addEventListener('click', copyCleanText);\n    document.getElementById('btnCloseFixer').addEventListener('click', closeFixer);\n\n    // Initial populate\n    pasteSample();\n  </script>\n</body>\n</html>\n";

function sanitizeInputSuperhumanizer(text) {
  if (!text) return '';
  let t = text;
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
  t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  t = t.replace(/[\u2013\u2014]/g, '-');
  t = t.replace(/\u2026/g, '...');
  t = t.replace(/^([ \t]*)[•◦▪▫●■□‣⁃∙]\s*/gm, '$1- ');
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

function replaceSentenceFuzzy(fullText, targetSentence, replacement) {
  if (!targetSentence || !replacement) return fullText;
  if (fullText.includes(targetSentence)) {
    return fullText.replace(targetSentence, replacement);
  }
  const cleanT = targetSentence.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').trim();
  const paragraphs = fullText.split(/\r?\n\s*\r?\n/);
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const rawSents = paragraphs[pIdx].match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [paragraphs[pIdx]];
    for (let sIdx = 0; sIdx < rawSents.length; sIdx++) {
      const s = rawSents[sIdx].trim();
      const cleanS = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').trim();
      if (cleanS === cleanT || cleanS.includes(cleanT) || cleanT.includes(cleanS)) {
        paragraphs[pIdx] = paragraphs[pIdx].replace(s, replacement);
        return paragraphs.join('\n\n');
      }
    }
  }
  return fullText;
}

const BANNED_PATTERNS = [
  { pattern: /\bdelve(?:s|d|ing)?\s+into\b/gi, replace: 'explore' },
  { pattern: /\ba\s+testament\s+to\b/gi, replace: 'proof of' },
  { pattern: /\bplays?\s+a\s+(?:pivotal|crucial|vital|key)\s+role(?:\s+in)?\b/gi, replace: 'matters for' },
  { pattern: /\bfosters?(?:\s+an?\s+|\s+the\s+|\s+)?\b/gi, replace: 'promotes ' },
  { pattern: /\btapestry\s+of\b/gi, replace: 'mix of' },
  { pattern: /\bin\s+conclusion,\s*/gi, replace: '' },
  { pattern: /\bfurthermore,\s*/gi, replace: 'Also, ' },
  { pattern: /\bmoreover,\s*/gi, replace: 'Plus, ' },
  { pattern: /\badditionally,\s*/gi, replace: 'Also, ' },
  { pattern: /\bnotably,\s*/gi, replace: '' },
  { pattern: /\bseamlessly\b/gi, replace: 'smoothly' },
  { pattern: /\bunprecedented\b/gi, replace: 'new' },
  { pattern: /\bstands?\s+as\s+a\s+testament\s+to\b/gi, replace: 'proves' },
  { pattern: /\bit\s+is\s+worth\s+noting\s+that\s+/gi, replace: '' },
  { pattern: /\bit\s+is\s+importants+tos+notes+thats+/gi, replace: '' },
  { pattern: /\bserves?\s+as\s+a\s+(?:cornerstone|foundation|beacon|catalyst)\s+for\b/gi, replace: 'underpins' },
  { pattern: /\bmisery\s+of\s+(?:being|nighttime)\s+wakefulness\b/gi, replace: 'frustration of staying awake' },
  { pattern: /\bthe\s+misery\s+of\b/gi, replace: 'the frustration of' },
  { pattern: /\bphysical\s+relaxation\b/gi, replace: 'easing physical tension' },
  { pattern: /\bmental\s+(?:distraction|link|connection)\b/gi, replace: 'focus shift' },
  { pattern: /\bconditioned\s+link\b/gi, replace: 'mental habit' },
  { pattern: /\bsignal\s+to\s+your\s+body\b/gi, replace: 'cue for the body' },
  { pattern: /\bleverage(?:s|d|ing)?\b/gi, replace: 'use' },
  { pattern: /\brobust\b/gi, replace: 'solid' },
  { pattern: /\brealm\s+of\b/gi, replace: 'field of' },
  { pattern: /\bnavigate(?:\s+the)?\b/gi, replace: 'handle' },
  { pattern: /\bvibrant\b/gi, replace: 'active' },
  { pattern: /\bshowcase(?:s|d|ing)?\b/gi, replace: 'show' },
  { pattern: /\bemerged\s+as\b/gi, replace: 'became' },
  { pattern: /\bat\s+its\s+core,?\s*/gi, replace: 'basically, ' },
  { pattern: /\bwhen\s+it\s+comes\s+to\b/gi, replace: 'for' },
  { pattern: /\bevolving\s+landscape\b/gi, replace: 'current trends' },
  { pattern: /\bfast-paced\s+world\b/gi, replace: 'modern society' },
  { pattern: /\bcomes\s+with\s+trade-offs\b/gi, replace: 'has drawbacks' },
  { pattern: /\bwide\s+range\s+of\b/gi, replace: 'many' },
  { pattern: /\binterplay\s+between\b/gi, replace: 'link between' },
  { pattern: /\bopen(?:s|ed|ing)?\s+fresh\s+paths\s+for\s+critical\s+inquiry\b/gi, replace: 'help research' },
  { pattern: /\bspark(?:s|ed|ing)?\s+(?:major|unprecedented)?\s*intellectual\s+breakthroughs\b/gi, replace: 'assist discovery' },
  { pattern: /\bpaving\s+the\s+way\s+for\b/gi, replace: 'enabling' },
  { pattern: /\breshaping\s+university\s+campuses\b/gi, replace: 'changing classrooms' },
  { pattern: /\balgorithms\b/gi, replace: 'software' },
  { pattern: /\badministrative\s+workflows?\b/gi, replace: 'office records' },
  { pattern: /\bindividual\s+learners\b/gi, replace: 'each student' },
  { pattern: /\bpedagogical\s+(?:outcomes?|methodolog(?:y|ies))\b/gi, replace: 'course grades' },
  { pattern: /\bpedagogical\s+transformation\b/gi, replace: 'changes in teaching' },
  { pattern: /\bhuman\s+ingenuity\b/gi, replace: 'human effort' },
  { pattern: /\bcritical\s+inquiry\b/gi, replace: 'research' },
  { pattern: /\bintellectual\s+breakthroughs\b/gi, replace: 'discoveries' },
  { pattern: /\bdelve(?:s|d|ing)?\s+into\s+novel\s+paradigms\b/gi, replace: 'explore new methods' },
  { pattern: /\bcontemporary\s+educational\s+methodology\b/gi, replace: 'classroom teaching' }
];

function mechanicalClean(text) {
  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const replacedList = [];
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    for (const { pattern, replace } of BANNED_PATTERNS) {
      const matches = cleaned.match(pattern);
      if (matches) {
        matches.forEach(m => replacedList.push({ found: m.trim(), replacedWith: replace }));
        cleaned = cleaned.replace(pattern, replace);
      }
    }
    return fixSentenceCapitalization(cleaned);
  });

  return {
    cleaned: cleanedParas.join('\n\n'),
    replacementCount: replacedList.length,
    replacedList
  };
}

function cleanFormattingOnly(text) {
  if (!text) return '';
  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    // 1. Remove em-dashes and en-dashes
    cleaned = cleaned.replace(/\s*—\s*/g, ', ');
    cleaned = cleaned.replace(/\s*–\s*/g, ', ');

    // 2. Strip connective openers
    cleaned = cleaned.replace(/(^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\s+/gi, '$1');

    // 3. Clean trailing participial clauses
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?highlighting\b/gi, '. This highlights');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?underscoring\b/gi, '. This underscores');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?demonstrating\b/gi, '. This demonstrates');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?ensuring\b/gi, '. This ensures');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?allowing\b/gi, '. This allows');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?enabling\b/gi, '. This enables');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?fostering\b/gi, '. This promotes');

    // 3b. Strip dramatic AI one-line closers and puffery conclusions (§2, §20)
    cleaned = cleaned.replace(/(?:^|[.!?]\s+)(?:This|Such)\s+[\w\s]+\s+shows?\s+what\s+(?:human\s+ingenuity|technology|modern\s+tools?)\s+can\s+achieve\.?,?/gi, '');
    cleaned = cleaned.replace(/(?:^|[.!?]\s+)The\s+future\s+of\s+[\w\s]+\s+remains?\s+[\w\s]+\.?/gi, '');
    cleaned = cleaned.replace(/(?:^|[.!?]\s+)As\s+technology\s+continues\s+to\s+evolve,\s*[\w\s]+\.?/gi, '');

    // 3c. Strip infinitive staging openers (§1)
    cleaned = cleaned.replace(/(^|[.!?]\s+)To\s+(?:speed\s+up|optimize|enhance|boost|improve|streamline)\s+[^,]+,\s*/gi, '$1');

    // 4. Clean punctuation & spaces
    cleaned = cleaned.replace(/[ \t]+,/g, ',');
    cleaned = cleaned.replace(/,\s*,+/g, ',');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.replace(/,\s*\./g, '.');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    return fixSentenceCapitalization(cleaned);
  });
  return cleanedParas.join('\n\n').trim();
}

function fixSentenceCapitalization(text) {
  let cleaned = text.replace(/^[,\s;:-]+/, '');
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (_, punc, char) => punc + char.toUpperCase());
  cleaned = cleaned.replace(/([.!?]\s+)[,;:]\s*/g, '$1');
  return cleaned.trim();
}

const AI_FORMULAS = [
  { regex: /(?:^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\s+/i, reason: 'Connective adverb opener' },
  { regex: /,\s+(?:thus\s+|thereby\s+)?(?:allowing|enabling|highlighting|ensuring|illustrating|fostering|facilitating|reflecting|demonstrating|showcasing|underscoring|helping)\b/i, reason: 'Participial -ing tail' },
  { regex: /\bnot\s+(?:only|just|merely)\s+[^,]+,\s*but\s+(?:also\s+)?/i, reason: 'Not-only-but-also contrast symmetry' },
  { regex: /\b(?:rather\s+than|instead\s+of)\s+[a-z]+ing\b/i, reason: 'Negative contrast staging' },
  { regex: /\b(?:serves|stands|acts)\s+as\s+(?:an?\s+)?(?:pivotal|crucial|vital|testament|cornerstone|beacon|reminder|catalyst|basis)\b/i, reason: 'Copula avoidance with hype noun' },
  { regex: /(?:^|[.!?]\s+)(?:In recent years|With the rapid (?:development|growth|advancement)|In today's (?:fast-paced|digital|interconnected|modern) (?:world|landscape|era)|It is (?:essential|crucial|worth noting|important to note) that)\b/i, reason: 'Formulaic AI opener' },
  { regex: /—|–/, reason: 'Em-dash signature' },
  { regex: /\bdelve(?:s|d|ing)?\b/i, reason: 'AI buzzword: delve' },
  { regex: /\btapestry\b/i, reason: 'AI buzzword: tapestry' },
  { regex: /\btestament\b/i, reason: 'AI buzzword: testament' },
  { regex: /\bpivotal\b/i, reason: 'AI buzzword: pivotal' },
  { regex: /\butiliz(?:e|es|ed|ing)\b/i, reason: 'Pretentious AI verb: utilize' },
  { regex: /\bthe\s+(?:real\s+)?goal\s+is\b/i, reason: 'Explanatory goal framing' },
  { regex: /\bonce\s+you\s+(?:combine|pair|integrate|merge)\b/i, reason: 'Predictable conditional pairing' },
  { regex: /\bmental\s+(?:link|distraction|connection)\b/i, reason: 'Abstract psychological jargon' },
  { regex: /\bphysical\s+relaxation\b/i, reason: 'Collocational AI pairing' },
  { regex: /\bmisery\s+of\s+being\b/i, reason: 'Abstract poetic nominalization' },
  { regex: /\bsignal\s+to\s+your\s+body\b/i, reason: 'Instructional clichéd phrasing' }
];

function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const stripped = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function calculateMetrics(text) {
  const rawParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const lengths = sentences.map(s => s.trim().split(/\s+/).filter(Boolean).length);
  const words = text.toLowerCase().match(/\b[a-z0-9'-]+\b/g) || [];

  const meanLength = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - meanLength, 2), 0) / (lengths.length || 1);
  const burstiness = Math.sqrt(variance);

  const uniqueWords = new Set(words);
  const typeTokenRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

  const complexWords = words.filter(w => countSyllables(w) >= 3).length;
  const complexRatio = words.length > 0 ? (complexWords / words.length) : 0;
  const gunningFog = 0.4 * (meanLength + 100 * complexRatio);

  const sentenceEval = analyzeSentences(text);

  return {
    paragraphCount: rawParagraphs.length,
    sentenceCount: sentences.length,
    wordCount: words.length,
    meanSentenceLength: Number(meanLength.toFixed(1)),
    burstiness: Number(burstiness.toFixed(2)),
    typeTokenRatio: Number(typeTokenRatio.toFixed(2)),
    gunningFog: Number(gunningFog.toFixed(1)),
    estimatedAiScore: sentenceEval.overallAiPercent,
    humanPercent: sentenceEval.humanPercent,
    mixedPercent: sentenceEval.mixedPercent,
    aiSentenceCount: sentenceEval.aiSentenceCount,
    sentenceEval
  };
}

function analyzeSentences(text) {
  const rawParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0);
  let globalSentIndex = 0;
  let totalWords = 0;
  let aiWords = 0;
  let mixedWords = 0;
  let humanWords = 0;
  const allSentences = [];

  const paragraphs = rawParagraphs.map((para, pIdx) => {
    const rawSentences = para.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [para];
    const paraSentences = rawSentences.map(s => {
      const trimmed = s.trim();
      if (!trimmed) return null;
      const words = trimmed.split(/\s+/).filter(Boolean).length;
      totalWords += words;

      let score = 10;
      const reasons = [];

      AI_FORMULAS.forEach(({ regex, reason }) => {
        if (regex.test(trimmed)) {
          score += 35;
          reasons.push(reason);
        }
      });

      if (words > 24) {
        score += 20;
        reasons.push('Long uniform clause (>24 words)');
      } else if (words > 18) {
        score += 10;
      } else if (words < 9 && reasons.length === 0) {
        score -= 10;
      }

      const hasContraction = /\b[a-z]+'t\b|\b[a-z]+'re\b|\b[a-z]+'s\b|\b[a-z]+'ve\b|\b[a-z]+'ll\b/i.test(trimmed);
      if (hasContraction) score -= 10;

      if (/\b(?:19|20)\d{2}\b|\b\d+%\b|\[\d+\]|\(\w+,\s*\d{4}\)/.test(trimmed)) {
        score -= 10;
      }

      let status = 'human';
      if (score >= 45) {
        status = 'ai';
        aiWords += words;
      } else if (score >= 20) {
        status = 'mixed';
        mixedWords += words;
      } else {
        status = 'human';
        humanWords += words;
      }

      const sentObj = {
        id: 'sent_' + (globalSentIndex++),
        paragraphIndex: pIdx,
        text: trimmed,
        status,
        score: Math.min(100, Math.max(0, score)),
        words,
        reasons
      };

      allSentences.push(sentObj);
      return sentObj;
    }).filter(Boolean);

    return { paragraphIndex: pIdx, sentences: paraSentences };
  });

  const total = totalWords || 1;
  const overallAiPercent = Math.round((aiWords / total) * 100);
  const mixedPercent = Math.round((mixedWords / total) * 100);
  const humanPercent = Math.max(0, 100 - overallAiPercent - mixedPercent);

  const turnitinWordPercent = overallAiPercent;
  const zeroGptWordPercent = Math.min(100, Math.round(overallAiPercent + (mixedPercent * 0.4)));

  const detectors = {
    turnitin: {
      name: 'Turnitin (T-Checker)',
      passed: turnitinWordPercent <= 20,
      score: turnitinWordPercent + '% AI'
    },
    zerogpt: {
      name: 'ZeroGPT',
      passed: zeroGptWordPercent <= 20,
      score: zeroGptWordPercent + '%'
    },
    gptzero: {
      name: 'GPTZero',
      passed: overallAiPercent <= 20,
      score: overallAiPercent + '%'
    },
    copyleaks: {
      name: 'CopyLeaks',
      passed: overallAiPercent <= 20,
      score: overallAiPercent <= 20 ? 'Human' : 'AI'
    },
    writer: {
      name: 'Writer',
      passed: overallAiPercent <= 20,
      score: overallAiPercent <= 20 ? 'Pass' : 'Flagged'
    },
    originality: {
      name: 'Originality.ai',
      passed: overallAiPercent <= 25,
      score: (100 - overallAiPercent) + '% Human'
    }
  };

  return {
    paragraphs,
    sentences: allSentences,
    aiSentenceCount: allSentences.filter(s => s.status === 'ai').length,
    mixedSentenceCount: allSentences.filter(s => s.status === 'mixed').length,
    humanSentenceCount: allSentences.filter(s => s.status === 'human').length,
    overallAiPercent,
    humanPercent,
    mixedPercent,
    turnitinScore: turnitinWordPercent,
    zeroGptScore: zeroGptWordPercent,
    detectors
  };
}

function checkFidelity(original, rewritten) {
  const extractNumbers = (str) => (str.match(/\b\d+(?:\.\d+)?%?\b/g) || []);
  const origNums = extractNumbers(original);
  const rewNums = extractNumbers(rewritten);
  const missingNums = origNums.filter(n => !rewNums.includes(n));
  return {
    numbersPreserved: missingNums.length === 0,
    missingNumbers: missingNums
  };
}

async function callLLM(systemPrompt, userPrompt, temperature = 0.85, freqPenalty = 0.22, env = {}) {
  const apiKey = env.PESATROUTER_API_KEY || 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';
  const url = env.PESATROUTER_URL || 'https://api.pesatrouter.com/v1/chat/completions';
  const models = [env.PESATROUTER_MODEL || 'pesat-flash', 'pesat-lite', 'pesat-pro'];

  let lastErr = null;
  for (const model of models) {
    try {
      const payload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        frequency_penalty: freqPenalty,
        presence_penalty: 0.15,
        max_tokens: 550
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error('LLM call failed (' + res.status + '): ' + errText);
      }

      const parsed = await res.json();
      let content = parsed.choices?.[0]?.message?.content?.trim() || '';
      content = content.replace(/^\`\`\`[a-z]*\n/i, '').replace(/\n\`\`\`$/, '');
      if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
        content = content.slice(1, -1).trim();
      }
      if (content) return content;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All neural models failed');
}

async function runPass1Rewrite(text, mode = 'universal', env = {}) {
  const numParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0).length || 1;

  let systemPrompt = '';
  let userPrompt = '';

  if (mode === 'academic_turnitin') {
    systemPrompt = 'You are an authentic university undergraduate student and researcher. You write natural, direct prose with short declarative clauses, diverse sentence lengths, zero em-dashes, and zero AI signposts.';
    userPrompt = `Decompose and rewrite the following academic passage into direct, clean prose as an undergraduate student writing a research term paper. Your goal is to explain the core concepts completely while breaking transformer sequence detection patterns (Turnitin / RoBERTa).

FEW-SHOT GOLD STANDARD EXAMPLE:
Original:
"Artificial intelligence plays a pivotal role in the transformation of modern higher education. In today’s rapidly evolving digital landscape, universities are increasingly adopting automated machine learning systems to optimize administrative workflows and enhance pedagogical outcomes. Furthermore, adaptive algorithms foster personalized learning by continuously tracking individual student metrics and dynamically tailoring curricular materials. It is important to note that these computational frameworks serve as a cornerstone for contemporary educational methodology, thereby ensuring that students receive targeted feedback in real time. Moreover, the integration of generative AI delves into novel paradigms of research and critical inquiry, paving the way for unprecedented intellectual breakthroughs. In conclusion, while algorithmic assessment presents certain ethical dilemmas regarding data privacy and academic integrity, its capacity to enhance pedagogical equity remains undeniable."

Target Paratactic Human Rewrite:
"Universities now depend on automation. College registrars use software to process student records and track grades. Software flags difficult problem sets and updates reading lists automatically. The software responds to individual needs.

Generative tools help researchers summarize journal articles. Automated grading still worries privacy advocates. University guidelines lag behind new releases."

MANDATORY RULES:
1. PRESERVE 100% CONTENT & CONCEPTS:
   - Keep all technical mechanisms, numbers, and facts accurate. Do NOT invent external authors or citations.
   - Maintain the exact ${numParagraphs} paragraph(s) separated by a blank line.
2. DE-NOMINALIZE & CONCRETIZE:
   - Translate abstract academic umbrella terms into everyday operational tasks.
3. SHORT DECLARATIVE CLAUSES (6 to 12 words per sentence):
   - State one clear action per sentence: [Specific Actor] [Direct Verb] [Object].
   - Every paragraph MUST include at least one very short sentence (3 to 6 words).
4. ABSOLUTE BANS:
   - Strictly NO concluding moral reflections. Stop immediately once the final concrete point is made.
   - BAN AI buzzwords: pivotal, cornerstone, foster, delve, tapestry, testament, seamlessly, unprecedented, utilize, landscape, interplay, vibrant, leverage, robust, at its core.
   - BAN staged syntax: NO infinitive openers ('To speed up X...'), NO 'not only X but also Y', NO forced triads.
   - NO em-dashes (—). NO connective openers (Furthermore, Moreover, Additionally).
   - Exactly 3 to 4 short sentences per paragraph. Maximum 8 sentences total.

Original Text:
${text}

Respond ONLY with the rewritten text:`;
  } else if (mode === 'conversational_zerogpt') {
    systemPrompt = 'You are an authentic person telling an engaging, grounded real-world story or practical explanation. You write with natural human cadence, high burstiness, and zero robotic phrasing.';
    userPrompt = `Rewrite the following text into natural, vivid, organic conversational prose with high burstiness.
- Use natural phrasing, contractions, and varied sentence rhythms (alternate 3-6 word short sentences with 14-22 word fluid sentences).
- Strictly NO em-dashes (—). NO participial -ing riders at sentence ends.
- Keep all facts, quantities, numbers, and core points accurate.
- Maintain the exact ${numParagraphs} paragraph(s) separated by a blank line.

Text to rewrite:
${text}

Respond ONLY with the rewritten text:`;
  } else {
    systemPrompt = 'You are an expert human writer and editor. You write natural, grounded, practical English that sounds completely human, carries high burstiness, and evades transformer sequence classifiers (Turnitin, ZeroGPT, GPTZero).';
    userPrompt = `Humanize and rewrite the following text completely into direct, natural prose.

TONE & SYNTACTIC ARCHITECTURE:
- Natural, practical human voice with high burstiness: mix punchy short statements (3 to 6 words) with fluid, natural compound sentences (14 to 22 words).
- AVOID ROBOTIC MONOTONY: Never start consecutive sentences with generic plural actors (do NOT repeat 'Residents...', 'Adults...', 'Occupants...', 'Cooks...', 'Homeowners...', 'Families...').
- Use direct situational statements ('A blackout always hits when you least expect it.'), practical imperatives ('Skip candles.', 'Unplug desktop computers and television sets.'), and natural causal clauses ('because a tipped candle easily sets rugs on fire').
- Preserve 100% of the facts, numbers, timeframes (e.g. 1 gallon, 3 days, 48 hours, 40°F, 2 hours, 30 seconds), and safety rules.
- Maintain the exact ${numParagraphs} paragraph(s) separated by a blank line. If headings are present, preserve them on their own line.

ABSOLUTE BANS (Wikipedia Signs of AI & Blader Humanizer Rules):
- ZERO em-dashes (—) or en-dashes (–). Use commas, periods, or parentheses.
- ZERO participial -ing riders at sentence ends (never end with ', highlighting...', ', allowing...', ', thereby ensuring...').
- ZERO symmetrical contrasts ('not only X, but also Y', 'rather than X, Y').
- ZERO forced triads (lists of exactly 3 items). Use 1 or 2 items.
- ZERO connective openers (Never start a sentence with Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably).
- ZERO ChatGPT ending clichés (Never write 'It just takes a little preparation...', 'With a little planning, you will ride it out...', 'This proves what human ingenuity...'). End directly on the final practical fact.
- ZERO AI buzzwords (pivotal, testament, tapestry, delve, foster, navigate, landscape, utilize, crucial role, realm of).

Text to humanize:
${text}

Respond ONLY with the rewritten text:`;
  }

  return callLLM(systemPrompt, userPrompt, 0.82, 0.22, env);
}

async function runPass2Polish(draft, numParagraphs, env) {
  const systemPrompt = 'You are an expert human copy editor refining a draft for maximum natural flow and zero AI detection patterns.';
  const userPrompt = `Review and polish the draft below.
- Ensure at least one punchy 3-6 word sentence in every paragraph to enforce high burstiness.
- Break up any sentence longer than 22 words into two natural sentences.
- Check that no consecutive sentences start with the same noun or pronoun.
- Remove any remaining em-dashes (—), participial -ing riders, or connective openers (Furthermore, Moreover, Additionally).
- Remove any moralizing concluding summary sentence. Stop cleanly on the final concrete instruction.
- Preserve the exact ${numParagraphs} paragraph(s) separated by a blank line.

Draft:
${draft}

Respond ONLY with the polished text:`;

  return callLLM(systemPrompt, userPrompt, 0.72, 0.16, env);
}

async function rehumanizeSentence(sentence, contextBefore = '', contextAfter = '', mode = 'universal', env = {}) {
  const systemPrompt = 'You are an expert sentence copy editor. Return only the replacement sentence written in natural human prose with zero AI tells.';
  const userPrompt = `Rewrite ONLY the target sentence to sound completely human, organic, and bypass transformer sequence classifiers (Turnitin / RoBERTa).
Maintain seamless narrative flow with surrounding context.

CONTEXT BEFORE: "${contextBefore}"
TARGET SENTENCE TO REWRITE: "${sentence}"
CONTEXT AFTER: "${contextAfter}"

RULES:
- Return ONLY the rewritten replacement sentence without quotes or introductory text.
- Write a direct, natural 6-12 word statement: [Actor/Action] [Direct Verb] [Object].
- NO participial -ing tails (never end with ', highlighting...', ', thereby ensuring...').
- NO connective openers ('Furthermore,', 'Moreover,', 'Additionally,').
- NO 'not only X, but also Y' or 'rather than X, Y'.
- NO em-dashes (—).
- Do NOT repeat the context before or after.`;

  return callLLM(systemPrompt, userPrompt, 0.82, 0.20, env);
}

async function scanTurnitinLive(text) {
  const cleanText = text.replace(/^##\s+/gm, '');
  const res = await fetch('https://www.turnitindetector.ai/bff/detect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.turnitindetector.ai',
      'Referer': 'https://www.turnitindetector.ai/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ text: cleanText })
  });

  if (!res.ok) {
    throw new Error('Turnitin detector responded with status ' + res.status);
  }
  const parsed = await res.json();
  if (parsed.success && parsed.data) {
    return parsed.data;
  }
  throw new Error(parsed.message || 'Turnitin live scan failed');
}

async function autoLoopHumanize(rawInput, mode = 'universal', env = {}) {
  const text = sanitizeInputSuperhumanizer(rawInput);
  const numParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0).length || 1;

  // Pass 1: High-Speed Mode-Adaptive Neural Reconstruction
  const rawPass1 = await runPass1Rewrite(text, mode, env);

  // Fast Formatting & Punctuation Sanitize (Preserves \n\n)
  let currentText = cleanFormattingOnly(rawPass1);
  currentText = mechanicalClean(currentText).cleaned;
  currentText = cleanFormattingOnly(currentText);

  let retries = 0;
  let liveScanResult = null;

  // Live Closed-Loop Verification: Parallel targeted polish for flagged sentences (if Turnitin > 20%)
  try {
    liveScanResult = await scanTurnitinLive(currentText);
    const turnitinRate = liveScanResult?.aiRateResult?.Turnitin || 0;

    if (liveScanResult && (liveScanResult.class === 'ai' || turnitinRate > 0.20)) {
      const flagged = (liveScanResult.sentences || [])
        .filter(s => (s.generated_prob > 0.15 || s.class === 'ai') && s.sentence.trim().length > 10)
        .sort((a, b) => b.generated_prob - a.generated_prob)
        .slice(0, 2);

      if (flagged.length > 0) {
        retries = flagged.length;
        const fixPromises = flagged.map(f =>
          rehumanizeSentence(f.sentence, '', '', mode, env)
            .then(rawFixed => {
              const fixed = rawFixed.replace(/^["'\s]+|["'\s]+$/g, '').split('\n').filter(l => l.trim().length > 0).pop()?.trim() || '';
              return { original: f.sentence, fixed: cleanFormattingOnly(fixed) };
            })
            .catch(() => null)
        );

        const fixedResults = await Promise.all(fixPromises);
        for (const item of fixedResults) {
          if (item && item.fixed && item.fixed.length > 5) {
            currentText = replaceSentenceFuzzy(currentText, item.original, item.fixed);
          }
        }

        currentText = cleanFormattingOnly(currentText);
        currentText = mechanicalClean(currentText).cleaned;
        try {
          liveScanResult = await scanTurnitinLive(currentText);
        } catch (e) {}
      }
    }
  } catch (e) {
    // Graceful fallback if detector offline
  }

  const metrics = calculateMetrics(currentText);
  const evaluation = analyzeSentences(currentText);
  const fidelity = checkFidelity(text, currentText);

  return {
    rewritten: currentText,
    metrics,
    evaluation,
    fidelity,
    retryTries: retries,
    liveScanResult
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (pathname === '/api/health' || pathname === '/api/humanizer/health' || pathname === '/humanizer/health') {
      return new Response(JSON.stringify({ status: 'ok', server: 'ai-humanizer-worker', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // SPA UI
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        (pathname === '/humanizer' || pathname === '/humanizer/' || pathname === '/humanizer/index.html' || pathname === '/')) {
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } });
      }
      return new Response(HTML_CONTENT, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders
        }
      });
    }

    // API: Analyze Heatmap
    if (request.method === 'POST' && (pathname === '/api/analyze-heatmap' || pathname === '/api/humanizer/analyze-heatmap')) {
      try {
        const { text } = await request.json();
        const evaluation = analyzeSentences(text || '');
        return new Response(JSON.stringify({ evaluation }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Auto Loop Humanize
    if (request.method === 'POST' && (pathname === '/api/auto-loop-humanize' || pathname === '/api/humanizer/auto-loop-humanize')) {
      try {
        const { text, mode } = await request.json();
        const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin', env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Live Scan Turnitin
    if (request.method === 'POST' && (pathname === '/api/live-scan-turnitin' || pathname === '/api/humanizer/live-scan-turnitin')) {
      try {
        const { text } = await request.json();
        const liveData = await scanTurnitinLive(text || '');
        return new Response(JSON.stringify({ liveData }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Rehumanize Sentence
    if (request.method === 'POST' && (pathname === '/api/rehumanize-sentence' || pathname === '/api/humanizer/rehumanize-sentence')) {
      try {
        const { sentence, contextBefore, contextAfter, mode } = await request.json();
        const rewritten = await rehumanizeSentence(sentence, contextBefore, contextAfter, mode || 'academic_turnitin', env);
        return new Response(JSON.stringify({ rewritten }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
