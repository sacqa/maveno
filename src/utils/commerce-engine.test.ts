import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProductPrice,
  formatMinorUnits,
  validateCountryEligibility,
  validateCustomerAge,
  calculateOrderFinancials,
  buildImmutableOrderSnapshot,
  calculateProfitAndMargin,
  evaluateAutomatedCollection,
  calculateDiscountBenefit,
  detectDuplicateCustomers,
} from './commerce-engine';
import { Country, Currency, Product, CartItem, AgeVerificationRecord, DiscountRule, CustomerRecord } from '../types/ecommerce';

const mockUsdCurrency: Currency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  exchangeRateToBase: 1.0,
  decimalPrecision: 2,
  symbolPosition: 'before',
  isActive: true,
  lastUpdated: '2026-11-09T00:00:00Z',
};

const mockGbpCurrency: Currency = {
  code: 'GBP',
  symbol: '£',
  name: 'British Pound',
  exchangeRateToBase: 0.79,
  decimalPrecision: 2,
  symbolPosition: 'before',
  isActive: true,
  lastUpdated: '2026-11-09T00:00:00Z',
};

const mockCountryUK: Country = {
  name: 'United Kingdom',
  code: 'GB',
  flagEmoji: '🇬🇧',
  defaultCurrencyCode: 'GBP',
  supportedCurrencyCodes: ['GBP', 'USD', 'EUR'],
  status: 'approved',
  minimumAge: 18,
  ageVerificationRequired: true,
  verificationMethod: 'provider_id_lookup',
  salesEligible: true,
  importRestrictions: 'TPD compliant 2ml tank limit',
  shippingAvailable: true,
  standardTaxRate: 0.20,
  customsDutyRate: 0.0,
  complianceNotes: 'MHRA registered notifications confirmed.',
};

const mockCountryUS: Country = {
  name: 'United States',
  code: 'US',
  flagEmoji: '🇺🇸',
  defaultCurrencyCode: 'USD',
  supportedCurrencyCodes: ['USD'],
  status: 'approved',
  minimumAge: 21,
  ageVerificationRequired: true,
  verificationMethod: 'kyc_document_eval',
  salesEligible: true,
  importRestrictions: 'FDA PMTA regulations applicable',
  shippingAvailable: true,
  standardTaxRate: 0.08,
  customsDutyRate: 0.0,
  complianceNotes: 'Federal 21+ law active.',
};

const mockCountryBlocked: Country = {
  name: 'Singapore',
  code: 'SG',
  flagEmoji: '🇸🇬',
  defaultCurrencyCode: 'SGD',
  supportedCurrencyCodes: ['USD'],
  status: 'blocked',
  minimumAge: 21,
  ageVerificationRequired: true,
  verificationMethod: 'disabled',
  salesEligible: false,
  importRestrictions: 'Total commercial import prohibition',
  shippingAvailable: false,
  standardTaxRate: 0.09,
  customsDutyRate: 0.0,
  complianceNotes: 'Sales, possession and distribution banned under Tobacco Act.',
};

const mockProduct: Product = {
  id: 'prod_1',
  name: 'Titan Titanium Mod',
  slug: 'titan-titanium-mod',
  sku: 'AURA-MOD-01',
  brand: 'Architek',
  vendor: 'Architek Titan',
  categoryId: 'mods',
  productType: 'hardware_mod',
  tags: ['titanium', 'dna60c', 'luxury'],
  shortDescription: 'Precision CNC titanium mod',
  fullDescription: 'High precision luxury vaporizer.',
  galleryImages: ['/src/assets/images/hero_luxury_vape_mod_1794234135797.jpg'],
  specs: { Material: 'Grade 5 Titanium' },
  attributes: [],
  variants: [
    {
      id: 'v1',
      sku: 'AURA-MOD-01-BLK',
      title: 'Black',
      attributes: {},
      priceMinorUnits: 85000,
      stockQuantity: 25,
      weightGrams: 240,
    },
  ],
  status: 'published',
  basePriceMinorUnits: 20000, // $200.00
  countrySpecificPrices: {
    GB: 15500, // £155.00 manual UK price
  },
  currencySpecificPrices: {
    GBP: 15900,
  },
  isAgeRestricted: true,
  complianceWarning: 'Age restricted product',
  featured: true,
  seoTitle: 'Titan Mod',
  seoDescription: 'Titanium mod',
  seoKeywords: ['vape', 'mod'],
};

