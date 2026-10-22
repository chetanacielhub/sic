// ============================================================================
// SIC Unified Attendance & Operations Management System
// Rotating Cryptographic QR Challenge Generator & Validator
// ============================================================================

import crypto from 'crypto';

const SECRET_KEY = process.env.SIC_QR_SECRET_KEY || 'sic_rotating_qr_secret_key_2027_ciel_innovation_ecosystem';

export interface GeneratedChallenge {
  challenge: string;
  nonce: string;
  intervalTimestamp: number;
  expiresAt: number;
  remainingSeconds: number;
  rotationIntervalSec: number;
}

export interface VerificationResult {
  valid: boolean;
  nonce?: string;
  intervalTimestamp?: number;
  error?: string;
}

/**
 * Generate a cryptographically signed time-bucketed rotating challenge token.
 * Default rotation: 30 seconds.
 */
export function generateRotatingChallenge(
  sessionId: string,
  rotationIntervalSec = 30
): GeneratedChallenge {
  const nowMs = Date.now();
  const intervalMs = rotationIntervalSec * 1000;
  // Floor to nearest time-bucket interval
  const intervalTimestamp = Math.floor(nowMs / intervalMs) * intervalMs;
  const expiresAt = intervalTimestamp + intervalMs;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - nowMs) / 1000));
  
  // Nonce is uniquely derived from session, secret, and interval bucket to ensure
  // concurrent host displays for the same session stay in sync
  const nonce = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`nonce:${sessionId}:${intervalTimestamp}`)
    .digest('hex')
    .slice(0, 16);

  const payload = `SIC:ATTEND:${sessionId}:${intervalTimestamp}:${nonce}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  const challenge = `${payload}:${signature}`;

  return {
    challenge,
    nonce,
    intervalTimestamp,
    expiresAt,
    remainingSeconds,
    rotationIntervalSec,
  };
}

/**
 * Validates a submitted rotating challenge.
 * Tolerates up to allowedDriftIntervals (e.g. 1 interval = 30s) to account for network transit.
 */
export function verifyRotatingChallenge(
  sessionId: string,
  challengeString: string,
  rotationIntervalSec = 30,
  allowedDriftIntervals = 1
): VerificationResult {
  if (!challengeString || typeof challengeString !== 'string') {
    return { valid: false, error: 'Challenge token is missing or malformed.' };
  }

  const parts = challengeString.split(':');
  // Expected format: SIC:ATTEND:sessionId:intervalTimestamp:nonce:signature
  if (parts.length !== 6 || parts[0] !== 'SIC' || parts[1] !== 'ATTEND') {
    return { valid: false, error: 'Invalid challenge token structure.' };
  }

  const [, , tokenSessionId, rawTimestamp, nonce, submittedSignature] = parts;

  if (tokenSessionId !== sessionId) {
    return { valid: false, error: 'Token is for a different session.' };
  }

  const intervalTimestamp = parseInt(rawTimestamp, 10);
  if (isNaN(intervalTimestamp)) {
    return { valid: false, error: 'Invalid timestamp in token.' };
  }

  // Check signature authenticity
  const payload = `SIC:ATTEND:${tokenSessionId}:${intervalTimestamp}:${nonce}`;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  const signatureMatches = crypto.timingSafeEqual(
    Buffer.from(submittedSignature, 'utf-8'),
    Buffer.from(expectedSignature, 'utf-8')
  );

  if (!signatureMatches) {
    return { valid: false, error: 'Cryptographic signature mismatch. Token is counterfeit or tampered.' };
  }

  // Check temporal validity
  const nowMs = Date.now();
  const intervalMs = rotationIntervalSec * 1000;
  const currentInterval = Math.floor(nowMs / intervalMs) * intervalMs;
  const maxAllowedPast = currentInterval - allowedDriftIntervals * intervalMs;
  const maxAllowedFuture = currentInterval + intervalMs; // allow small positive clock drift

  if (intervalTimestamp < maxAllowedPast) {
    return { valid: false, error: 'QR Code has expired. Please scan the current code displayed by the host.' };
  }

  if (intervalTimestamp > maxAllowedFuture) {
    return { valid: false, error: 'QR Code timestamp is in the future. Check system clock.' };
  }

  return {
    valid: true,
    nonce,
    intervalTimestamp,
  };
}
