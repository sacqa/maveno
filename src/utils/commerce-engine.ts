import {
  Country,
  Currency,
  Product,
  ProductVariant,
  CartItem,
  ImmutableOrderSnapshot,
  AgeVerificationRecord,
  CollectionCondition,
  DiscountRule,
  GiftCard,
  CustomerRecord,
  ShippingMethodOption,
  StoreSettings,
} from '../types/ecommerce';

/**
 * Resolves the unit price in target currency/country minor units (integer cents).
 * Pricing priority:
 * 1. Variant-specific price adjustment (if a variant with distinct priceMinorUnits is selected)
 * 2. Country-specific manual product price
 * 3. Currency-specific manual product price
 * 4. Automatically converted base price using exchange rate snapshot
 */
export function resolveProductPrice(
  product: Product,
  targetCountryCode: string,
  targetCurrency: Currency,
  baseCurrencyRate = 1.0,
  variant?: ProductVariant
): number {
  const variantRatio =
    variant &&
    variant.priceMinorUnits > 0 &&
    product.basePriceMinorUnits > 0 &&
    variant.priceMinorUnits !== product.basePriceMinorUnits
      ? variant.priceMinorUnits / product.basePriceMinorUnits
      : 1;

  if (product.countrySpecificPrices && product.countrySpecificPrices[targetCountryCode] !== undefined) {
    return Math.round(product.countrySpecificPrices[targetCountryCode] * variantRatio);
  }

  if (product.currencySpecificPrices && product.currencySpecificPrices[targetCurrency.code] !== undefined) {
    return Math.round(product.currencySpecificPrices[targetCurrency.code] * variantRatio);
  }

  const effectiveBase =
    variant && variant.priceMinorUnits > 0 ? variant.priceMinorUnits : product.basePriceMinorUnits;
  const converted = (effectiveBase * targetCurrency.exchangeRateToBase) / baseCurrencyRate;
  return Math.round(converted);
}

/**
 * Formats minor units into localized currency string
 */
export function formatMinorUnits(minorUnits: number, currency: Currency): string {
  const divisor = Math.pow(10, currency.decimalPrecision);
  const majorUnits = minorUnits / divisor;

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimalPrecision,
      maximumFractionDigits: currency.decimalPrecision,
    }).format(majorUnits);

    return `${formatted} ${currency.code}`;
  } catch {
    const fixed = majorUnits.toFixed(currency.decimalPrecision);
    return currency.symbolPosition === 'before'
      ? `${currency.symbol}${fixed} ${currency.code}`
      : `${fixed} ${currency.symbol} ${currency.code}`;
  }
}

/**
 * Returns available shipping methods for the destination country & store settings
 */
export function getAvailableShippingMethods(
  country: Country,
  currency: Currency,
  settings?: Partial<StoreSettings>
): ShippingMethodOption[] {
  const rate = currency.exchangeRateToBase || 1;
  const standardBase = Math.round((settings?.standardShippingFeeMinorUnits ?? 1800) * rate);
  const expressBase = Math.round((settings?.expressShippingFeeMinorUnits ?? 2500) * rate);
  const vipBase = Math.round(4500 * rate);

  if (country.code === 'QA') {
    return [
      {
        id: 'doha_same_day',
        name: 'Doha Same-Day Courier Express (2–4 Hours)',
        carrier: settings?.defaultShippingCarrier || 'QPost Same-Day Doha Express (21+ ID Check)',
        description: 'Direct temperature-controlled dispatch from The Pearl-Qatar Hub with adult QID verification.',
        estimatedDays: 1,
        estimatedLabel: 'Same Day (2–4 Hours in Doha / Lusail)',
        baseFeeMinorUnits: expressBase,
        freeOverThreshold: true,
      },
      {
        id: 'qatar_standard',
        name: 'Qatar National Priority Tracked',
        carrier: 'Qatar Post Registered Courier',
        description: 'Tracked doorstep delivery across all Qatar municipalities (Al Wakrah, Al Khor, Al Rayyan).',
        estimatedDays: settings?.shippingEstimatedDays ?? 1,
        estimatedLabel: '1 Business Day',
        baseFeeMinorUnits: standardBase,
        freeOverThreshold: true,
      },
      {
        id: 'vip_concierge',
        name: 'VIP White-Glove Scheduled Handover',
        carrier: 'AURA Private Concierge Fleet',
        description: 'Dedicated specialist delivery at your chosen 1-hour window with hardware setup assistance.',
        estimatedDays: 1,
        estimatedLabel: 'Scheduled 1-Hour Window Today',
        baseFeeMinorUnits: vipBase,
        freeOverThreshold: false,
      },
    ];
  }

  return [
    {
      id: 'intl_priority',
      name: `${country.name} Priority Adult-Signature Express`,
      carrier: 'DHL Express Worldwide Tracked',
      description: `Customs-cleared air express to ${country.name} with mandatory ${country.minimumAge}+ ID verification.`,
      estimatedDays: 3,
      estimatedLabel: '2–4 Business Days',
      baseFeeMinorUnits: standardBase,
      freeOverThreshold: true,
    },
    {
      id: 'intl_expedited',
      name: `${country.name} Diplomatic Air Courier`,
      carrier: 'FedEx International Priority Direct',
      description: 'Priority customs lane and climate-sealed transit packaging.',
      estimatedDays: 2,
      estimatedLabel: '1–2 Business Days',
      baseFeeMinorUnits: expressBase,
      freeOverThreshold: false,
    },
  ];
}