test('Pricing Priority 1: Uses country-specific manual price if present', () => {
  const priceInUK = resolveProductPrice(mockProduct, 'GB', mockGbpCurrency);
  assert.equal(priceInUK, 15500);
});

test('Pricing Priority 2: Uses currency-specific price if country not overridden', () => {
  const productWithoutCountryPrice: Product = {
    ...mockProduct,
    countrySpecificPrices: {},
  };
  const priceInGbp = resolveProductPrice(productWithoutCountryPrice, 'FR', mockGbpCurrency);
  assert.equal(priceInGbp, 15900);
});

test('Pricing Priority 3: Converts from base price via exchange rate', () => {
  const cleanProduct: Product = {
    ...mockProduct,
    countrySpecificPrices: {},
    currencySpecificPrices: {},
  };
  const priceInGbp = resolveProductPrice(cleanProduct, 'DE', mockGbpCurrency);
  assert.equal(priceInGbp, 15800);
});

test('formatMinorUnits accurately formats currency with minor unit decimals', () => {
  const formattedUsd = formatMinorUnits(12950, mockUsdCurrency);
  assert.match(formattedUsd, /129\.50/);
  assert.match(formattedUsd, /USD/);
});

test('validateCountryEligibility blocks sales for prohibited jurisdictions', () => {
  const checkAllowed = validateCountryEligibility(mockCountryUK);
  assert.equal(checkAllowed.isEligible, true);

  const checkBlocked = validateCountryEligibility(mockCountryBlocked);
  assert.equal(checkBlocked.isEligible, false);
  assert.match(checkBlocked.reason || '', /strictly prohibited/i);
});

test('validateCustomerAge enforces jurisdiction-specific legal age limit', () => {
  const date19YearsAgo = new Date();
  date19YearsAgo.setFullYear(date19YearsAgo.getFullYear() - 19);
  const birthStr = date19YearsAgo.toISOString().split('T')[0];

  const ukAgeCheck = validateCustomerAge(birthStr, mockCountryUK);
  assert.equal(ukAgeCheck.isCompliant, true);
  assert.equal(ukAgeCheck.calculatedAge, 19);

  const usAgeCheck = validateCustomerAge(birthStr, mockCountryUS);
  assert.equal(usAgeCheck.isCompliant, false);
  assert.match(usAgeCheck.errorMessage || '', /Legal minimum age.*21/);
});

test('calculateOrderFinancials computes subtotal, tax, and free shipping accurately', () => {
  const financials = calculateOrderFinancials({
    subtotalMinorUnits: 20000,
    country: mockCountryUK,
    currency: mockGbpCurrency,
    freeShippingThresholdMinorUnits: 15000,
  });

  assert.equal(financials.shippingFeeMinorUnits, 0);
  assert.equal(financials.taxMinorUnits, 4000);
  assert.equal(financials.totalAmountMinorUnits, 24000);
});

