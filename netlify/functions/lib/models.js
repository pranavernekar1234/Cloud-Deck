'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true, unique: true,
      trim: true, lowercase: true,
      minlength: 3, maxlength: 30,
      match: [/^[a-z0-9_]+$/, 'Alphanumeric + underscore only'],
    },
    password: {
      type: String, required: true,
      select: false, // never returned in queries by default
    },
    role: {
      type: String, enum: ['admin', 'student'], default: 'student',
    },
    // Non-explicit deny — must be explicitly set to true
    permissions: {
      viewExams:       { type: Boolean, default: true  },
      takeExams:       { type: Boolean, default: true  },
      importQuestions: { type: Boolean, default: false },
      manageUsers:     { type: Boolean, default: false },
    },
    isActive:  { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.verifyPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toProfile = function () {
  return {
    id: this._id, username: this.username,
    role: this.role, permissions: this.permissions,
    createdAt: this.createdAt, lastLogin: this.lastLogin,
  };
};

// ─── Option ───────────────────────────────────────────────────────────────────
const optionSchema = new mongoose.Schema(
  { text: { type: String, required: true, trim: true },
    correct: { type: Boolean, default: false } },
  { _id: false }
);

// ─── Question ─────────────────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    examSetId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSet', required: true, index: true },
    questionNumber: { type: String, trim: true },
    questionText:   { type: String, required: true, trim: true },
    options:        { type: [optionSchema], validate: v => v.length >= 2 && v.length <= 6 },
    explanation:    { type: String, trim: true, default: 'No explanation provided.' },
    chooseTwo:      { type: Boolean, default: false },
    correctCount:   { type: Number, default: 1 },
    order:          { type: Number, default: 0 },
    tags:           [String],
  },
  { timestamps: true }
);

// Auto-compute chooseTwo + correctCount from options
questionSchema.pre('save', function (next) {
  if (this.options?.length) {
    this.correctCount = this.options.filter(o => o.correct).length;
    this.chooseTwo    = this.correctCount === 2;
  }
  next();
});

// ─── ExamSet ──────────────────────────────────────────────────────────────────
const examSetSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true },
    category:      { type: String, trim: true, default: 'General' },
    description:   { type: String, trim: true },
    tags:          [{ type: String, trim: true }],
    // AWS-style key-value metadata tags for resource management & filtering
    metadata:      { type: Map, of: String },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questionCount: { type: Number, default: 0 },
    isPublished:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── SessionResult ────────────────────────────────────────────────────────────
const sessionResultSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSet', required: true },
    score:     { type: Number, required: true },
    total:     { type: Number, required: true },
    pct:       { type: Number, required: true },
    answers: [{
      questionId:      mongoose.Schema.Types.ObjectId,
      selectedIndices: [Number],
      correct:         Boolean,
      _id: false,
    }],
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── AuditLog (CloudTrail-style governance) ───────────────────────────────────
const auditLogSchema = new mongoose.Schema(
  {
    actor:     { type: String, required: true },   // username
    actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action:    { type: String, required: true },   // e.g. "IMPORT_QUESTIONS"
    resource:  { type: String },                   // e.g. exam set title
    detail:    { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    success:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Models — guard against OverwriteModelError in warm Lambda invocations
const User          = mongoose.models.User          || mongoose.model('User',          userSchema);
const Question      = mongoose.models.Question      || mongoose.model('Question',      questionSchema);
const ExamSet       = mongoose.models.ExamSet       || mongoose.model('ExamSet',       examSetSchema);
const SessionResult = mongoose.models.SessionResult || mongoose.model('SessionResult', sessionResultSchema);
const AuditLog      = mongoose.models.AuditLog      || mongoose.model('AuditLog',      auditLogSchema);

module.exports = { User, Question, ExamSet, SessionResult, AuditLog };
