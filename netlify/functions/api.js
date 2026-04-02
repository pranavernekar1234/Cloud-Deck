'use strict';
/**
 * api.js — CloudDeck Unified Netlify Function
 *
 * All API routes are handled by this single function, accessible at:
 *   /.netlify/functions/api  (direct)
 *   /api/*                   (via netlify.toml redirect)
 *
 * Routes:
 *   AUTH
 *     POST /api/auth/register
 *     POST /api/auth/login
 *     GET  /api/auth/me
 *     GET  /api/auth/users           [admin]
 *     PATCH /api/auth/users/:id      [admin]
 *     DELETE /api/auth/users/:id     [admin]
 *
 *   EXAMS
 *     GET  /api/exams
 *     GET  /api/exams/:id
 *     DELETE /api/exams/:id          [admin]
 *     POST /api/exams/import         [admin]
 *     POST /api/exams/:id/sessions
 *     GET  /api/exams/sessions/mine
 *
 *   IMPORT (parse raw text)
 *     POST /api/import-questions     [admin]
 *
 *   LOGS (CloudTrail-style audit)
 *     GET  /api/logs                 [admin]
 *
 *   HEALTH
 *     GET  /api/health
 */

const connectDB = require('./lib/db');
const { User, ExamSet, Question, SessionResult, AuditLog } = require('./lib/models');
const { authenticate, requireAdmin, tokenResponse, jsonResp, parseBody, handleError } = require('./lib/auth');
const { parseRawText, parseMetaTags } = require('./lib/parser');
const { seedAdmin, seedExamData } = require('./lib/seed');

let seeded = false;