test('buildImmutableOrderSnapshot preserves complete financial & compliance records', () => {
  const mockAgeRecord: AgeVerificationRecord = {
    id: 'av_123',
    customerEmail: 'alex@example.com',
    customerName: 'Alex Mercer',
    countryCode: 'GB',
    dateOfBirth: '1995-04-12',
    verifiedAge: 31,
    provider: 'VerifyMyAge UK',
    providerReference: 'VMA-UK-994821',
    status: 'passed',
    timestamp: '2026-11-09T08:00:00Z',
    complianceAuditHash: 'sha256_mock_hash_892182',
  };

  const financials = calculateOrderFinancials({
    subtotalMinorUnits: 15500,
    country: mockCountryUK,
    currency: mockGbpCurrency,
    freeShippingThresholdMinorUnits: 15000,
  });

  const cartItem: CartItem = {
    id: 'ci_1',
    productId: mockProduct.id,
    variantId: 'v_1',
    product: mockProduct,
    variant: {
      id: 'v_1',
      sku: 'AURA-MOD-TI',
      title: 'Titanium Brushed',
      attributes: { Finish: 'Brushed' },
      priceMinorUnits: 15500,
      stockQuantity: 12,
      weightGrams: 240,
    },
    quantity: 1,
    unitPriceMinorUnits: 15500,
    totalPriceMinorUnits: 15500,
  };

  const snapshot = buildImmutableOrderSnapshot({
    orderNumber: 'ORD-2026-GB-1001',
    customer: { fullName: 'Alex Mercer', email: 'alex@example.com', phone: '+44 7700 900077' },
    shippingAddress: {
      addressLine1: '42 Regent Street',
      city: 'London',
      stateOrProvince: 'Greater London',
      postalCode: 'W1B 5AH',
      countryCode: 'GB',
      countryName: 'United Kingdom',
    },
    cartItems: [cartItem],
    country: mockCountryUK,
    currency: mockGbpCurrency,
    ageVerification: mockAgeRecord,
    financials,
    paymentMethod: 'high_risk_approved_gateway',
  });

  assert.equal(snapshot.orderNumber, 'ORD-2026-GB-1001');
  assert.equal(snapshot.compliance.customerVerifiedAge, 31);
  assert.equal(snapshot.compliance.verificationProviderRef, 'VMA-UK-994821');
  assert.equal(snapshot.financials.currencyCode, 'GBP');
  assert.equal(snapshot.financials.subtotalMinorUnits, 15500);
  assert.equal(snapshot.items[0].productName, 'Titan Titanium Mod');
});

test('Qatar (QA) Financials: QAR base currency with 0% VAT and Qatar ID age threshold (21+)', () => {
  const mockQarCurrency: Currency = {
    code: 'QAR',
    symbol: 'QAR ',
    name: 'Qatari Riyal',
    exchangeRateToBase: 1.0,
    decimalPrecision: 2,
    symbolPosition: 'before',
    isBaseCurrency: true,
    isActive: true,
    lastUpdated: '2026-11-09T00:00:00Z',
  };

  const mockCountryQA: Country = {
    name: 'Qatar',
    code: 'QA',
    flagEmoji: '🇶🇦',
    defaultCurrencyCode: 'QAR',
    supportedCurrencyCodes: ['QAR'],
    status: 'approved',
    minimumAge: 21,
    ageVerificationRequired: true,
    verificationMethod: 'provider_id_lookup',
    salesEligible: true,
    importRestrictions: 'MOPH Certified',
    shippingAvailable: true,
    standardTaxRate: 0.0,
    customsDutyRate: 0.0,
    complianceNotes: 'Doha express warehouse.',
  };

  const financials = calculateOrderFinancials({
    subtotalMinorUnits: 85000,
    country: mockCountryQA,
    currency: mockQarCurrency,
    freeShippingThresholdMinorUnits: 35000,
  });

  assert.equal(financials.shippingFeeMinorUnits, 0);
  assert.equal(financials.taxMinorUnits, 0);
  assert.equal(financials.totalAmountMinorUnits, 85000);
});

test('Shopify Admin: calculateProfitAndMargin computes profit and margin percentage accurately', () => {
  const res = calculateProfitAndMargin(85000, 42500);
  assert.equal(res.profitMinorUnits, 42500);
  assert.equal(res.marginPercent, 50);
});

