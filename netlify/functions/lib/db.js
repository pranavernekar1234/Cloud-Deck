'use strict';
/**
 * db.js — MongoDB Atlas connection for Netlify Functions
 *
 * Netlify Functions are stateless Lambda-style invocations.
 * We cache the Mongoose connection across warm invocations to avoid
 * opening a new TCP connection on every request (cold-start optimisation).
 *
 * MongoDB Atlas automatically replicates data across multiple zones
 * (replica sets with 3+ nodes), providing high availability and
 * protection against server failures — eliminating the need to
 * run and maintain physical data centres.
 */

const mongoose = require('mongoose');

// Module-level cache — persists across warm function invocations
let cachedConn = null;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  // Atlas connection options
  // retryWrites=true  — retry write ops on network errors (Atlas default)
  // w=majority        — write concern: acknowledged by majority of replica-set nodes
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS:          45000,
    // Atlas multi-AZ: Mongoose automatically discovers all replica-set members
    // from the SRV record, enabling failover without reconfiguration.
  });

  cachedConn = conn;
  console.log(`[DB] Connected to MongoDB Atlas (readyState: ${mongoose.connection.readyState})`);
  return conn;
}

module.exports = connectDB;