// ─── Route matching helpers ───────────────────────────────────────────────────
function match(method, pattern, httpMethod, path) {
  if (method !== httpMethod) return null;
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts    = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// ─── Audit logger ─────────────────────────────────────────────────────────────
async function audit(actor, actorId, action, resource, detail, event, success = true) {
  try {
    await AuditLog.create({
      actor, actorId, action, resource, detail, success,
      ipAddress: event.headers['x-forwarded-for'] || event.headers['client-ip'],
      userAgent: event.headers['user-agent'],
    });
  } catch { /* non-blocking */ }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResp(200, {});
  }

  try {
    await connectDB();

    // Auto-seed on cold start (once per Lambda instance lifetime)
    if (!seeded) {
      await seedAdmin();
      await seedExamData();
      seeded = true;
    }

    // Normalise path: strip /.netlify/functions/api prefix if present
    let path = event.path
      .replace('/.netlify/functions/api', '')
      .replace(/^\/api/, '')
      || '/';

    // Remove trailing slash (except root)
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    const method = event.httpMethod;
    const body   = parseBody(event);

    // ── Health ──────────────────────────────────────────────────────────────
    if (match('GET', '/health', method, path)) {
      return jsonResp(200, { ok: true, status: 'CloudDeck API', timestamp: new Date() });
    }

    // ── POST /auth/register ─────────────────────────────────────────────────
    if (match('POST', '/auth/register', method, path)) {
      const { username, password } = body;
      if (!username || !password) return jsonResp(400, { ok: false, error: 'Username and password required.' });
      if (password.length < 8) return jsonResp(400, { ok: false, error: 'Password must be at least 8 characters.' });
      const user = await User.create({
        username: username.trim().toLowerCase(),
        password,
        role: 'student',
        permissions: { viewExams: true, takeExams: true, importQuestions: false, manageUsers: false },
      });
      await audit(user.username, user._id, 'REGISTER', 'user', null, event);
      return jsonResp(201, tokenResponse(user));
    }

    // ── POST /auth/login ────────────────────────────────────────────────────
    if (match('POST', '/auth/login', method, path)) {
      const { username, password } = body;
      if (!username || !password) return jsonResp(400, { ok: false, error: 'Username and password required.' });
      const user = await User.findOne({ username: username.trim().toLowerCase() }).select('+password');
      if (!user || !user.isActive) return jsonResp(401, { ok: false, error: 'Invalid credentials.' });
      if (!await user.verifyPassword(password)) return jsonResp(401, { ok: false, error: 'Invalid credentials.' });
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
      await audit(user.username, user._id, 'LOGIN', 'user', null, event);
      return jsonResp(200, tokenResponse(user));
    }

    // ── GET /auth/me ────────────────────────────────────────────────────────
    if (match('GET', '/auth/me', method, path)) {
      const user = await authenticate(event);
      return jsonResp(200, { ok: true, user: user.toProfile() });
    }

    // ── GET /auth/users [admin] ─────────────────────────────────────────────
    if (match('GET', '/auth/users', method, path)) {
      const user = await authenticate(event);
      requireAdmin(user);
      const users = await User.find().sort({ createdAt: -1 });
      return jsonResp(200, { ok: true, users: users.map(u => u.toProfile()) });
    }

    // ── PATCH /auth/users/:id [admin] ───────────────────────────────────────
    let params;
    if ((params = match('PATCH', '/auth/users/:id', method, path))) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const { permissions, isActive } = body;
      const updated = await User.findByIdAndUpdate(params.id, { permissions, isActive }, { new: true });
      if (!updated) return jsonResp(404, { ok: false, error: 'User not found.' });
      await audit(actor.username, actor._id, 'UPDATE_USER_PERMISSIONS', updated.username, { permissions }, event);
      return jsonResp(200, { ok: true, user: updated.toProfile() });
    }

    // ── DELETE /auth/users/:id [admin] ──────────────────────────────────────
    if ((params = match('DELETE', '/auth/users/:id', method, path))) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const target = await User.findById(params.id);
      if (!target) return jsonResp(404, { ok: false, error: 'User not found.' });
      if (target.username === 'admin1234') return jsonResp(400, { ok: false, error: 'Cannot delete the root admin.' });
      await User.findByIdAndDelete(params.id);
      await audit(actor.username, actor._id, 'DELETE_USER', target.username, null, event);
      return jsonResp(200, { ok: true, message: 'User deleted.' });
    }

    // ── GET /exams/sessions/mine ────────────────────────────────────────────
    if (match('GET', '/exams/sessions/mine', method, path)) {
      const user = await authenticate(event);
      const sessions = await SessionResult.find({ userId: user._id })
        .sort({ completedAt: -1 })
        .populate('examSetId', 'title category')
        .lean();
      return jsonResp(200, { ok: true, sessions });
    }

    // ── GET /exams ──────────────────────────────────────────────────────────
    if (match('GET', '/exams', method, path)) {
      await authenticate(event);
      const sets = await ExamSet.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
      return jsonResp(200, { ok: true, examSets: sets });
    }

    // ── POST /exams/import [admin] ──────────────────────────────────────────
    if (match('POST', '/exams/import', method, path)) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const { title, category, description, tags, metadata, questions } = body;
      if (!title?.trim()) return jsonResp(400, { ok: false, error: 'Title required.' });
      if (!questions?.length) return jsonResp(400, { ok: false, error: 'No questions to import.' });

      const set = await ExamSet.create({
        title: title.trim(), category: category || 'General',
        description: description || '', tags: tags || [],
        metadata: metadata ? new Map(Object.entries(metadata)) : undefined,
        createdBy: actor._id, questionCount: questions.length,
      });

      const docs = questions.map((q, i) => ({
        examSetId: set._id, questionNumber: q.questionNumber || `Q${i + 1}`,
        questionText: q.questionText, options: q.options,
        explanation: q.explanation, chooseTwo: q.chooseTwo || false,
        correctCount: q.correctCount || 1, order: i,
      }));
      await Question.insertMany(docs);

      await audit(actor.username, actor._id, 'IMPORT_QUESTIONS', title, {
        count: questions.length,
        chooseTwoCount: questions.filter(q => q.chooseTwo).length,
      }, event);

      return jsonResp(201, { ok: true, message: `Imported ${questions.length} questions into "${title}".`, examSetId: set._id });
    }

    // ── GET /exams/:id ──────────────────────────────────────────────────────
    if ((params = match('GET', '/exams/:id', method, path))) {
      await authenticate(event);
      const set = await ExamSet.findById(params.id).lean();
      if (!set) return jsonResp(404, { ok: false, error: 'Exam set not found.' });
      const questions = await Question.find({ examSetId: params.id }).sort({ order: 1 }).lean();
      return jsonResp(200, { ok: true, examSet: set, questions });
    }

    // ── DELETE /exams/:id [admin] ───────────────────────────────────────────
    if ((params = match('DELETE', '/exams/:id', method, path))) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const set = await ExamSet.findById(params.id);
      if (!set) return jsonResp(404, { ok: false, error: 'Exam set not found.' });
      await Question.deleteMany({ examSetId: params.id });
      await ExamSet.findByIdAndDelete(params.id);
      await audit(actor.username, actor._id, 'DELETE_EXAM_SET', set.title, null, event);
      return jsonResp(200, { ok: true, message: `Deleted "${set.title}".` });
    }

    // ── POST /exams/:id/sessions ────────────────────────────────────────────
    if ((params = match('POST', '/exams/:id/sessions', method, path))) {
      const user = await authenticate(event);
      const { score, total, pct, answers } = body;
      const session = await SessionResult.create({
        userId: user._id, examSetId: params.id,
        score, total, pct, answers: answers || [],
      });
      return jsonResp(201, { ok: true, session });
    }

    // ── POST /import-questions [admin] ──────────────────────────────────────
    if (match('POST', '/import-questions', method, path)) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const { rawText, metaText } = body;
      if (!rawText?.trim()) return jsonResp(400, { ok: false, error: 'rawText required.' });
      const { questions, errors } = parseRawText(rawText);
      const metadata = parseMetaTags(metaText || '');
      return jsonResp(200, {
        ok: true, parsed: questions, errors, metadata,
        stats: { total: questions.length, chooseTwoCount: questions.filter(q => q.chooseTwo).length, errorCount: errors.length },
      });
    }

    // ── GET /logs [admin] ───────────────────────────────────────────────────
    if (match('GET', '/logs', method, path)) {
      const actor = await authenticate(event);
      requireAdmin(actor);
      const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
      return jsonResp(200, { ok: true, logs });
    }

    // ── 404 ─────────────────────────────────────────────────────────────────
    return jsonResp(404, { ok: false, error: `Route not found: ${method} ${path}` });

  } catch (err) {
    return handleError(err);
  }
};