test('Shopify Admin: evaluateAutomatedCollection matches products by tag, price, and inventory rules', () => {
  const matches = evaluateAutomatedCollection(mockProduct, [
    { id: 'c1', field: 'tag', operator: 'contains', value: 'titanium' },
    { id: 'c2', field: 'inventory', operator: 'greater_than', value: '10' },
  ]);
  assert.equal(matches, true);

  const fails = evaluateAutomatedCollection(mockProduct, [
    { id: 'c3', field: 'price', operator: 'greater_than', value: '999' },
  ]);
  assert.equal(fails, false);
});

test('Shopify Admin: calculateDiscountBenefit handles percentage, fixed, free shipping, and BXGY', () => {
  const pctDiscount: DiscountRule = {
    id: 'd1',
    code: 'DOHA20',
    title: '20% Off Doha VIP',
    type: 'percentage',
    method: 'code',
    value: 20,
    minPurchaseMinorUnits: 10000,
    customerEligibility: 'all',
    usedCount: 2,
    startsAt: '2026-11-01',
    status: 'active',
  };
  const benefitPct = calculateDiscountBenefit(50000, 2500, pctDiscount);
  assert.equal(benefitPct.eligible, true);
  assert.equal(benefitPct.discountMinorUnits, 10000);

  const freeShipDiscount: DiscountRule = {
    ...pctDiscount,
    id: 'd2',
    type: 'free_shipping',
    value: 0,
  };
  const benefitShip = calculateDiscountBenefit(50000, 2500, freeShipDiscount);
  assert.equal(benefitShip.freeShippingApplied, true);
  assert.equal(benefitShip.discountMinorUnits, 2500);
});

test('Shopify Admin: detectDuplicateCustomers finds matching customer profiles by phone or name', () => {
  const customers: CustomerRecord[] = [
    {
      id: 'cust_1',
      fullName: 'Tariq Al-Mansoori',
      email: 'tariq@qatar.qa',
      phone: '+974 5512 8844',
      addresses: [],
      tags: ['VIP'],
      notes: '',
      marketingSubscribed: true,
      smsMarketingSubscribed: true,
      segment: 'VIP',
      createdAt: '2026-10-01',
    },
    {
      id: 'cust_2',
      fullName: 'Tariq  Al-Mansoori ',
      email: 'tariq.secondary@doha.qa',
      phone: '+974 5599 1122',
      addresses: [],
      tags: [],
      notes: '',
      marketingSubscribed: false,
      smsMarketingSubscribed: false,
      segment: 'Returning',
      createdAt: '2026-11-05',
    },
  ];

  const dupes = detectDuplicateCustomers(customers);
  assert.equal(dupes.length, 1);
  assert.match(dupes[0].matchReason, /Matching full name/i);
});

import {
  hashPasswordScrypt,
  verifyPasswordScrypt,
  createSignedSessionToken,
  verifySignedSessionToken,
} from '../server/admin-auth';

test('Admin Auth: scrypt password hashing and constant-time verification reject wrong passwords', () => {
  const { salt, hash } = hashPasswordScrypt('SuperSecret#2026');
  assert.equal(verifyPasswordScrypt('SuperSecret#2026', salt, hash), true);
  assert.equal(verifyPasswordScrypt('WrongPassword#2026', salt, hash), false);
});

test('Admin Auth: HMAC-SHA256 signed session tokens detect tampering', () => {
  const sessionId = '9f8e7d6c5b4a3210';
  const token = createSignedSessionToken(sessionId);
  assert.equal(verifySignedSessionToken(token), sessionId);
  assert.equal(verifySignedSessionToken(token + 'tampered'), null);
  assert.equal(verifySignedSessionToken('invalid.token'), null);
});

import {
  parseCsvRaw,
  autoMapCsvColumns,
  parseAndValidateShopifyCsv,
  generateShopifyCsvTemplate,
  exportProductsToShopifyCsv,
} from './shopify-csv';