/**
 * Calculates unit profit (minor units) and profit margin percentage for Shopify Product pricing.
 */
export function calculateProfitAndMargin(
  priceMinorUnits: number,
  costMinorUnits: number
): { profitMinorUnits: number; marginPercent: number } {
  const profitMinorUnits = priceMinorUnits - costMinorUnits;
  if (priceMinorUnits <= 0) {
    return { profitMinorUnits, marginPercent: 0 };
  }
  const marginPercent = Math.round(((profitMinorUnits / priceMinorUnits) * 100) * 10) / 10;
  return { profitMinorUnits, marginPercent };
}

/**
 * Evaluates whether a product matches all automated collection rules.
 */
export function evaluateAutomatedCollection(
  product: Product,
  conditions: CollectionCondition[]
): boolean {
  if (!conditions || conditions.length === 0) return false;

  return conditions.every((cond) => {
    const targetVal = cond.value.trim().toLowerCase();
    if (cond.field === 'tag') {
      const tags = (product.tags || product.seoKeywords || []).map((t) => t.toLowerCase());
      if (cond.operator === 'equals') return tags.includes(targetVal);
      if (cond.operator === 'contains') return tags.some((t) => t.includes(targetVal));
      return false;
    }
    if (cond.field === 'vendor') {
      const vendor = (product.vendor || product.brand || '').toLowerCase();
      if (cond.operator === 'equals') return vendor === targetVal;
      if (cond.operator === 'contains') return vendor.includes(targetVal);
      return false;
    }
    if (cond.field === 'product_type') {
      const pType = product.productType.toLowerCase();
      if (cond.operator === 'equals') return pType === targetVal;
      if (cond.operator === 'contains') return pType.includes(targetVal);
      return false;
    }
    if (cond.field === 'price') {
      const priceMajor = product.basePriceMinorUnits / 100;
      const numTarget = parseFloat(cond.value) || 0;
      if (cond.operator === 'greater_than') return priceMajor > numTarget;
      if (cond.operator === 'less_than') return priceMajor < numTarget;
      if (cond.operator === 'equals') return Math.abs(priceMajor - numTarget) < 0.01;
      return false;
    }
    if (cond.field === 'inventory') {
      const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
      const numTarget = parseInt(cond.value, 10) || 0;
      if (cond.operator === 'greater_than') return totalStock > numTarget;
      if (cond.operator === 'less_than') return totalStock < numTarget;
      if (cond.operator === 'equals') return totalStock === numTarget;
      return false;
    }
    return false;
  });
}

/**
 * Calculates the discount savings in minor units for a given DiscountRule.
 */
