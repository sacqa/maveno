import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: 'super_admin';
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AdminSessionRecord {
  sessionId: string;
  adminId: string;
  username: string;
  email: string;
  role: 'super_admin';
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
}

export interface PasswordResetChallenge {
  resetTokenHash: string;
  otpCodeHash: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

export interface AuthAuditLogEntry {
  id: string;
  timestamp: string;
  event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'REGISTRATION_BLOCKED'
    | 'UNAUTHORIZED_API_ACCESS';
  actor: string;
  ipAddress: string;
  details: string;
}

interface AdminVaultData {
  admin: AdminUserRecord;
  sessions: Record<string, AdminSessionRecord>;
  resetChallenges: PasswordResetChallenge[];
  auditLogs: AuthAuditLogEntry[];
}

// Pre-computed 64-byte scrypt hash for initial admin credentials (Username: noonnashpati, Email: shahzaibahmadniaz@gmail.com)
// Plaintext password is never stored in frontend or backend code.
const INITIAL_ADMIN_SALT = 'a8f5f167f44f4964e6c998dee827110c';
const INITIAL_ADMIN_SCRYPT_HASH =
  '851fedf407b50f3605d16efe4c34c0f83d4ba193fbf592411afa0daf92a5916a13a35fcae11915f11f9652743d1cabcb2d014853557626206e57adf12fd824fd';

const VAULT_DIR = path.resolve(process.cwd(), '.data');
const VAULT_FILE = path.join(VAULT_DIR, 'admin-auth-vault.json');

// Server-side HMAC secret for signing session tokens
const SESSION_HMAC_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(`aura-qatar-admin-secret-${INITIAL_ADMIN_SALT}`).digest('hex');

/**
 * Derives a 64-byte scrypt hash from a plaintext password and hex salt.
 */
export function hashPasswordScrypt(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derivedKey.toString('hex'),
  };
}

/**
 * Constant-time verification of a password against a stored salt and scrypt hash.
 */
export function verifyPasswordScrypt(password: string, storedSalt: string, storedHashHex: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, storedSalt, 64);
    const storedBuffer = Buffer.from(storedHashHex, 'hex');
    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates an HMAC-SHA256 signed session token from a sessionId.
 */