test('Shopify CSV: RFC 4180 parser handles quoted commas, escaped quotes, and multi-row template', () => {
  const csv = 'Handle,Title,"Body (HTML)",Variant Price\naura-mod,"Titan ""Gold"" Edition, 80W","<p>Luxury, Grade 5</p>",950.00';
  const rows = parseCsvRaw(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'aura-mod');
  assert.equal(rows[1][1], 'Titan "Gold" Edition, 80W');
  assert.equal(rows[1][2], '<p>Luxury, Grade 5</p>');
  assert.equal(rows[1][3], '950.00');
});

test('Shopify CSV: Template parses into multi-variant, multi-image products and detects updates vs creates', () => {
  const templateCsv = generateShopifyCsvTemplate();
  const result = parseAndValidateShopifyCsv(templateCsv, [mockProduct]);

  assert.equal(result.products.length, 2);
  assert.equal(result.errorProductsCount, 0);
  assert.equal(result.newProductsCount, 2);
  assert.equal(result.totalVariantsCount, 4); // 2 variants per product in template
  assert.equal(result.products[0].product.variants.length, 2);
  assert.equal(result.products[0].product.galleryImages.length, 2);

  // Test matching existing product by Handle for update
  const updateCsv = `Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty\ntitan-titanium-mod,Titan Titanium Mod Updated,AURA-MOD-01-BLK,890.00,40`;
  const updateRes = parseAndValidateShopifyCsv(updateCsv, [mockProduct]);
  assert.equal(updateRes.products.length, 1);
  assert.equal(updateRes.products[0].action, 'update');
  assert.equal(updateRes.products[0].existingProductId, 'prod_1');
  assert.equal(updateRes.products[0].product.basePriceMinorUnits, 89000);
  assert.equal(updateRes.products[0].product.variants[0].stockQuantity, 40);
});

test('Shopify CSV: Validator highlights missing title and invalid price or negative stock errors', () => {
  const invalidCsv = [
    'Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty',
    'broken-product,,BROKEN-SKU,-50.00,-5',
  ].join('\n');

  const res = parseAndValidateShopifyCsv(invalidCsv, []);
  assert.equal(res.products.length, 1);
  assert.equal(res.products[0].isValid, false);
  assert.equal(res.errorProductsCount, 1);
  assert.equal(res.products[0].errors.length, 3); // Missing Title, Invalid Price, Invalid Inventory Qty
});

test('Shopify CSV: Exporter generates re-importable multi-row and single-row CSV', () => {
  const exportedMulti = exportProductsToShopifyCsv([mockProduct], [], 'shopify_multirow');
  const reimported = parseAndValidateShopifyCsv(exportedMulti, []);
  assert.equal(reimported.products.length, 1);
  assert.equal(reimported.products[0].handle, 'titan-titanium-mod');
  assert.equal(reimported.products[0].product.variants[0].sku, 'AURA-MOD-01-BLK');

  const exportedSingle = exportProductsToShopifyCsv([mockProduct], [], 'summary_singlerow');
  const singleRows = parseCsvRaw(exportedSingle);
  assert.equal(singleRows.length, 2);
  assert.equal(singleRows[1][0], 'titan-titanium-mod');
});

import { storeDb } from '../services/store-db';
import {
  extractProductSizes,
  extractProductColors,
} from '../components/storefront/ShopAllProductsPage';