export function calculateDiscountBenefit(
  subtotalMinorUnits: number,
  shippingMinorUnits: number,
  discount: DiscountRule
): { discountMinorUnits: number; freeShippingApplied: boolean; eligible: boolean; reason?: string } {
  if (discount.status !== 'active') {
    return {
      discountMinorUnits: 0,
      freeShippingApplied: false,
      eligible: false,
      reason: `Discount code "${discount.code}" is currently ${discount.status}.`,
    };
  }
  if (subtotalMinorUnits < discount.minPurchaseMinorUnits) {
    return {
      discountMinorUnits: 0,
      freeShippingApplied: false,
      eligible: false,
      reason: `Minimum order subtotal of ${(discount.minPurchaseMinorUnits / 100).toFixed(2)} QAR required for "${discount.code}".`,
    };
  }
  if (discount.usageLimit !== undefined && discount.usedCount >= discount.usageLimit) {
    return {
      discountMinorUnits: 0,
      freeShippingApplied: false,
      eligible: false,
      reason: `Discount code "${discount.code}" has reached its maximum redemption limit.`,
    };
  }

  if (discount.type === 'percentage') {
    const pct = Math.min(100, Math.max(0, discount.value));
    return {
      discountMinorUnits: Math.round((subtotalMinorUnits * pct) / 100),
      freeShippingApplied: false,
      eligible: true,
    };
  }
  if (discount.type === 'fixed_amount') {
    return {
      discountMinorUnits: Math.min(subtotalMinorUnits, Math.max(0, Math.round(discount.value))),
      freeShippingApplied: false,
      eligible: true,
    };
  }
  if (discount.type === 'free_shipping') {
    return {
      discountMinorUnits: shippingMinorUnits,
      freeShippingApplied: true,
      eligible: true,
    };
  }
  if (discount.type === 'buy_x_get_y') {
    const pct = Math.min(100, Math.max(0, discount.value || 100));
    const buyQ = Math.max(1, discount.buyQuantity || 2);
    const getQ = Math.max(1, discount.getQuantity || 1);
    const effectiveRatio = getQ / (buyQ + getQ);
    return {
      discountMinorUnits: Math.round(subtotalMinorUnits * effectiveRatio * (pct / 100)),
      freeShippingApplied: false,
      eligible: true,
    };
  }
  return { discountMinorUnits: 0, freeShippingApplied: false, eligible: false };
}

/**
 * Evaluates a gift card code against available gift cards and returns the applied amount.
 */
export function evaluateGiftCardRedemption({
  amountDueMinorUnits,
  giftCards,
  giftCardCode,
}: {
  amountDueMinorUnits: number;
  giftCards: GiftCard[];
  giftCardCode?: string;
}): {
  valid: boolean;
  giftCard?: GiftCard;
  appliedMinorUnits: number;
  remainingBalanceMinorUnits: number;
  errorMessage?: string;
} {
  if (!giftCardCode || !giftCardCode.trim()) {
    return { valid: false, appliedMinorUnits: 0, remainingBalanceMinorUnits: 0 };
  }
  const normalized = giftCardCode.trim().toUpperCase();
  const card = giftCards.find((g) => g.code.trim().toUpperCase() === normalized);
  if (!card) {
    return {
      valid: false,
      appliedMinorUnits: 0,
      remainingBalanceMinorUnits: 0,
      errorMessage: `Gift card "${normalized}" was not found.`,
    };
  }
  if (card.status !== 'active') {
    return {
      valid: false,
      giftCard: card,
      appliedMinorUnits: 0,
      remainingBalanceMinorUnits: card.balanceMinorUnits,
      errorMessage: `Gift card "${card.code}" is ${card.status}.`,
    };
  }
  if (card.balanceMinorUnits <= 0) {
    return {
      valid: false,
      giftCard: card,
      appliedMinorUnits: 0,
      remainingBalanceMinorUnits: 0,
      errorMessage: `Gift card "${card.code}" has a 0.00 QAR balance.`,
    };
  }

  const appliedMinorUnits = Math.min(Math.max(0, amountDueMinorUnits), card.balanceMinorUnits);
  const remainingBalanceMinorUnits = Math.max(0, card.balanceMinorUnits - appliedMinorUnits);

  return {
    valid: true,
    giftCard: card,
    appliedMinorUnits,
    remainingBalanceMinorUnits,
  };
}

/**
 * Tokenizes payment card details on the client so raw card numbers and CVVs are never stored.
 */
