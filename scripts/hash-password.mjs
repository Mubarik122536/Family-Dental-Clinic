/**
 * Generate a PBKDF2 password hash for seeding D1 users.
 * Uses the same algorithm as functions/api/_auth.js
 *
 * Usage:
 *   node scripts/hash-password.mjs <password>
 *
 * Example:
 *   node scripts/hash-password.mjs admin123
 *   → pbkdf2:3f8a...:9c1b...
 *
 * Copy the output and paste into your INSERT or UPDATE SQL.
 */
import { webcrypto } from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

const enc = new TextEncoder();
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
const hex = arr => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
console.log(`pbkdf2:${hex(salt)}:${hex(new Uint8Array(bits))}`);
