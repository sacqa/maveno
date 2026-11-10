export interface AuthenticatedAdminProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  lastLoginAt?: string;
  expiresAt?: number;
  rememberMe?: boolean;
}

export interface AuthAuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  ipAddress: string;
  details: string;
}

const TOKEN_LOCAL_KEY = 'aura_admin_session_token_persistent';
const TOKEN_SESSION_KEY = 'aura_admin_session_token_ephemeral';
const REMEMBERED_IDENTIFIER_KEY = 'aura_admin_remembered_identifier';

class AdminAuthClient {
  private unauthorizedListeners: Set<() => void> = new Set();

  public getStoredToken(): string | null {
    try {
      return (
        sessionStorage.getItem(TOKEN_SESSION_KEY) ||
        localStorage.getItem(TOKEN_LOCAL_KEY) ||
        null
      );
    } catch {
      return null;
    }
  }

  private setStoredToken(token: string, rememberMe: boolean) {
    try {
      if (rememberMe) {
        localStorage.setItem(TOKEN_LOCAL_KEY, token);
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
      } else {
        sessionStorage.setItem(TOKEN_SESSION_KEY, token);
        localStorage.removeItem(TOKEN_LOCAL_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }

  public clearStoredToken() {
    try {
      localStorage.removeItem(TOKEN_LOCAL_KEY);
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    } catch {
      // Ignore
    }
  }

  public getRememberedIdentifier(): string {
    try {
      return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';
    } catch {
      return '';
    }
  }

  public setRememberedIdentifier(identifier: string, rememberMe: boolean) {
    try {
      if (rememberMe && identifier.trim()) {
        localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier.trim());
      } else {
        localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      }
    } catch {
      // Ignore
    }
  }

  public onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.add(listener);
    return () => {
      this.unauthorizedListeners.delete(listener);
    };
  }

  private notifyUnauthorized() {
    this.clearStoredToken();
    this.unauthorizedListeners.forEach((cb) => cb());
  }

  public getAuthHeaders(): Record<string, string> {
    const token = this.getStoredToken();
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      : {
          'Content-Type': 'application/json',
        };
  }

  /**
   * Authenticates with the backend server using username/email and password.
   */
  public async login(
    identifier: string,
    password: string,
    rememberMe: boolean
  ): Promise<
    | { success: true; admin: AuthenticatedAdminProfile }
    | { success: false; error: string }
  > {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await response.json();
      if (!response.ok || !data.authenticated) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please check your credentials.',
        };
      }

      if (data.token) {
        this.setStoredToken(data.token, rememberMe);
      }
      this.setRememberedIdentifier(identifier, rememberMe);

      return {
        success: true,
        admin: data.admin,
      };
    } catch {
      return {
        success: false,
        error: 'Network error connecting to authentication server.',
      };
    }
  }

  /**
   * Verifies the current session token with the backend server.
   */
  public async verifySession(): Promise<{
    authenticated: boolean;
    admin?: AuthenticatedAdminProfile;
  }> {
    try {
      const response = await fetch('/api/admin/auth/session', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        this.clearStoredToken();
        return { authenticated: false };
      }

      const data = await response.json();
      if (!data.authenticated || !data.admin) {
        this.clearStoredToken();
        return { authenticated: false };
      }

      return {
        authenticated: true,
        admin: data.admin,
      };
    } catch {
      return { authenticated: false };
    }
  }

  /**
   * Logs out the current administrator and revokes the session on the backend.
   */
  public async logout(): Promise<void> {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'same-origin',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearStoredToken();
    }
  }

  /**
   * Step 1 of Forgot Password: Request a 15-minute cryptographic reset token & OTP.
   */
  public async requestPasswordReset(email: string): Promise<
    | {
        success: true;
        resetToken: string;
        verificationOtp: string;
        expiresInMinutes: number;
        email: string;
        message: string;
      }
    | { success: false; error: string }
  > {
    try {
      const response = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Could not initiate password recovery.',
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to reach authentication server.',
      };
    }
  }

  /**
   * Step 2 of Forgot Password: Complete password reset with OTP, username confirmation, and new password.
   */
  public async completePasswordReset(payload: {
    resetToken: string;
    otpCode: string;
    username: string;
    newPassword: string;
  }): Promise<{ success: true; message: string } | { success: false; error: string }> {
    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Password reset failed.',
        };
      }

      this.clearStoredToken();
      return {
        success: true,
        message: data.message,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to reach authentication server.',
      };
    }
  }

  /**
   * Calls a protected backend admin API endpoint; redirects to login if 401 Unauthorized.
   */
  public async fetchProtectedAdminSecurityStatus(): Promise<{
    authorized: boolean;
    hashAlgorithm?: string;
    tokenSignature?: string;
    publicRegistration?: string;
    auditLogs?: AuthAuditLog[];
  }> {
    try {
      const response = await fetch('/api/admin/security-status', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'same-origin',
      });

      if (response.status === 401) {
        this.notifyUnauthorized();
        return { authorized: false };
      }

      const data = await response.json();
      return {
        authorized: true,
        ...data,
      };
    } catch {
      return { authorized: false };
    }
  }

  /**
   * Verifies any admin write action against the protected backend API.
   */
  public async verifyAdminActionOnBackend(action: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/verify-action', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ action }),
      });

      if (response.status === 401) {
        this.notifyUnauthorized();
        return false;
      }

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const adminAuthClient = new AdminAuthClient();