export function createSignedSessionToken(sessionId: string): string {
  const signature = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(sessionId)
    .digest('hex');
  return `${sessionId}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token and returns the sessionId if valid.
 */
export function verifySignedSessionToken(token: string): string | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, providedSig] = parts;
  if (!sessionId || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(sessionId)
    .digest('hex');

  if (
    providedSig.length !== expectedSig.length ||
    !/^[0-9a-f]+$/i.test(providedSig)
  ) {
    return null;
  }

  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Parses cookies from a raw Cookie header string.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      const value = decodeURIComponent(parts.join('=').trim());
      list[key] = value;
    }
  });
  return list;
}

class AdminAuthController {
  private vault: AdminVaultData;
  private failedAttemptsByIp: Map<string, { count: number; lockUntil: number }> = new Map();

  constructor() {
    this.vault = this.loadOrInitVault();
  }

  private getDefaultAdmin(): AdminUserRecord {
    return {
      id: 'admin_primary_01',
      username: 'noonnashpati',
      email: 'shahzaibahmadniaz@gmail.com',
      role: 'super_admin',
      passwordSalt: INITIAL_ADMIN_SALT,
      passwordHash: INITIAL_ADMIN_SCRYPT_HASH,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private loadOrInitVault(): AdminVaultData {
    try {
      if (!fs.existsSync(VAULT_DIR)) {
        fs.mkdirSync(VAULT_DIR, { recursive: true });
      }
      if (fs.existsSync(VAULT_FILE)) {
        const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as AdminVaultData;
        if (
          parsed &&
          parsed.admin &&
          parsed.admin.username === 'noonnashpati' &&
          parsed.admin.email === 'shahzaibahmadniaz@gmail.com'
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh vault
    }

    const initialVault: AdminVaultData = {
      admin: this.getDefaultAdmin(),
      sessions: {},
      resetChallenges: [],
      auditLogs: [
        {
          id: 'audit_' + Date.now(),
          timestamp: new Date().toISOString(),
          event: 'LOGIN_SUCCESS',
          actor: 'system_bootstrap',
          ipAddress: '127.0.0.1',
          details: 'Initialized cryptographic scrypt admin vault for noonnashpati (shahzaibahmadniaz@gmail.com).',
        },
      ],
    };
    this.saveVault(initialVault);
    return initialVault;
  }

  private saveVault(data: AdminVaultData = this.vault) {
    try {
      if (!fs.existsSync(VAULT_DIR)) {
        fs.mkdirSync(VAULT_DIR, { recursive: true });
      }
      fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore write error in read-only environments
    }
  }

  public logAudit(
    event: AuthAuditLogEntry['event'],
    actor: string,
    ipAddress: string,
    details: string
  ) {
    this.vault.auditLogs.unshift({
      id: 'audit_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      timestamp: new Date().toISOString(),
      event,
      actor,
      ipAddress,
      details,
    });
    if (this.vault.auditLogs.length > 100) {
      this.vault.auditLogs = this.vault.auditLogs.slice(0, 100);
    }
    this.saveVault();
  }

  public getAuditLogs(): AuthAuditLogEntry[] {
    return [...this.vault.auditLogs];
  }

  public authenticateLogin(
    identifier: string,
    password: string,
    rememberMe: boolean,
    ipAddress: string,
    userAgent: string
  ):
    | {
        success: true;
        token: string;
        expiresAt: number;
        admin: { id: string; username: string; email: string; role: string; lastLoginAt: string };
      }
    | { success: false; status: number; error: string } {
    // Check brute-force rate limit
    const now = Date.now();
    const attempt = this.failedAttemptsByIp.get(ipAddress);
    if (attempt && attempt.lockUntil > now) {
      const waitSec = Math.ceil((attempt.lockUntil - now) / 1000);
      return {
        success: false,
        status: 429,
        error: `Too many failed login attempts. Account temporarily locked for ${waitSec} seconds.`,
      };
    }

    const normId = (identifier || '').trim().toLowerCase();
    const admin = this.vault.admin;
    const isIdentifierMatch =
      normId === admin.username.toLowerCase() || normId === admin.email.toLowerCase();

    // Always run scrypt verification even if username/email doesn't match to prevent timing enumeration
    const passwordMatches = verifyPasswordScrypt(
      password || '',
      admin.passwordSalt,
      admin.passwordHash
    );

    if (!isIdentifierMatch || !passwordMatches) {
      const prevCount = attempt ? attempt.count + 1 : 1;
      const lockUntil = prevCount >= 8 ? now + 60 * 1000 : 0;
      this.failedAttemptsByIp.set(ipAddress, { count: prevCount, lockUntil });

      this.logAudit(
        'LOGIN_FAILED',
        identifier || 'unknown',
        ipAddress,
        `Invalid credentials provided (Attempt #${prevCount}).`
      );
      return {
        success: false,
        status: 401,
        error: 'Invalid admin username/email or password. Access denied.',
      };
    }

    // Reset failed attempts on success
    this.failedAttemptsByIp.delete(ipAddress);

    // Prune expired sessions
    Object.keys(this.vault.sessions).forEach((sid) => {
      if (this.vault.sessions[sid].expiresAt <= now) {
        delete this.vault.sessions[sid];
      }
    });

    const sessionId = crypto.randomBytes(32).toString('hex');
    const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const expiresAt = now + ttlMs;
    const lastLoginAt = new Date().toISOString();

    admin.lastLoginAt = lastLoginAt;

    const sessionRecord: AdminSessionRecord = {
      sessionId,
      adminId: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      rememberMe,
      createdAt: now,
      expiresAt,
      ipAddress,
      userAgent,
    };

    this.vault.sessions[sessionId] = sessionRecord;
    this.logAudit(
      'LOGIN_SUCCESS',
      admin.username,
      ipAddress,
      `Authenticated session created (Remember Me: ${rememberMe ? '30d' : '12h'}).`
    );

    const token = createSignedSessionToken(sessionId);
    return {
      success: true,
      token,
      expiresAt,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLoginAt,
      },
    };
  }

  public verifySessionFromRequest(req: Request): AdminSessionRecord | null {
    let rawToken: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
    }

    if (!rawToken) {
      const cookies = parseCookies(req.headers.cookie);
      rawToken = cookies['aura_admin_session'];
    }

    if (!rawToken) return null;

    const sessionId = verifySignedSessionToken(rawToken);
    if (!sessionId) return null;

    const session = this.vault.sessions[sessionId];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      delete this.vault.sessions[sessionId];
      this.saveVault();
      return null;
    }

    return session;
  }

  public revokeSessionFromRequest(req: Request, ipAddress: string): boolean {
    const session = this.verifySessionFromRequest(req);
    if (!session) return false;
    delete this.vault.sessions[session.sessionId];
    this.logAudit('LOGOUT', session.username, ipAddress, 'Admin session explicitly revoked on logout.');
    return true;
  }

  public initiatePasswordReset(
    email: string,
    ipAddress: string
  ):
    | {
        success: true;
        resetToken: string;
        verificationOtp: string;
        expiresInMinutes: number;
        maskedEmail: string;
      }
    | { success: false; error: string } {
    const normEmail = (email || '').trim().toLowerCase();
    const admin = this.vault.admin;

    if (normEmail !== admin.email.toLowerCase()) {
      this.logAudit(
        'PASSWORD_RESET_REQUESTED',
        email || 'unknown',
        ipAddress,
        'Rejected password reset request for unrecognized email.'
      );
      return {
        success: false,
        error: 'No authorized administrator account matches that email address.',
      };
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const otpCode = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();

    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const otpCodeHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    // Valid for 15 minutes
    const expiresAt = Date.now() + 15 * 60 * 1000;

    this.vault.resetChallenges = this.vault.resetChallenges.filter(
      (c) => !c.used && c.expiresAt > Date.now()
    );
    this.vault.resetChallenges.push({
      resetTokenHash,
      otpCodeHash,
      email: admin.email,
      expiresAt,
      used: false,
    });

    this.logAudit(
      'PASSWORD_RESET_REQUESTED',
      admin.email,
      ipAddress,
      'Issued 15-minute cryptographic password reset challenge.'
    );

    return {
      success: true,
      resetToken,
      verificationOtp: otpCode,
      expiresInMinutes: 15,
      maskedEmail: admin.email,
    };
  }

  public completePasswordReset(
    resetToken: string,
    otpCode: string,
    usernameConfirmation: string,
    newPassword: string,
    ipAddress: string
  ): { success: true } | { success: false; error: string } {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'New password must be at least 8 characters long.',
      };
    }

    const admin = this.vault.admin;
    if ((usernameConfirmation || '').trim().toLowerCase() !== admin.username.toLowerCase()) {
      return {
        success: false,
        error: 'Username confirmation does not match the primary administrator account.',
      };
    }

    const resetTokenHash = crypto.createHash('sha256').update(resetToken || '').digest('hex');
    const otpCodeHash = crypto.createHash('sha256').update((otpCode || '').trim()).digest('hex');

    const challenge = this.vault.resetChallenges.find(
      (c) =>
        !c.used &&
        c.expiresAt > Date.now() &&
        c.resetTokenHash === resetTokenHash &&
        c.otpCodeHash === otpCodeHash
    );

    if (!challenge) {
      return {
        success: false,
        error: 'Invalid or expired security recovery code. Please request a new code.',
      };
    }

    challenge.used = true;
    const { salt, hash } = hashPasswordScrypt(newPassword);
    admin.passwordSalt = salt;
    admin.passwordHash = hash;
    admin.updatedAt = new Date().toISOString();

    // Invalidate all existing sessions upon password change
    this.vault.sessions = {};

    this.logAudit(
      'PASSWORD_RESET_COMPLETED',
      admin.username,
      ipAddress,
      'Administrator password updated with new salted scrypt hash and all prior sessions revoked.'
    );

    return { success: true };
  }
}

export const adminAuthController = new AdminAuthController();

/**
 * Express middleware that protects all backend /api/admin/* endpoints.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = adminAuthController.verifySessionFromRequest(req);
  if (!session) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    adminAuthController.logAudit(
      'UNAUTHORIZED_API_ACCESS',
      'unauthenticated_client',
      ip,
      `Blocked unauthorized request to ${req.method} ${req.originalUrl}`
    );
    return res.status(401).json({
      authenticated: false,
      error: 'Unauthorized: Valid administrator authentication required.',
      redirectTo: '/admin/login',
    });
  }
  (req as Request & { adminSession?: AdminSessionRecord }).adminSession = session;
  next();
}
