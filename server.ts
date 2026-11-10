import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_BLOG_POSTS,
  INITIAL_COUNTRIES,
  INITIAL_CURRENCIES,
  INITIAL_DISCOUNTS,
  INITIAL_GIFT_CARDS,
  INITIAL_SETTINGS,
} from './src/data/initial-database';
import {
  calculateOrderFinancials,
  evaluateGiftCardRedemption,
  resolveProductPrice,
  getAvailableShippingMethods,
} from './src/utils/commerce-engine';
import {
  adminAuthController,
  requireAdminAuth,
  AdminSessionRecord,
} from './src/server/admin-auth';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Robots.txt route
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/login
Disallow: /checkout
Disallow: /account

Sitemap: ${APP_URL}/sitemap.xml
`);
  });

  // 2. Dynamic XML Sitemap route
  app.get('/sitemap.xml', (req, res) => {
    const urls: string[] = [
      `${APP_URL}/`,
      ...INITIAL_CATEGORIES.map((c) => `${APP_URL}/#category-${c.slug}`),
      ...INITIAL_PRODUCTS.map((p) => `${APP_URL}/#product-${p.slug}`),
      ...INITIAL_BLOG_POSTS.map((b) => `${APP_URL}/#guide-${b.slug}`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.endsWith('/') ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
  });

  // 3. Public Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      environment: isProduction ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      activeMarkets: INITIAL_COUNTRIES.filter((c) => c.status === 'approved').length,
    });
  });

  // ============================================================================
  // 4. BACKEND ADMIN AUTHENTICATION API (/api/admin/auth/*)
  // ============================================================================

  // Explicitly disable public admin registration
  app.all('/api/admin/auth/register', (req, res) => {
    const ip = getClientIp(req);
    adminAuthController.logAudit(
      'REGISTRATION_BLOCKED',
      req.body?.username || req.body?.email || 'anonymous',
      ip,
      'Blocked public admin registration attempt (Disabled by security policy).'
    );
    res.status(403).json({
      error: 'Public administrator registration is permanently disabled.',
    });
  });

  // Admin Login (verifies salted scrypt password hash on backend)
  app.post('/api/admin/auth/login', (req, res) => {
    const { identifier, password, rememberMe } = req.body || {};
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    const result = adminAuthController.authenticateLogin(
      String(identifier || ''),
      String(password || ''),
      Boolean(rememberMe),
      ip,
      userAgent
    );

    if (!result.success) {
      return res.status(result.status).json({
        authenticated: false,
        error: result.error,
      });
    }

    const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
    res.setHeader(
      'Set-Cookie',
      `aura_admin_session=${encodeURIComponent(
        result.token
      )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`
    );

    return res.status(200).json({
      authenticated: true,
      token: result.token,
      expiresAt: result.expiresAt,
      admin: result.admin,
    });
  });

  // Verify Active Admin Session
  app.get('/api/admin/auth/session', (req, res) => {
    const session = adminAuthController.verifySessionFromRequest(req);
    if (!session) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    return res.status(200).json({
      authenticated: true,
      admin: {
        id: session.adminId,
        username: session.username,
        email: session.email,
        role: session.role,
        expiresAt: session.expiresAt,
        rememberMe: session.rememberMe,
      },
    });
  });

  // Admin Logout (revokes session token on server & clears HttpOnly cookie)
  app.post('/api/admin/auth/logout', (req, res) => {
    const ip = getClientIp(req);
    adminAuthController.revokeSessionFromRequest(req, ip);
    res.setHeader(
      'Set-Cookie',
      'aura_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );
    return res.status(200).json({
      success: true,
      message: 'Administrator session terminated.',
    });
  });

  // Forgot Password Step 1: Request Reset Token & OTP
  app.post('/api/admin/auth/forgot-password', (req, res) => {
    const { email } = req.body || {};
    const ip = getClientIp(req);
    const result = adminAuthController.initiatePasswordReset(String(email || ''), ip);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      resetToken: result.resetToken,
      verificationOtp: result.verificationOtp,
      expiresInMinutes: result.expiresInMinutes,
      email: result.maskedEmail,
      message: `Recovery verification code generated for ${result.maskedEmail}.`,
    });
  });

  // Forgot Password Step 2: Verify OTP + Username & Set New Scrypt-Hashed Password
  app.post('/api/admin/auth/reset-password', (req, res) => {
    const { resetToken, otpCode, username, newPassword } = req.body || {};
    const ip = getClientIp(req);

    const result = adminAuthController.completePasswordReset(
      String(resetToken || ''),
      String(otpCode || ''),
      String(username || ''),
      String(newPassword || ''),
      ip
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.setHeader(
      'Set-Cookie',
      'aura_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );

    return res.status(200).json({
      success: true,
      message: 'Password securely hashed and updated. Please sign in with your new password.',
    });
  });

  // ============================================================================
  // 5. PROTECTED BACKEND ADMIN APIs (/api/admin/*)
  //    All routes below require a valid, non-expired backend admin session.
  // ============================================================================
  app.use('/api/admin', requireAdminAuth);

  app.get('/api/admin/security-status', (req, res) => {
    const session = (req as express.Request & { adminSession?: AdminSessionRecord }).adminSession!;
    res.json({
      status: 'protected',
      hashAlgorithm: 'scrypt (N=16384, r=8, p=1, 64-byte key + 16-byte salt)',
      tokenSignature: 'HMAC-SHA256 Server-Verified Session',
      publicRegistration: 'disabled',
      authenticatedAdmin: {
        username: session.username,
        email: session.email,
        role: session.role,
        expiresAt: session.expiresAt,
      },
      auditLogs: adminAuthController.getAuditLogs(),
    });
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    res.json({
      logs: adminAuthController.getAuditLogs(),
    });
  });

  app.post('/api/admin/verify-action', (req, res) => {
    const session = (req as express.Request & { adminSession?: AdminSessionRecord }).adminSession!;
    const { action } = req.body || {};
    res.json({
      authorized: true,
      verifiedBy: session.username,
      action: action || 'admin_mutation',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // 5b. Backend Checkout Financial Calculation & Idempotent Payment Processing
  // ============================================================================
  const processedPaymentsByIdempotencyKey = new Map<
    string,
    {
      transactionId: string;
      paymentStatus: 'captured' | 'authorized';
      orderNumber: string;
      amountMinorUnits: number;
      currencyCode: string;
      processedAt: string;
    }
  >();

  app.post('/api/checkout/calculate', (req, res) => {
    try {
      const {
        items = [],
        countryCode = 'QA',
        currencyCode = 'QAR',
        shippingMethodId = 'doha_same_day',
        discountCode = '',
        giftCardCode = '',
        customDiscounts,
        customGiftCards,
        freeShippingThresholdMinorUnits,
      } = req.body || {};

      const country =
        INITIAL_COUNTRIES.find((c) => c.code.toUpperCase() === String(countryCode).toUpperCase()) ||
        INITIAL_COUNTRIES[0];
      const currency =
        INITIAL_CURRENCIES.find((c) => c.code.toUpperCase() === String(currencyCode).toUpperCase()) ||
        INITIAL_CURRENCIES[0];

      // Calculate authoritative subtotal from line items
      let subtotalMinorUnits = 0;
      const verifiedItems = (Array.isArray(items) ? items : []).map((item: any) => {
        const prod = INITIAL_PRODUCTS.find((p) => p.id === item.productId);
        const variant = prod?.variants.find((v) => v.id === item.variantId) || prod?.variants[0];
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitPriceMinorUnits = prod
          ? resolveProductPrice(prod, country.code, currency, 1.0, variant)
          : Math.max(0, Number(item.unitPriceMinorUnits) || 0);
        const lineTotal = unitPriceMinorUnits * qty;
        subtotalMinorUnits += lineTotal;
        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: qty,
          unitPriceMinorUnits,
          totalPriceMinorUnits: lineTotal,
        };
      });

      const shippingMethods = getAvailableShippingMethods(country, currency, INITIAL_SETTINGS);
      const selectedShippingMethod =
        shippingMethods.find((m) => m.id === shippingMethodId) || shippingMethods[0];

      const discountsPool = Array.isArray(customDiscounts) ? customDiscounts : INITIAL_DISCOUNTS;
      const matchedDiscount = discountCode
        ? discountsPool.find(
            (d: any) => String(d.code).toUpperCase() === String(discountCode).trim().toUpperCase()
          ) || null
        : null;

      // First pass without gift card to determine gross amount due
      const preGiftCardFinancials = calculateOrderFinancials({
        subtotalMinorUnits,
        country,
        currency,
        freeShippingThresholdMinorUnits:
          freeShippingThresholdMinorUnits ?? INITIAL_SETTINGS.freeShippingThresholdMinorUnits,
        shippingMethodOption: selectedShippingMethod,
        discountRule: matchedDiscount,
      });

      const giftCardsPool = Array.isArray(customGiftCards) ? customGiftCards : INITIAL_GIFT_CARDS;
      const giftCardEval = evaluateGiftCardRedemption({
        amountDueMinorUnits: preGiftCardFinancials.totalAmountMinorUnits,
        giftCards: giftCardsPool,
        giftCardCode,
      });

      const finalFinancials = calculateOrderFinancials({
        subtotalMinorUnits,
        country,
        currency,
        freeShippingThresholdMinorUnits:
          freeShippingThresholdMinorUnits ?? INITIAL_SETTINGS.freeShippingThresholdMinorUnits,
        shippingMethodOption: selectedShippingMethod,
        discountRule: matchedDiscount,
        giftCardAppliedMinorUnits: giftCardEval.valid ? giftCardEval.appliedMinorUnits : 0,
      });

      res.json({
        verifiedItems,
        shippingMethod: selectedShippingMethod,
        financials: finalFinancials,
        discountApplied: Boolean(
          matchedDiscount &&
            (finalFinancials.discountMinorUnits > 0 || matchedDiscount.type === 'free_shipping')
        ),
        giftCardApplied: giftCardEval.valid,
        giftCardRemainingBalanceMinorUnits: giftCardEval.remainingBalanceMinorUnits,
        calculatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to calculate checkout financials.' });
    }
  });

  app.post('/api/checkout/process-payment', (req, res) => {
    const {
      idempotencyKey,
      orderNumber,
      amountMinorUnits,
      currencyCode = 'QAR',
      paymentMethod = 'credit_card_gateway',
      paymentToken,
      cardBrand,
      cardLast4,
      payerEmail,
      simulateDecline = false,
      rawCardNumber,
      cvv,
    } = req.body || {};

    // Never accept or store raw card details on the server
    if (rawCardNumber || cvv) {
      res.status(400).json({
        success: false,
        paymentStatus: 'failed',
        errorCode: 'PCI_RAW_CARD_FORBIDDEN',
        message: 'Security policy violation: Raw card details must be tokenized before transmission.',
      });
      return;
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      res.status(400).json({
        success: false,
        paymentStatus: 'failed',
        errorCode: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Missing checkout idempotency key.',
      });
      return;
    }

    // Check idempotency registry to prevent duplicate payment processing
    const existingRecord = processedPaymentsByIdempotencyKey.get(idempotencyKey);
    if (existingRecord) {
      res.json({
        success: true,
        duplicatePrevented: true,
        ...existingRecord,
      });
      return;
    }

    // Handle simulated or test card payment failure for retry UX
    if (simulateDecline || cardLast4 === '0002') {
      res.status(402).json({
        success: false,
        paymentStatus: 'failed',
        errorCode: 'CARD_DECLINED_BY_ISSUER',
        message: `Payment authorization declined by issuing bank for ${cardBrand || 'Card'} ending in ${
          cardLast4 || '0002'
        } (3D-Secure / Insufficient Funds). Please check your payment details or select another payment method and retry.`,
      });
      return;
    }

    const paymentStatus: 'captured' | 'authorized' =
      paymentMethod === 'cash_on_delivery' || paymentMethod === 'wire_transfer_swift'
        ? 'authorized'
        : 'captured';

    const prefix =
      paymentMethod === 'paypal_express'
        ? 'PAYPAL_QA_'
        : paymentMethod === 'apple_google_pay'
        ? 'WALLET_QA_'
        : paymentMethod === 'cash_on_delivery'
        ? 'COD_QA_'
        : 'QPAY_3DS_';

    const transactionId =
      prefix + Math.random().toString(36).substring(2, 12).toUpperCase();
    const processedAt = new Date().toISOString();

    const record = {
      transactionId,
      paymentStatus,
      orderNumber: String(orderNumber || 'AURA-QA-ORD'),
      amountMinorUnits: Number(amountMinorUnits) || 0,
      currencyCode: String(currencyCode),
      cardBrand: cardBrand || undefined,
      cardLast4: cardLast4 || undefined,
      payerEmail: payerEmail || undefined,
      paymentToken: paymentToken || undefined,
      processedAt,
    };

    processedPaymentsByIdempotencyKey.set(idempotencyKey, record);

    res.json({
      success: true,
      duplicatePrevented: false,
      ...record,
    });
  });

  // ============================================================================
  // 5c. Real-Time Storefront Analytics & Live View Engine (SSE + Authoritative State)
  // ============================================================================
  interface ServerVisitorSession {
    sessionId: string;
    visitorId: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    trafficSource: 'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Campaign';
    countryCode: string;
    countryName: string;
    city: string;
    lat: number;
    lng: number;
    currentPage: string;
    cartItemCount: number;
    cartValueMinorUnits: number;
    inCheckout: boolean;
    viewedProductIds: string[];
    addedToCart: boolean;
    reachedCheckout: boolean;
    completedPurchase: boolean;
    startedAt: string;
    lastSeenAt: string;
    isOnline: boolean;
  }

  interface ServerAnalyticsEvent {
    eventId: string;
    type:
      | 'session_start'
      | 'page_view'
      | 'product_view'
      | 'add_to_cart'
      | 'cart_updated'
      | 'checkout_started'
      | 'purchase_completed'
      | 'heartbeat'
      | 'session_leave';
    sessionId: string;
    visitorId: string;
    timestamp: string;
    countryCode: string;
    countryName: string;
    city: string;
    lat: number;
    lng: number;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    trafficSource: 'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Campaign';
    pagePath?: string;
    productId?: string;
    productName?: string;
    variantTitle?: string;
    quantity?: number;
    amountMinorUnits?: number;
    orderId?: string;
    orderNumber?: string;
  }

  const visitorSessions = new Map<string, ServerVisitorSession>();
  const analyticsEvents: ServerAnalyticsEvent[] = [];
  const processedEventIds = new Set<string>();
  const sseClients = new Set<express.Response>();

  const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes active window

  function buildLiveAnalyticsSnapshot() {
    const now = Date.now();
    const allSessions: ServerVisitorSession[] = [];
    let activeVisitorsRightNow = 0;
    let activeCartsRightNow = 0;
    let checkingOutRightNow = 0;
    let purchasedInActiveSessions = 0;

    visitorSessions.forEach((sess) => {
      const ageMs = now - new Date(sess.lastSeenAt).getTime();
      const currentlyActive = sess.isOnline && ageMs <= ACTIVE_WINDOW_MS;
      const enriched: ServerVisitorSession = {
        ...sess,
        isOnline: currentlyActive,
      };
      allSessions.push(enriched);
      if (currentlyActive) {
        activeVisitorsRightNow += 1;
        if (sess.cartItemCount > 0) {
          activeCartsRightNow += 1;
        }
        if (sess.inCheckout) {
          checkingOutRightNow += 1;
        }
        if (sess.completedPurchase) {
          purchasedInActiveSessions += 1;
        }
      }
    });

    return {
      timestamp: new Date().toISOString(),
      liveCounters: {
        activeVisitorsRightNow,
        activeCartsRightNow,
        checkingOutRightNow,
        purchasedRightNow: purchasedInActiveSessions,
      },
      sessions: allSessions.sort(
        (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
      ),
      recentEvents: analyticsEvents.slice(0, 120),
    };
  }

  function broadcastLiveAnalytics() {
    if (sseClients.size === 0) return;
    const payload = `data: ${JSON.stringify(buildLiveAnalyticsSnapshot())}\n\n`;
    sseClients.forEach((clientRes) => {
      try {
        clientRes.write(payload);
      } catch {
        sseClients.delete(clientRes);
      }
    });
  }

  app.post('/api/analytics/track', (req, res) => {
    const body = req.body || {};
    const sessionId = String(body.sessionId || '').trim();
    const visitorId = String(body.visitorId || '').trim();
    if (!sessionId || !visitorId) {
      return res.status(400).json({ error: 'Missing sessionId or visitorId' });
    }

    const eventId = String(body.eventId || `${sessionId}_${Date.now()}_${Math.random()}`);
    if (processedEventIds.has(eventId)) {
      return res.json({ ok: true, duplicate: true, snapshot: buildLiveAnalyticsSnapshot() });
    }
    processedEventIds.add(eventId);

    const nowIso = new Date().toISOString();
    const type: ServerAnalyticsEvent['type'] = body.type || 'page_view';
    const deviceType: ServerVisitorSession['deviceType'] =
      body.deviceType === 'mobile' || body.deviceType === 'tablet' ? body.deviceType : 'desktop';
    const trafficSource: ServerVisitorSession['trafficSource'] =
      body.trafficSource === 'Organic Search' ||
      body.trafficSource === 'Social' ||
      body.trafficSource === 'Referral' ||
      body.trafficSource === 'Campaign'
        ? body.trafficSource
        : 'Direct';

    const countryCode = String(body.countryCode || 'QA').toUpperCase();
    const countryName = String(body.countryName || 'Qatar');
    const city = String(body.city || 'Doha');
    const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : 25.2854;
    const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : 51.531;

    const existing = visitorSessions.get(sessionId);
    const viewedSet = new Set<string>(existing?.viewedProductIds || []);
    if (body.productId) {
      viewedSet.add(String(body.productId));
    }

    const cartItemCount =
      typeof body.cartItemCount === 'number'
        ? Math.max(0, body.cartItemCount)
        : existing?.cartItemCount || 0;
    const cartValueMinorUnits =
      typeof body.cartValueMinorUnits === 'number'
        ? Math.max(0, body.cartValueMinorUnits)
        : existing?.cartValueMinorUnits || 0;
    const inCheckout =
      typeof body.inCheckout === 'boolean'
        ? body.inCheckout
        : type === 'checkout_started'
        ? true
        : type === 'purchase_completed'
        ? false
        : existing?.inCheckout || false;

    const updatedSession: ServerVisitorSession = {
      sessionId,
      visitorId,
      deviceType,
      trafficSource: existing?.trafficSource || trafficSource,
      countryCode,
      countryName,
      city,
      lat,
      lng,
      currentPage: String(body.pagePath || existing?.currentPage || '/'),
      cartItemCount,
      cartValueMinorUnits,
      inCheckout,
      viewedProductIds: Array.from(viewedSet),
      addedToCart:
        Boolean(existing?.addedToCart) || type === 'add_to_cart' || cartItemCount > 0,
      reachedCheckout:
        Boolean(existing?.reachedCheckout) || type === 'checkout_started' || inCheckout,
      completedPurchase:
        Boolean(existing?.completedPurchase) || type === 'purchase_completed',
      startedAt: existing?.startedAt || nowIso,
      lastSeenAt: nowIso,
      isOnline: type !== 'session_leave',
    };

    visitorSessions.set(sessionId, updatedSession);

    if (type !== 'heartbeat') {
      const newEvent: ServerAnalyticsEvent = {
        eventId,
        type,
        sessionId,
        visitorId,
        timestamp: nowIso,
        countryCode,
        countryName,
        city,
        lat,
        lng,
        deviceType,
        trafficSource: updatedSession.trafficSource,
        pagePath: body.pagePath,
        productId: body.productId,
        productName: body.productName,
        variantTitle: body.variantTitle,
        quantity: body.quantity,
        amountMinorUnits: body.amountMinorUnits,
        orderId: body.orderId,
        orderNumber: body.orderNumber,
      };
      analyticsEvents.unshift(newEvent);
      if (analyticsEvents.length > 500) {
        analyticsEvents.length = 500;
      }
    }

    broadcastLiveAnalytics();
    return res.json({
      ok: true,
      snapshot: buildLiveAnalyticsSnapshot(),
    });
  });

  app.get('/api/analytics/state', (req, res) => {
    res.json(buildLiveAnalyticsSnapshot());
  });

  app.get('/api/analytics/live-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial authoritative state immediately
    res.write(`data: ${JSON.stringify(buildLiveAnalyticsSnapshot())}\n\n`);
    sseClients.add(res);

    const keepAliveTimer = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify(buildLiveAnalyticsSnapshot())}\n\n`);
      } catch {
        clearInterval(keepAliveTimer);
        sseClients.delete(res);
      }
    }, 10000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // Catch-all for any unknown /api/* route
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.originalUrl} not found.` });
  });

  // 6. Vite Middlewares (Dev) or Static Files (Prod)
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Prerendering & Crawlable HTML fallback handler for SPAs
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        // Inject server-rendered crawlable content for web crawlers & SEO bots
        const crawlableProductList = INITIAL_PRODUCTS.map(
          (p) =>
            `<article><h3>${p.name}</h3><p>${p.shortDescription}</p><span>Brand: ${p.brand}</span></article>`
        ).join('\n');

        const crawlableMarkup = `
          <div id="seo-prerender" style="display:none" aria-hidden="true">
            <h1>AURA International – Luxury Vapor Hardware &amp; Botanical E-Liquids</h1>
            <p>International sovereign ecommerce platform featuring multi-currency pricing, destination-specific legal compliance, and strict age verification.</p>
            <section>${crawlableProductList}</section>
          </div>
        `;

        const finalHtml = template.replace(
          '<div id="root"></div>',
          `<div id="root"></div>\n${crawlableMarkup}`
        );

        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server operational on port ${PORT} [Mode: ${isProduction ? 'prod' : 'dev'}]`);
  });
}

startServer();