export function tokenizePaymentCard({
  cardNumber,
  cardholderName,
  expiry,
  cvv,
}: {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
}): {
  valid: boolean;
  paymentToken?: string;
  cardBrand?: string;
  cardLast4?: string;
  isDeclinedTestCard?: boolean;
  errorMessage?: string;
} {
  const digits = cardNumber.replace(/[^0-9]/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return { valid: false, errorMessage: 'Please enter a valid 16-digit card number.' };
  }
  if (!cardholderName || cardholderName.trim().length < 2) {
    return { valid: false, errorMessage: 'Please enter the cardholder name as shown on the card.' };
  }
  if (!/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(expiry.trim())) {
    return { valid: false, errorMessage: 'Please enter a valid expiration date (MM/YY).' };
  }
  const cvvDigits = cvv.replace(/[^0-9]/g, '');
  if (cvvDigits.length < 3 || cvvDigits.length > 4) {
    return { valid: false, errorMessage: 'Please enter a valid 3 or 4 digit security code (CVV).' };
  }

  let cardBrand = 'Visa';
  if (digits.startsWith('5') || digits.startsWith('2')) {
    cardBrand = 'Mastercard';
  } else if (digits.startsWith('34') || digits.startsWith('37')) {
    cardBrand = 'American Express';
  } else if (digits.startsWith('974') || digits.startsWith('6')) {
    cardBrand = 'QPay / NAPS Qatar';
  }

  const cardLast4 = digits.slice(-4);
  const isDeclinedTestCard = cardLast4 === '0002' || digits.endsWith('0002');
  const paymentToken = `tok_qa_${cardBrand.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cardLast4}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  return {
    valid: true,
    paymentToken,
    cardBrand,
    cardLast4,
    isDeclinedTestCard,
  };
}

/**
 * Detects potential duplicate customer profiles based on normalized name, phone, or email username.
 */
export function detectDuplicateCustomers(
  customers: CustomerRecord[]
): { primary: CustomerRecord; duplicate: CustomerRecord; matchReason: string }[] {
  const duplicates: { primary: CustomerRecord; duplicate: CustomerRecord; matchReason: string }[] = [];

  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const a = customers[i];
      const b = customers[j];

      const normNameA = a.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
      const normNameB = b.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
      const normPhoneA = a.phone.replace(/[^0-9]/g, '');
      const normPhoneB = b.phone.replace(/[^0-9]/g, '');
      const normEmailA = a.email.trim().toLowerCase();
      const normEmailB = b.email.trim().toLowerCase();

      if (normEmailA && normEmailA === normEmailB) {
        duplicates.push({ primary: a, duplicate: b, matchReason: `Identical email (${a.email})` });
      } else if (normPhoneA.length >= 7 && normPhoneA === normPhoneB) {
        duplicates.push({ primary: a, duplicate: b, matchReason: `Identical phone (${a.phone})` });
      } else if (normNameA.length >= 4 && normNameA === normNameB) {
        duplicates.push({ primary: a, duplicate: b, matchReason: `Matching full name (${a.fullName})` });
      }
    }
  }

  return duplicates;
}

/**
 * Validates whether a sale can legally be made to a destination country.
 */
export function validateCountryEligibility(country: Country): {
  isEligible: boolean;
  status: Country['status'];
  reason?: string;
} {
  if (country.status === 'blocked') {
    return {
      isEligible: false,
      status: country.status,
      reason: `Commercial sales and shipping of vapor products are strictly prohibited in ${country.name} under current national regulations.`,
    };
  }

  if (country.status === 'pending_legal_review') {
    return {
      isEligible: false,
      status: country.status,
      reason: `Market expansion into ${country.name} is currently pending formal regulatory compliance and legal licensing review. Purchases are not yet open.`,
    };
  }

  if (country.status === 'restricted' && !country.shippingAvailable) {
    return {
      isEligible: false,
      status: country.status,
      reason: `Shipping to ${country.name} is currently suspended due to regional carrier and import restrictions.`,
    };
  }

  return {
    isEligible: true,
    status: country.status,
  };
}

/**
 * Validates age requirement for customer in the jurisdiction.
 */
export function validateCustomerAge(
  birthDateString: string,
  country: Country
): {
  isCompliant: boolean;
  calculatedAge: number;
  minimumRequired: number;
  errorMessage?: string;
} {
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) {
    return {
      isCompliant: false,
      calculatedAge: 0,
      minimumRequired: country.minimumAge,
      errorMessage: 'Invalid date of birth provided.',
    };
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < country.minimumAge) {
    return {
      isCompliant: false,
      calculatedAge: age,
      minimumRequired: country.minimumAge,
      errorMessage: `Legal minimum age for purchasing in ${country.name} is ${country.minimumAge} years old. Provided age is ${age}.`,
    };
  }

  return {
    isCompliant: true,
    calculatedAge: age,
    minimumRequired: country.minimumAge,
  };
}

/**
 * Calculates cart totals including discounts, shipping method, tax, duties, and gift cards in minor units.
 */
export function calculateOrderFinancials({
  subtotalMinorUnits,
  country,
  currency,
  freeShippingThresholdMinorUnits,
  shippingMethodOption,
  discountRule,
  explicitDiscountMinorUnits,
  giftCardAppliedMinorUnits: requestedGiftCardMinorUnits,
}: {
  subtotalMinorUnits: number;
  country: Country;
  currency: Currency;
  freeShippingThresholdMinorUnits: number;
  shippingMethodOption?: ShippingMethodOption;
  discountRule?: DiscountRule | null;
  explicitDiscountMinorUnits?: number;
  giftCardAppliedMinorUnits?: number;
}) {
  const defaultBaseShippingMinorUnits = 1800; // 18.00 base shipping
  const rawMethodFee = shippingMethodOption
    ? shippingMethodOption.baseFeeMinorUnits
    : Math.round(defaultBaseShippingMinorUnits * currency.exchangeRateToBase);

  const qualifiesForThresholdFreeShipping =
    (shippingMethodOption ? shippingMethodOption.freeOverThreshold : true) &&
    subtotalMinorUnits >= freeShippingThresholdMinorUnits * currency.exchangeRateToBase;

  let shippingFeeMinorUnits = qualifiesForThresholdFreeShipping ? 0 : rawMethodFee;

  let discountMinorUnits = explicitDiscountMinorUnits ?? 0;
  if (discountRule) {
    const benefit = calculateDiscountBenefit(subtotalMinorUnits, shippingFeeMinorUnits, discountRule);
    if (benefit.eligible) {
      if (benefit.freeShippingApplied) {
        shippingFeeMinorUnits = 0;
        discountMinorUnits = 0;
      } else {
        discountMinorUnits = benefit.discountMinorUnits;
      }
    }
  }

  discountMinorUnits = Math.min(subtotalMinorUnits, Math.max(0, discountMinorUnits));
  const taxableSubtotalMinorUnits = Math.max(0, subtotalMinorUnits - discountMinorUnits);

  const taxMinorUnits = Math.round(taxableSubtotalMinorUnits * country.standardTaxRate);
  const dutyMinorUnits = Math.round(taxableSubtotalMinorUnits * country.customsDutyRate);

  const grossTotalBeforeGiftCard =
    taxableSubtotalMinorUnits + shippingFeeMinorUnits + taxMinorUnits + dutyMinorUnits;

  const giftCardAppliedMinorUnits = Math.min(
    grossTotalBeforeGiftCard,
    Math.max(0, requestedGiftCardMinorUnits ?? 0)
  );

  const totalAmountMinorUnits = Math.max(0, grossTotalBeforeGiftCard - giftCardAppliedMinorUnits);

  return {
    subtotalMinorUnits,
    discountMinorUnits,
    giftCardAppliedMinorUnits,
    shippingFeeMinorUnits,
    taxMinorUnits,
    dutyMinorUnits,
    totalAmountMinorUnits,
    formattedTotal: formatMinorUnits(totalAmountMinorUnits, currency),
  };
}

/**
 * Creates an immutable order snapshot for persistent records.
 */
export function buildImmutableOrderSnapshot({
  orderNumber,
  idempotencyKey,
  customer,
  isGuestCheckout = true,
  shippingAddress,
  billingSameAsShipping = true,
  billingAddress,
  cartItems,
  country,
  currency,
  ageVerification,
  financials,
  paymentMethod,
  paymentDetails,
  shippingMethod,
  discountCode,
  giftCardCode,
  notes,
}: {
  orderNumber: string;
  idempotencyKey?: string;
  customer: { id?: string; fullName: string; email: string; phone: string };
  isGuestCheckout?: boolean;
  shippingAddress: ImmutableOrderSnapshot['shippingAddress'];
  billingSameAsShipping?: boolean;
  billingAddress?: ImmutableOrderSnapshot['billingAddress'];
  cartItems: CartItem[];
  country: Country;
  currency: Currency;
  ageVerification: AgeVerificationRecord;
  financials: ReturnType<typeof calculateOrderFinancials>;
  paymentMethod: ImmutableOrderSnapshot['payment']['method'];
  paymentDetails?: {
    transactionId?: string;
    paymentStatus?: ImmutableOrderSnapshot['payment']['paymentStatus'];
    cardBrand?: string;
    cardLast4?: string;
    payerEmail?: string;
    paymentToken?: string;
  };
  shippingMethod?: ShippingMethodOption;
  discountCode?: string;
  giftCardCode?: string;
  notes?: string;
}): ImmutableOrderSnapshot {
  const nowIso = new Date().toISOString();
  const txId =
    paymentDetails?.transactionId ||
    'tx_' + Math.random().toString(36).substring(2, 14).toUpperCase();
  const payStatus =
    paymentDetails?.paymentStatus ||
    (paymentMethod === 'cash_on_delivery' || paymentMethod === 'wire_transfer_swift'
      ? 'authorized'
      : 'captured');

  return {
    orderId: 'ord_' + Math.random().toString(36).substring(2, 11),
    orderNumber,
    orderDate: nowIso,
    idempotencyKey,
    status: payStatus === 'captured' ? 'paid' : 'processing',
    isGuestCheckout,
    notes,
    discountCode,
    giftCardCode,
    confirmationEmailSentAt: nowIso,
    customer,
    shippingAddress,
    billingSameAsShipping,
    billingAddress: billingSameAsShipping ? shippingAddress : billingAddress || shippingAddress,
    items: cartItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantTitle: item.variant.title,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitPriceMinorUnits: item.unitPriceMinorUnits,
      totalPriceMinorUnits: item.totalPriceMinorUnits,
      productSnapshot: {
        brand: item.product.brand,
        image: item.variant.image || item.product.galleryImages[0] || '',
        specs: item.product.specs || {},
      },
    })),
    financials: {
      currencyCode: currency.code,
      exchangeRateUsed: currency.exchangeRateToBase,
      ...financials,
    },
    compliance: {
      countryMinimumAgeRequired: country.minimumAge,
      customerVerifiedAge: ageVerification.verifiedAge,
      ageVerificationRecordId: ageVerification.id,
      verificationProviderRef: ageVerification.providerReference,
      jurisdictionLegalStatus: country.status,
      tpdFdaComplianceStatement: `Jurisdiction verification completed via ${ageVerification.provider}. Meets requirements for ${country.name} (Min Age ${country.minimumAge}).`,
    },
    payment: {
      method: paymentMethod,
      paymentStatus: payStatus,
      transactionId: txId,
      cardBrand: paymentDetails?.cardBrand,
      cardLast4: paymentDetails?.cardLast4,
      payerEmail: paymentDetails?.payerEmail,
      paymentToken: paymentDetails?.paymentToken,
    },
    shipping: {
      methodId: shippingMethod?.id || 'doha_same_day',
      carrier:
        shippingMethod?.carrier ||
        (country.code === 'QA'
          ? 'QPost Same-Day Doha Express (21+ ID Check)'
          : country.code === 'GB'
          ? 'Royal Mail Special Delivery (Age Verification on Delivery)'
          : 'DHL Express Worldwide Tracked'),
      service: shippingMethod?.name || 'Adult Signature Required Priority Express',
      trackingNumber: 'AURA' + Math.floor(100000000 + Math.random() * 900000000) + 'QA',
      estimatedDeliveryDays: shippingMethod?.estimatedDays ?? (country.code === 'QA' ? 1 : 3),
    },
    timeline: [
      {
        status: 'Order Placed & Age Compliance Verified',
        timestamp: nowIso,
        note: `Customer age verified (${ageVerification.verifiedAge} yrs old) against ${country.name} minimum threshold (${country.minimumAge} yrs).`,
      },
      {
        status:
          payStatus === 'captured'
            ? 'Payment Authorized & Captured'
            : 'Order Authorized & Payment Scheduled',
        timestamp: nowIso,
        note: `Immutable financial total locked at ${financials.formattedTotal} (${txId}).`,
      },
      {
        status: 'Order Confirmation Email Dispatched',
        timestamp: nowIso,
        note: `Transactional receipt & tracking manifest sent to ${customer.email}.`,
      },
      {
        status: 'Sent to Controlled Fulfillment Center',
        timestamp: nowIso,
        note: 'Fulfillment manifest logged at Doha Pearl Hub with compliance audit serials.',
      },
    ],
  };
}

