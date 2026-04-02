'use strict';
const jwt  = require('jsonwebtoken');
const { User } = require('./models');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured.');
  return s;
}

/**
 * signToken — issue a JWT for a user document
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * tokenResponse — standard auth response shape
 */
function tokenResponse(user) {
  return { ok: true, token: signToken(user._id), user: user.toProfile() };
}

/**
 * verifyToken — decode and verify a JWT string
 * Throws on invalid/expired token.
 */
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

/**
 * extractToken — pull Bearer token from Authorization header
 */
function extractToken(headers) {
  const auth = headers.authorization || headers.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * authenticate — resolve the User from a request's JWT.
 * Returns { user } on success, throws descriptive Error on failure.
 * Implements "non-explicit deny": unauthenticated requests are rejected here.
 */
async function authenticate(event) {
  const token = extractToken(event.headers);
  if (!token) throw Object.assign(new Error('Not authenticated. Please log in.'), { status: 401 });

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    throw Object.assign(new Error(msg), { status: 401 });
  }

  const user = await User.findById(decoded.id).select('+isActive');
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Account not found or deactivated.'), { status: 401 });
  }

  return user;
}

/**
 * requireAdmin — call after authenticate
 */
function requireAdmin(user) {
  if (user.role !== 'admin') {
    throw Object.assign(new Error('Admin privileges required.'), { status: 403 });
  }
}

/**
 * jsonResp — build a Netlify Function response
 */
function jsonResp(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':'Content-Type, Authorization',
      'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * parseBody — safely parse JSON body from a Netlify event
 */
function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); }
  catch { return {}; }
}

/**
 * handleError — convert thrown errors to Netlify responses
 */
function handleError(err) {
  console.error('[API Error]', err.message, err.stack?.split('\n')[1] || '');
  const status = err.status || err.statusCode || 500;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return jsonResp(409, { ok: false, error: `A record with this ${field} already exists.` });
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    const msgs = Object.values(err.errors).map(e => e.message);
    return jsonResp(400, { ok: false, error: msgs.join('. ') });
  }

  const message = (status === 500 && process.env.NODE_ENV === 'production')
    ? 'Internal server error.'
    : err.message || 'Internal server error.';

  return jsonResp(status, { ok: false, error: message });
}

module.exports = { signToken, tokenResponse, verifyToken, authenticate, requireAdmin, jsonResp, parseBody, handleError };
