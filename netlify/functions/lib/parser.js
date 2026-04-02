'use strict';
/**
 * parser.js — Resilient AWS Exam Question Parser
 *
 * Handles Q1)…Q64) blocks from PDF/Word copy-paste with multi-symbol
 * correct/incorrect detection and Choose Two auto-identification.
 *
 * Technical Verification:
 *   Q10: S3 (Cross-Region Replication) + DynamoDB (Global Tables) — both correct
 *   Q30: Standard Reserved Instances — largest 75% discount
 *   Glacier: Most cost-effective for 10-year medical record archival
 */

// ─── Correct answer detection patterns ────────────────────────────────────────
const CORRECT_RE = [
  /✓/, /✔/, /·\s*✓\s*·/,
  /\(correct\)/i, /\[correct\]/i,
  /→\s*correct/i,
];

// ─── Explanation start patterns ───────────────────────────────────────────────
const EXPLANATION_RE = /^(?:Explanation:-?|Rationale:|Why:|Note:)\s*/i;

/**
 * parseMetaTags — parse "Key: Value" AWS-style resource tag pairs
 * Used for "resource management and filtering" of exam sets.
 */
function parseMetaTags(text) {
  const tags = {};
  (text || '').split('\n').forEach(line => {
    const m = line.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (m) tags[m[1].trim()] = m[2].trim();
  });
  return tags;
}

/**
 * sanitize — strip all answer indicator symbols and normalise whitespace
 */
function sanitize(str) {
  return str
    .replace(/✓|✔/g, '').replace(/✗|✘/g, '')
    .replace(/·\s*✓\s*·/g, '')
    .replace(/\(correct\)/gi, '').replace(/\(incorrect\)/gi, '')
    .replace(/\[correct\]/gi, '').replace(/\[incorrect\]/gi, '')
    .replace(/→\s*correct/gi, '')
    .replace(/\s{2,}/g, ' ').trim();
}

function isCorrect(raw) {
  return CORRECT_RE.some(p => { p.lastIndex = 0; return p.test(raw); });
}

/**
 * parseBlock — parse one Qn) text block into a structured question
 */
function parseBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const qMatch = lines[0].match(/^(Q\d+)\)/);
  if (!qMatch) return null;

  const questionNumber = qMatch[1];
  const questionText   = sanitize(lines[0]);

  const options = [];
  const explLines = [];
  let inExpl = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!inExpl && EXPLANATION_RE.test(line)) {
      inExpl = true;
      const rest = line.replace(EXPLANATION_RE, '').trim();
      if (rest) explLines.push(rest);
      continue;
    }
    if (inExpl) { explLines.push(line); continue; }

    // Standard lettered option: A. text  or  A) text
    const lettered = line.match(/^[-–•]?\s*([A-F])[.)]\s+(.+)$/);
    if (lettered) {
      const raw = lettered[2];
      options.push({ text: sanitize(raw), correct: isCorrect(line) || isCorrect(raw) });
      continue;
    }

    // Bullet option: • ● ▪ ▸
    const bullet = line.match(/^[•●▪▸]\s+(.+)$/);
    if (bullet && options.length < 6) {
      const raw = bullet[1];
      options.push({ text: sanitize(raw), correct: isCorrect(line) || isCorrect(raw) });
    }
  }

  const correctCount = options.filter(o => o.correct).length;
  const chooseTwo    = correctCount === 2;

  let finalText = questionText;
  if (chooseTwo && !/choose two|select two/i.test(questionText)) {
    finalText += ' (Choose TWO.)';
  }

  return {
    questionNumber,
    questionText: finalText,
    options,
    explanation: explLines.join(' ').trim() || 'No explanation provided.',
    correctCount,
    chooseTwo,
  };
}

/**
 * parseRawText — main entry point
 */
function parseRawText(rawText) {
  if (!rawText?.trim()) return { questions: [], errors: ['Input text is empty.'] };

  const blocks    = rawText.split(/(?=Q\d+\))/g).filter(b => b.trim());
  const questions = [];
  const errors    = [];

  blocks.forEach(block => {
    try {
      const q = parseBlock(block);
      if (!q) return;
      if (!q.options.length) {
        errors.push(`${q.questionNumber}: No options detected.`);
      } else if (!q.correctCount) {
        errors.push(`${q.questionNumber}: No correct answer detected — check symbols.`);
      } else {
        questions.push(q);
      }
    } catch (err) {
      errors.push(`Parse error: ${err.message}`);
    }
  });

  return { questions, errors };
}

module.exports = { parseRawText, parseMetaTags, sanitize };