test('Bulk Inventory Update: storeDb.bulkUpdateVariantInventory updates stock levels and records StockHistoryEntry', () => {
  const productsBefore = storeDb.getProducts();
  assert.ok(productsBefore.length >= 12, 'Expected at least 12 active products in storeDb');

  const firstProd = productsBefore[0];
  const firstVar = firstProd.variants[0];
  const initialStock = firstVar.stockQuantity;

  const res = storeDb.bulkUpdateVariantInventory(
    [
      {
        productId: firstProd.id,
        variantId: firstVar.id,
        productName: firstProd.name,
        variantTitle: firstVar.title,
        sku: firstVar.sku,
        locationId: 'loc_doha_pearl',
        currentStock: initialStock,
        newStock: initialStock + 35,
        delta: 35,
        reason: 'received',
      },
    ],
    'Unit Test Admin'
  );

  assert.equal(res.updatedVariantsCount, 1);
  assert.equal(res.netDelta, 35);

  const updatedProd = storeDb.getProductById(firstProd.id)!;
  assert.equal(updatedProd.variants[0].stockQuantity, initialStock + 35);

  const history = storeDb.getStockHistory();
  assert.ok(history.length > 0);
  assert.equal(history[0].sku, firstVar.sku);
  assert.equal(history[0].delta, 35);
  assert.equal(history[0].newAvailable, initialStock + 35);
});

test('Homepage Product Display Control & Shop Extractors: updates homepageProductLimit and extracts size/color options', () => {
  storeDb.updateSettings({ homepageProductLimit: 8, shopProductsPerPage: 12 });
  const updatedSettings = storeDb.getSettings();
  assert.equal(updatedSettings.homepageProductLimit, 8);
  assert.equal(updatedSettings.shopProductsPerPage, 12);

  // Restore default 4
  storeDb.updateSettings({ homepageProductLimit: 4, shopProductsPerPage: 8 });

  const allProds = storeDb.getProducts();
  const sizesFound = new Set<string>();
  const colorsFound = new Set<string>();
  allProds.forEach((p) => {
    extractProductSizes(p).forEach((s) => sizesFound.add(s));
    extractProductColors(p).forEach((c) => colorsFound.add(c));
  });

  assert.ok(sizesFound.size >= 4, 'Expected multiple distinct sizes across catalog');
  assert.ok(colorsFound.size >= 4, 'Expected multiple distinct colors across catalog');
});

import {
  evaluateGiftCardRedemption,
  tokenizePaymentCard,
  getAvailableShippingMethods,
} from './commerce-engine';

