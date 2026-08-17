/**
 * _auth.js — Web Crypto API auth utilities
 * Works natively in Cloudflare Workers (no npm packages)
 *
 * Password: PBKDF2 (100k iterations, SHA-256)
 * Token:    HMAC-SHA256 JWT (7 day expiry)
 * Cookie:   dental_token (HttpOnly, SameSite=Strict)
 */

const ALGO = { name: 'HMAC', hash: 'SHA-256' };
const TOKEN_EXPIRY_SECS = 7 * 24 * 60 * 60; // 7 days
const COOKIE_NAME = 'dental_token';

// ── JWT ─────────────────────────────────────────────────
function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromB64url(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '='));
}
async function getKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']);
}

export async function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECS, iat: Math.floor(Date.now() / 1000) }));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyJwt(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      ALGO, key,
      Uint8Array.from(fromB64url(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(fromB64url(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ── Password (PBKDF2) ────────────────────────────────────
export async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hash = hex(new Uint8Array(bits));
  const saltHex = hex(salt);
  return `pbkdf2:${saltHex}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits)) === hashHex;
}

function hex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Cookie helpers ────────────────────────────────────────
export function getTokenFromCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function setTokenCookie(token, maxAge = TOKEN_EXPIRY_SECS) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearTokenCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