test('Shopify Checkout: variant price resolution, discount + gift card calculation, card tokenization, and idempotent order creation', () => {
  const qarCurrency = storeDb.getCurrencyByCode('QAR');
  const qatarCountry = storeDb.getCountryByCode('QA')!;
  const prod = storeDb.getProducts()[0];

  // 1. Tokenization never retains raw card number and detects declined test card 0002
  const validToken = tokenizePaymentCard({
    cardNumber: '4532 8810 9921 4481',
    cardholderName: 'HAMAD AL THANI',
    expiry: '09/28',
    cvv: '842',
  });
  assert.equal(validToken.valid, true);
  assert.equal(validToken.cardBrand, 'Visa');
  assert.equal(validToken.cardLast4, '4481');
  assert.equal(validToken.isDeclinedTestCard, false);
  assert.ok(validToken.paymentToken?.startsWith('tok_qa_visa_4481_'));

  const declinedToken = tokenizePaymentCard({
    cardNumber: '5200 1111 2222 0002',
    cardholderName: 'TEST DECLINE',
    expiry: '10/28',
    cvv: '999',
  });
  assert.equal(declinedToken.valid, true);
  assert.equal(declinedToken.cardBrand, 'Mastercard');
  assert.equal(declinedToken.cardLast4, '0002');
  assert.equal(declinedToken.isDeclinedTestCard, true);

  // 2. Shipping methods & financials with discount + gift card
  const shippingMethods = getAvailableShippingMethods(qatarCountry, qarCurrency);
  assert.ok(shippingMethods.length >= 3);
  const vipMethod = shippingMethods.find((m) => m.id === 'vip_concierge')!;

  const pearl15Discount = storeDb
    .getDiscounts()
    .find((d) => d.code === 'PEARL15')!;
  const giftCards = storeDb.getGiftCards();

  const preGiftFinancials = calculateOrderFinancials({
    subtotalMinorUnits: 100000, // 1,000.00 QAR
    country: qatarCountry,
    currency: qarCurrency,
    freeShippingThresholdMinorUnits: 35000,
    shippingMethodOption: vipMethod, // 45.00 QAR (not free over threshold)
    discountRule: pearl15Discount, // 15% off = 150.00 QAR discount
  });
  assert.equal(preGiftFinancials.discountMinorUnits, 15000);
  assert.equal(preGiftFinancials.shippingFeeMinorUnits, 4500);

  const gcEval = evaluateGiftCardRedemption({
    amountDueMinorUnits: preGiftFinancials.totalAmountMinorUnits,
    giftCards,
    giftCardCode: 'AURA-LSL4-5500-GOLD', // 500.00 QAR balance
  });
  assert.equal(gcEval.valid, true);
  assert.equal(gcEval.appliedMinorUnits, 50000);

  const finalFinancials = calculateOrderFinancials({
    subtotalMinorUnits: 100000,
    country: qatarCountry,
    currency: qarCurrency,
    freeShippingThresholdMinorUnits: 35000,
    shippingMethodOption: vipMethod,
    discountRule: pearl15Discount,
    giftCardAppliedMinorUnits: gcEval.appliedMinorUnits,
  });
  assert.equal(finalFinancials.giftCardAppliedMinorUnits, 50000);
  assert.equal(
    finalFinancials.totalAmountMinorUnits,
    preGiftFinancials.totalAmountMinorUnits - 50000
  );

  // 3. Idempotent Order Creation & Inventory Decrement
  const initialStock = prod.variants[0].stockQuantity;
  const ageRec = storeDb.recordAgeVerification({
    customerEmail: 'idempotency.test@doha.qa',
    customerName: 'Idempotency Tester',
    countryCode: 'QA',
    dateOfBirth: '1990-01-01',
    verifiedAge: 36,
    provider: 'Qatar National ID (QID)',
    providerReference: 'QID-29011122233',
    status: 'passed',
  });

  const snapshot = buildImmutableOrderSnapshot({
    orderNumber: 'AURA-QA-IDEM-999',
    idempotencyKey: 'idem_unit_test_key_999',
    customer: {
      fullName: 'Idempotency Tester',
      email: 'idempotency.test@doha.qa',
      phone: '+974 5599 1122',
    },
    shippingAddress: {
      addressLine1: 'Tower 1, The Pearl',
      city: 'Doha',
      stateOrProvince: 'Doha',
      postalCode: 'QA-6601',
      countryCode: 'QA',
      countryName: 'Qatar',
    },
    cartItems: [
      {
        id: 'ci_1',
        productId: prod.id,
        variantId: prod.variants[0].id,
        product: prod,
        variant: prod.variants[0],
        quantity: 2,
        unitPriceMinorUnits: 68000,
        totalPriceMinorUnits: 136000,
      },
    ],
    country: qatarCountry,
    currency: qarCurrency,
    ageVerification: ageRec,
    financials: finalFinancials,
    paymentMethod: 'credit_card_gateway',
    paymentDetails: {
      transactionId: 'QPAY_3DS_TEST999',
      paymentStatus: 'captured',
      cardBrand: 'Visa',
      cardLast4: '4481',
      paymentToken: validToken.paymentToken,
    },
  });

  const created1 = storeDb.createOrder(snapshot);
  const stockAfterFirst = storeDb.getProductById(prod.id)!.variants[0].stockQuantity;
  assert.equal(stockAfterFirst, initialStock - 2);

  // Calling createOrder a second time with the same idempotencyKey must NOT duplicate or decrement stock again
  const created2 = storeDb.createOrder(snapshot);
  const stockAfterSecond = storeDb.getProductById(prod.id)!.variants[0].stockQuantity;
  assert.equal(created2.orderId, created1.orderId);
  assert.equal(stockAfterSecond, initialStock - 2);
});




