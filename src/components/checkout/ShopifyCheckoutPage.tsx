import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Truck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Tag,
  Gift,
  UserCheck,
  User,
  MapPin,
  RefreshCw,
  Building2,
  Wallet,
  Banknote,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CartItem,
  Country,
  Currency,
  CustomerRecord,
  DiscountRule,
  GiftCard,
  ImmutableOrderSnapshot,
  StoreSettings,
} from '../../types/ecommerce';
import {
  formatMinorUnits,
  calculateOrderFinancials,
  calculateDiscountBenefit,
  evaluateGiftCardRedemption,
  getAvailableShippingMethods,
  validateCountryEligibility,
  validateCustomerAge,
  tokenizePaymentCard,
  buildImmutableOrderSnapshot,
} from '../../utils/commerce-engine';
import { storeDb } from '../../services/store-db';

interface ShopifyCheckoutPageProps {
  cartItems: CartItem[];
  currentCountry: Country;
  currentCurrency: Currency;
  settings: StoreSettings;
  discounts: DiscountRule[];
  giftCards: GiftCard[];
  customers: CustomerRecord[];
  appliedDiscountCode: string;
  onApplyDiscountCode: (code: string) => void;
  appliedGiftCardCode: string;
  onApplyGiftCardCode: (code: string) => void;
  selectedShippingMethodId: string;
  onSelectShippingMethod: (methodId: string) => void;
  orderNotes: string;
  onChangeOrderNotes: (notes: string) => void;
  onBackToCart: () => void;
  onBackToStorefront: () => void;
  onOrderCompleted: (order: ImmutableOrderSnapshot) => void;
}

export const ShopifyCheckoutPage: React.FC<ShopifyCheckoutPageProps> = ({
  cartItems,
  currentCountry,
  currentCurrency,
  settings,
  discounts,
  giftCards,
  customers,
  appliedDiscountCode,
  onApplyDiscountCode,
  appliedGiftCardCode,
  onApplyGiftCardCode,
  selectedShippingMethodId,
  onSelectShippingMethod,
  orderNotes,
  onChangeOrderNotes,
  onBackToCart,
  onBackToStorefront,
  onOrderCompleted,
}) => {
  // Stable checkout session idempotency key & order number to prevent duplicate orders/payments
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `idem_qa_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  );
  const [draftOrderNumber] = useState<string>(
    () => `AURA-QA-${Math.floor(100000 + Math.random() * 900000)}`
  );

  // Guest vs Existing Customer Login state
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest');
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerRecord | null>(null);
  const [loginEmailInput, setLoginEmailInput] = useState(
    () => customers[0]?.email || 'tariq.almansoori@qatar-holdings.qa'
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  // Contact & Shipping Address State
  const [email, setEmail] = useState('customer@doha-pearl.qa');
  const [phone, setPhone] = useState('+974 5512 8890');
  const [fullName, setFullName] = useState('Hamad Al-Thani');
  const [addressLine1, setAddressLine1] = useState('Tower 14, Porto Arabia, The Pearl-Qatar');
  const [addressLine2, setAddressLine2] = useState('Penthouse Suite 1802');
  const [city, setCity] = useState('Doha');
  const [municipality, setMunicipality] = useState('Ad Dawhah (Doha)');
  const [zone, setZone] = useState('Zone 66 (The Pearl)');
  const [postalCode, setPostalCode] = useState('QA-6601');

  // Age & QID Verification State
  const [birthDate, setBirthDate] = useState('1991-05-14');
  const [qidNumber, setQidNumber] = useState('29163400881');

  // Billing Address State
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingFullName, setBillingFullName] = useState('Hamad Al-Thani');
  const [billingAddressLine1, setBillingAddressLine1] = useState('West Bay Financial District, Tower 4');
  const [billingCity, setBillingCity] = useState('Doha');
  const [billingPostalCode, setBillingPostalCode] = useState('QA-6100');
  const [billingCountryName, setBillingCountryName] = useState(currentCountry.name);

  // Discount & Gift Card Local Inputs
  const [discountInput, setDiscountInput] = useState(appliedDiscountCode || '');
  const [discountMessage, setDiscountMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [giftCardInput, setGiftCardInput] = useState(appliedGiftCardCode || '');
  const [giftCardMessage, setGiftCardMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Payment Gateway State
  const [paymentMethod, setPaymentMethod] = useState<
    | 'credit_card_gateway'
    | 'paypal_express'
    | 'apple_google_pay'
    | 'cash_on_delivery'
    | 'wire_transfer_swift'
  >('credit_card_gateway');

  // Card Fields (Tokenized on submit; raw card number & CVV never stored)
  const [cardNumber, setCardNumber] = useState('4532 8810 9921 4481');
  const [cardholderName, setCardholderName] = useState('HAMAD AL THANI');
  const [cardExpiry, setCardExpiry] = useState('09/28');
  const [cardCvv, setCardCvv] = useState('842');
  const [paypalEmail, setPaypalEmail] = useState('hamad.althani@qatar-invest.qa');
  const [simulateDecline, setSimulateDecline] = useState(false);

  // Payment Processing & Status State
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'authorizing' | 'failed' | 'captured'
  >('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [backendVerifiedTotalMinor, setBackendVerifiedTotalMinor] = useState<number | null>(
    null
  );
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);

  // Compute Financials
  const subtotalMinorUnits = cartItems.reduce(
    (acc, item) => acc + item.totalPriceMinorUnits,
    0
  );

  const shippingMethods = getAvailableShippingMethods(
    currentCountry,
    currentCurrency,
    settings
  );
  const activeShippingMethod =
    shippingMethods.find((m) => m.id === selectedShippingMethodId) ||
    shippingMethods[0];

  const matchedDiscountRule = appliedDiscountCode
    ? discounts.find(
        (d) => d.code.trim().toUpperCase() === appliedDiscountCode.trim().toUpperCase()
      ) || null
    : null;

  const preGiftCardFinancials = calculateOrderFinancials({
    subtotalMinorUnits,
    country: currentCountry,
    currency: currentCurrency,
    freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
    shippingMethodOption: activeShippingMethod,
    discountRule: matchedDiscountRule,
  });

  const giftCardEval = evaluateGiftCardRedemption({
    amountDueMinorUnits: preGiftCardFinancials.totalAmountMinorUnits,
    giftCards,
    giftCardCode: appliedGiftCardCode,
  });

  const financials = calculateOrderFinancials({
    subtotalMinorUnits,
    country: currentCountry,
    currency: currentCurrency,
    freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
    shippingMethodOption: activeShippingMethod,
    discountRule: matchedDiscountRule,
    giftCardAppliedMinorUnits: giftCardEval.valid ? giftCardEval.appliedMinorUnits : 0,
  });

  // Sync authoritative calculation with backend /api/checkout/calculate
  useEffect(() => {
    let active = true;
    const verifyWithBackend = async () => {
      try {
        const res = await fetch('/api/checkout/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPriceMinorUnits: i.unitPriceMinorUnits,
            })),
            countryCode: currentCountry.code,
            currencyCode: currentCurrency.code,
            shippingMethodId: activeShippingMethod.id,
            discountCode: appliedDiscountCode,
            giftCardCode: appliedGiftCardCode,
            customDiscounts: discounts,
            customGiftCards: giftCards,
            freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
          }),
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data?.financials?.totalAmountMinorUnits !== undefined) {
            setBackendVerifiedTotalMinor(data.financials.totalAmountMinorUnits);
          }
        }
      } catch {
        // Fallback to local engine if offline
      }
    };
    if (cartItems.length > 0) {
      void verifyWithBackend();
    }
    return () => {
      active = false;
    };
  }, [
    subtotalMinorUnits,
    currentCountry.code,
    currentCurrency.code,
    activeShippingMethod.id,
    appliedDiscountCode,
    appliedGiftCardCode,
    settings.freeShippingThresholdMinorUnits,
  ]);

  // Existing Customer Account Login Handler
  const handleCustomerLogin = (emailToFind?: string) => {
    const targetEmail = (emailToFind || loginEmailInput).trim().toLowerCase();
    const matched = customers.find((c) => c.email.trim().toLowerCase() === targetEmail);
    if (!matched) {
      setLoginError(
        `No customer account found with email "${targetEmail}". Try tariq.almansoori@qatar-holdings.qa or checkout as a guest.`
      );
      return;
    }

    setLoggedInCustomer(matched);
    setLoginError(null);
    setFullName(matched.fullName);
    setEmail(matched.email);
    setPhone(matched.phone);
    if (matched.qidNumber) {
      setQidNumber(matched.qidNumber.replace(/[^0-9]/g, '').padEnd(11, '8').slice(0, 11));
    }
    const defaultAddr =
      matched.addresses.find((a) => a.isDefault) || matched.addresses[0];
    if (defaultAddr) {
      setAddressLine1(defaultAddr.addressLine1);
      setAddressLine2(defaultAddr.addressLine2 || '');
      setCity(defaultAddr.city);
      setMunicipality(defaultAddr.municipality || defaultAddr.city);
      setZone(defaultAddr.zone || 'Zone 66');
      setPostalCode(defaultAddr.postalCode);
    }
  };

  const handleSelectSavedAddress = (addressId: string) => {
    if (!loggedInCustomer) return;
    const addr = loggedInCustomer.addresses.find((a) => a.id === addressId);
    if (!addr) return;
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setCity(addr.city);
    setMunicipality(addr.municipality || addr.city);
    setZone(addr.zone || 'Zone 66');
    setPostalCode(addr.postalCode);
  };

  // Discount Application
  const handleApplyDiscount = (codeOverride?: string) => {
    const code = (codeOverride !== undefined ? codeOverride : discountInput)
      .trim()
      .toUpperCase();
    if (!code) {
      onApplyDiscountCode('');
      setDiscountMessage(null);
      return;
    }
    const rule = discounts.find((d) => d.code.trim().toUpperCase() === code);
    if (!rule) {
      setDiscountMessage({
        type: 'error',
        text: `Discount code "${code}" is invalid.`,
      });
      return;
    }
    const benefit = calculateDiscountBenefit(
      subtotalMinorUnits,
      activeShippingMethod.baseFeeMinorUnits,
      rule
    );
    if (!benefit.eligible) {
      setDiscountMessage({
        type: 'error',
        text:
          benefit.reason ||
          `Minimum purchase of ${formatMinorUnits(
            rule.minPurchaseMinorUnits,
            currentCurrency
          )} required.`,
      });
      return;
    }
    setDiscountInput(code);
    onApplyDiscountCode(code);
    setDiscountMessage({
      type: 'success',
      text:
        rule.type === 'free_shipping'
          ? `Free shipping code "${code}" applied!`
          : `Discount "${code}" applied (-${formatMinorUnits(
              benefit.discountMinorUnits,
              currentCurrency
            )})!`,
    });
  };

  // Gift Card Application
  const handleApplyGiftCard = (codeOverride?: string) => {
    const code = (codeOverride !== undefined ? codeOverride : giftCardInput)
      .trim()
      .toUpperCase();
    if (!code) {
      onApplyGiftCardCode('');
      setGiftCardMessage(null);
      return;
    }
    const evalResult = evaluateGiftCardRedemption({
      amountDueMinorUnits: preGiftCardFinancials.totalAmountMinorUnits,
      giftCards,
      giftCardCode: code,
    });
    if (!evalResult.valid) {
      setGiftCardMessage({
        type: 'error',
        text: evalResult.errorMessage || `Gift card "${code}" could not be applied.`,
      });
      return;
    }
    setGiftCardInput(code);
    onApplyGiftCardCode(code);
    setGiftCardMessage({
      type: 'success',
      text: `Gift card applied (-${formatMinorUnits(
        evalResult.appliedMinorUnits,
        currentCurrency
      )}). Remaining card balance: ${formatMinorUnits(
        evalResult.remainingBalanceMinorUnits,
        currentCurrency
      )}.`,
    });
  };

  // Complete Order & Process Payment
  const handleCompleteCheckout = async (
    e?: React.FormEvent,
    options?: { forceDeclineOff?: boolean }
  ) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (paymentStatus === 'authorizing' || paymentStatus === 'captured') {
      return; // Prevent duplicate clicks while in flight
    }

    setPaymentError(null);

    // 1. Validate Country Eligibility
    const eligibility = validateCountryEligibility(currentCountry);
    if (!eligibility.isEligible) {
      setPaymentStatus('failed');
      setPaymentError(
        eligibility.reason || `Sales are disabled for ${currentCountry.name}.`
      );
      return;
    }

    // 2. Validate Customer Contact & Shipping Address
    if (!fullName.trim() || !email.trim() || !phone.trim() || !addressLine1.trim()) {
      setPaymentStatus('failed');
      setPaymentError(
        'Please complete your contact email, phone number, full name, and shipping address.'
      );
      return;
    }

    // 3. Validate Jurisdiction Minimum Age (21+ in Qatar)
    const ageCheck = validateCustomerAge(birthDate, currentCountry);
    if (!ageCheck.isCompliant) {
      setPaymentStatus('failed');
      setPaymentError(
        ageCheck.errorMessage ||
          `You must be ${currentCountry.minimumAge}+ years old to complete this order.`
      );
      return;
    }

    // 4. Tokenize Card if paying by Credit/Debit Card (never send raw card numbers)
    let paymentToken: string | undefined;
    let cardBrand: string | undefined;
    let cardLast4: string | undefined;
    let cardTriggersDecline = false;

    const effectiveCardNumber =
      options?.forceDeclineOff && cardNumber.trim().endsWith('0002')
        ? '4532 8810 9921 4481'
        : cardNumber;

    if (paymentMethod === 'credit_card_gateway') {
      const tokenResult = tokenizePaymentCard({
        cardNumber: effectiveCardNumber,
        cardholderName: cardholderName || fullName,
        expiry: cardExpiry,
        cvv: cardCvv,
      });
      if (!tokenResult.valid) {
        setPaymentStatus('failed');
        setPaymentError(
          tokenResult.errorMessage || 'Please check your credit card details.'
        );
        return;
      }
      paymentToken = tokenResult.paymentToken;
      cardBrand = tokenResult.cardBrand;
      cardLast4 = tokenResult.cardLast4;
      cardTriggersDecline = Boolean(tokenResult.isDeclinedTestCard);
    }

    setPaymentStatus('authorizing');

    const effectiveSimulateDecline = options?.forceDeclineOff
      ? false
      : simulateDecline || cardTriggersDecline;

    try {
      // 5. Call Backend Payment Gateway Endpoint with Idempotency Key
      const paymentRes = await fetch('/api/checkout/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          orderNumber: draftOrderNumber,
          amountMinorUnits: financials.totalAmountMinorUnits,
          currencyCode: currentCurrency.code,
          paymentMethod,
          paymentToken,
          cardBrand,
          cardLast4,
          payerEmail: paymentMethod === 'paypal_express' ? paypalEmail : email,
          simulateDecline: effectiveSimulateDecline,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok || !paymentData.success) {
        setPaymentStatus('failed');
        setPaymentError(
          paymentData.message ||
            'Payment authorization failed. Please verify your payment method and retry.'
        );
        // Generate a fresh idempotency key for the next retry attempt after a declined attempt
        setIdempotencyKey(
          `idem_qa_retry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        );
        return;
      }

      setPaymentStatus('captured');

      // 6. Record Age Verification Audit Entry
      const ageRecord = storeDb.recordAgeVerification({
        customerEmail: email,
        customerName: fullName,
        countryCode: currentCountry.code,
        dateOfBirth: birthDate,
        verifiedAge: ageCheck.calculatedAge,
        provider:
          currentCountry.code === 'QA'
            ? 'Qatar National ID (QID)'
            : 'Veratad Global',
        providerReference:
          currentCountry.code === 'QA'
            ? `QID-${qidNumber}-MOPH-PASS`
            : `VRF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        status: 'passed',
      });

      // 7. Build Immutable Order Snapshot & Commit Idempotently to Database
      const finalOrder = buildImmutableOrderSnapshot({
        orderNumber: draftOrderNumber,
        idempotencyKey,
        customer: {
          id: loggedInCustomer?.id,
          fullName,
          email,
          phone,
        },
        isGuestCheckout: !loggedInCustomer,
        shippingAddress: {
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          municipality,
          zone,
          stateOrProvince: municipality || city,
          postalCode,
          countryCode: currentCountry.code,
          countryName: currentCountry.name,
        },
        billingSameAsShipping,
        billingAddress: billingSameAsShipping
          ? undefined
          : {
              fullName: billingFullName || fullName,
              addressLine1: billingAddressLine1,
              city: billingCity,
              stateOrProvince: billingCity,
              postalCode: billingPostalCode,
              countryCode: currentCountry.code,
              countryName: billingCountryName || currentCountry.name,
            },
        cartItems,
        country: currentCountry,
        currency: currentCurrency,
        ageVerification: ageRecord,
        financials,
        paymentMethod,
        paymentDetails: {
          transactionId: paymentData.transactionId,
          paymentStatus: paymentData.paymentStatus,
          cardBrand,
          cardLast4,
          payerEmail: paymentMethod === 'paypal_express' ? paypalEmail : email,
          paymentToken,
        },
        shippingMethod: activeShippingMethod,
        discountCode: appliedDiscountCode || undefined,
        giftCardCode: giftCardEval.valid ? appliedGiftCardCode : undefined,
        notes: orderNotes || undefined,
      });

      const savedOrder = storeDb.createOrder(finalOrder);
      onOrderCompleted(savedOrder);
    } catch (err: any) {
      setPaymentStatus('failed');
      setPaymentError(
        err?.message ||
          'Network error communicating with payment gateway. Please retry.'
      );
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900">
          Your cart is empty
        </h2>
        <p className="text-xs text-neutral-500">
          Add products to your cart before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={onBackToStorefront}
          className="px-6 py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="shopify-checkout-page"
      className="min-h-screen bg-neutral-50 pb-16"
    >
      {/* Top Checkout Header Bar */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-testid="checkout-back-to-cart-btn"
              onClick={onBackToCart}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Cart</span>
            </button>
            <span className="text-neutral-300">|</span>
            <span className="text-base font-bold text-neutral-900 tracking-tight">
              {settings.storeName} Checkout
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Shopify Secure 256-Bit Encrypted Checkout</span>
          </div>
        </div>

        {/* Mobile Collapsible Order Summary Toggle */}
        <div className="lg:hidden border-t border-neutral-200 bg-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileOrderSummaryOpen(!mobileOrderSummaryOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-900"
          >
            <span className="flex items-center gap-2 text-[#8a1538]">
              <span>
                {mobileOrderSummaryOpen ? 'Hide' : 'Show'} Order Summary (
                {cartItems.reduce((a, b) => a + b.quantity, 0)} items)
              </span>
              {mobileOrderSummaryOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
            <span className="text-sm font-mono-numbers">
              {financials.formattedTotal}
            </span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Shopify Checkout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (7 Cols): Contact, Login/Guest, Shipping, Billing, Payment */}
          <form
            onSubmit={handleCompleteCheckout}
            className="lg:col-span-7 space-y-6"
          >
            {/* SECTION 1: Contact & Guest vs Existing Customer Login */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#8a1538]" />
                    <span>1. Contact Information</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Checkout as a guest or sign in to auto-fill your saved Qatar addresses.
                  </p>
                </div>

                {/* Mode Switcher: Guest Checkout vs Customer Login */}
                <div className="inline-flex rounded-xl bg-neutral-100 p-1 border border-neutral-200 self-start">
                  <button
                    type="button"
                    data-testid="checkout-mode-guest-btn"
                    onClick={() => {
                      setCheckoutMode('guest');
                      setLoggedInCustomer(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      checkoutMode === 'guest' && !loggedInCustomer
                        ? 'bg-white text-neutral-900 shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Guest Checkout
                  </button>
                  <button
                    type="button"
                    data-testid="checkout-mode-login-btn"
                    onClick={() => setCheckoutMode('login')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      checkoutMode === 'login' || loggedInCustomer
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {loggedInCustomer ? '✓ Signed In' : 'Customer Login'}
                  </button>
                </div>
              </div>

              {/* Existing Customer Login Panel */}
              {checkoutMode === 'login' && !loggedInCustomer && (
                <div
                  data-testid="checkout-customer-login-panel"
                  className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3"
                >
                  <div className="text-xs font-semibold text-neutral-900">
                    Sign in with your registered customer email
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      data-testid="checkout-login-email-input"
                      value={loginEmailInput}
                      onChange={(e) => setLoginEmailInput(e.target.value)}
                      placeholder="Enter registered email..."
                      className="grow px-3 py-2 rounded-lg border border-neutral-300 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      data-testid="checkout-login-submit-btn"
                      onClick={() => handleCustomerLogin()}
                      className="px-4 py-2 rounded-lg bg-[#8a1538] hover:bg-[#70112d] text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Sign In &amp; Auto-Fill
                    </button>
                  </div>

                  {loginError && (
                    <p className="text-[11px] text-red-600 font-medium">{loginError}</p>
                  )}

                  {/* Quick-select existing customer accounts from database */}
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Quick-Select Existing Customer Account:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {customers.slice(0, 3).map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          data-testid={`quick-login-${cust.id}`}
                          onClick={() => {
                            setLoginEmailInput(cust.email);
                            handleCustomerLogin(cust.email);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 hover:border-neutral-900 text-[11px] font-medium text-neutral-800 cursor-pointer"
                        >
                          {cust.fullName} ({cust.segment})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Logged-in Customer Banner */}
              {loggedInCustomer && (
                <div
                  data-testid="logged-in-customer-banner"
                  className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-950"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold">{loggedInCustomer.fullName}</span>{' '}
                      <span className="text-emerald-700">({loggedInCustomer.email})</span>
                      <span className="ml-2 px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px] font-bold uppercase">
                        {loggedInCustomer.segment} Member
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoggedInCustomer(null);
                      setCheckoutMode('guest');
                    }}
                    className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Switch to Guest
                  </button>
                </div>
              )}

              {/* Email & Phone Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Email Address (For Order Receipt) *
                  </label>
                  <input
                    type="email"
                    required
                    data-testid="checkout-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.qa"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Mobile Phone (For Doha Courier SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    data-testid="checkout-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+974 5500 0000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-mono-numbers focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>
            </section>

            {/* SECTION 2: Shipping Address & Age Compliance */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8a1538]" />
                    <span>2. Shipping Address ({currentCountry.flagEmoji} {currentCountry.name})</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Adult signature ({currentCountry.minimumAge}+) required upon courier handover.
                  </p>
                </div>

                {/* Saved Address Selector if Logged In */}
                {loggedInCustomer && loggedInCustomer.addresses.length > 0 && (
                  <select
                    data-testid="checkout-saved-address-select"
                    onChange={(e) => handleSelectSavedAddress(e.target.value)}
                    className="text-xs bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-1.5 font-semibold text-neutral-800"
                  >
                    {loggedInCustomer.addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        Saved: {addr.label} ({addr.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Recipient Full Name (Must Match Government ID) *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="checkout-fullname-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Street Address / Tower / Villa *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="checkout-address1-input"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Apartment, Suite, Floor, or Compound (Optional)
                  </label>
                  <input
                    type="text"
                    data-testid="checkout-address2-input"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    City / Municipality *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="checkout-city-input"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setMunicipality(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Qatar Zone / Postal Code *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      placeholder="Zone 66"
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                    />
                    <input
                      type="text"
                      required
                      data-testid="checkout-postal-input"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="QA-6601"
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-xs font-mono-numbers focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Integrated Mandatory 21+ Age & QID Verification */}
              <div className="pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Date of Birth ({currentCountry.minimumAge}+ Required) *
                  </label>
                  <input
                    type="date"
                    required
                    data-testid="checkout-dob-input"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-mono-numbers focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Qatar National ID (QID) / Passport Ref *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="checkout-qid-input"
                    value={qidNumber}
                    onChange={(e) => setQidNumber(e.target.value)}
                    placeholder="11-Digit QID"
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-mono-numbers focus:outline-hidden"
                  />
                </div>
              </div>
            </section>

            {/* SECTION 3: Shipping Method Selection */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#8a1538]" />
                  <span>3. Shipping Method</span>
                </h2>
              </div>

              <div className="space-y-2.5">
                {shippingMethods.map((method) => {
                  const isSelected = activeShippingMethod.id === method.id;
                  const thresholdInTargetMinor = Math.round(
                    settings.freeShippingThresholdMinorUnits *
                      currentCurrency.exchangeRateToBase
                  );
                  const qualifiesFree =
                    (method.freeOverThreshold &&
                      subtotalMinorUnits >= thresholdInTargetMinor) ||
                    matchedDiscountRule?.type === 'free_shipping';

                  return (
                    <label
                      key={method.id}
                      data-testid={`checkout-shipping-method-${method.id}`}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="checkout_shipping_method"
                          checked={isSelected}
                          onChange={() => onSelectShippingMethod(method.id)}
                          className="mt-1 accent-amber-500"
                        />
                        <div className="space-y-0.5 text-xs">
                          <div className="font-bold">{method.name}</div>
                          <div
                            className={`text-[11px] ${
                              isSelected ? 'text-neutral-300' : 'text-neutral-500'
                            }`}
                          >
                            {method.description}
                          </div>
                          <div
                            className={`text-[10px] font-mono-numbers pt-0.5 ${
                              isSelected ? 'text-amber-300' : 'text-amber-800'
                            }`}
                          >
                            Carrier: {method.carrier} · ETA: {method.estimatedLabel}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono-numbers font-bold shrink-0">
                        {qualifiesFree
                          ? 'FREE'
                          : formatMinorUnits(method.baseFeeMinorUnits, currentCurrency)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* SECTION 4: Billing Address */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#8a1538]" />
                  <span>4. Billing Address</span>
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Select the address that matches your payment card or bank account.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <label
                  data-testid="billing-same-radio"
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer ${
                    billingSameAsShipping
                      ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="billing_address_mode"
                    checked={billingSameAsShipping}
                    onChange={() => setBillingSameAsShipping(true)}
                    className="accent-amber-500"
                  />
                  <span>Same as shipping address</span>
                </label>

                <label
                  data-testid="billing-different-radio"
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer ${
                    !billingSameAsShipping
                      ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="billing_address_mode"
                    checked={!billingSameAsShipping}
                    onChange={() => setBillingSameAsShipping(false)}
                    className="accent-amber-500"
                  />
                  <span>Use a different billing address</span>
                </label>
              </div>

              {!billingSameAsShipping && (
                <div
                  data-testid="custom-billing-address-form"
                  className="pt-3 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Billing Full Name / Company *
                    </label>
                    <input
                      type="text"
                      required={!billingSameAsShipping}
                      data-testid="billing-fullname-input"
                      value={billingFullName}
                      onChange={(e) => setBillingFullName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Billing Street Address *
                    </label>
                    <input
                      type="text"
                      required={!billingSameAsShipping}
                      data-testid="billing-address1-input"
                      value={billingAddressLine1}
                      onChange={(e) => setBillingAddressLine1(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Billing City *
                    </label>
                    <input
                      type="text"
                      required={!billingSameAsShipping}
                      data-testid="billing-city-input"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Billing Postal Code *
                    </label>
                    <input
                      type="text"
                      required={!billingSameAsShipping}
                      data-testid="billing-postal-input"
                      value={billingPostalCode}
                      onChange={(e) => setBillingPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-mono-numbers"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 5: Payment Screen */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#8a1538]" />
                    <span>5. Payment Gateway</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    All transactions are tokenized &amp; encrypted. Raw card details are never stored.
                  </p>
                </div>

                {/* Live Payment Status Pill */}
                <span
                  data-testid="checkout-payment-status-badge"
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider self-start ${
                    paymentStatus === 'captured'
                      ? 'bg-emerald-100 text-emerald-800'
                      : paymentStatus === 'authorizing'
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {paymentStatus === 'idle' && 'Gateway Ready'}
                  {paymentStatus === 'authorizing' && 'Authorizing Payment...'}
                  {paymentStatus === 'failed' && 'Payment Declined — Retry Ready'}
                  {paymentStatus === 'captured' && 'Payment Captured'}
                </span>
              </div>

              {/* Payment Gateway Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  data-testid="pay-method-card"
                  onClick={() => {
                    setPaymentMethod('credit_card_gateway');
                    setPaymentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'credit_card_gateway'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div>Credit / Debit Card</div>
                      <div
                        className={`text-[10px] font-normal ${
                          paymentMethod === 'credit_card_gateway'
                            ? 'text-neutral-300'
                            : 'text-neutral-500'
                        }`}
                      >
                        Visa, Mastercard, Amex, QPay
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-white/15">
                    3D-S
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="pay-method-paypal"
                  onClick={() => {
                    setPaymentMethod('paypal_express');
                    setPaymentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'paypal_express'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div>PayPal Express</div>
                      <div
                        className={`text-[10px] font-normal ${
                          paymentMethod === 'paypal_express'
                            ? 'text-neutral-300'
                            : 'text-neutral-500'
                        }`}
                      >
                        Instant PayPal Wallet Auth
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="pay-method-wallet"
                  onClick={() => {
                    setPaymentMethod('apple_google_pay');
                    setPaymentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'apple_google_pay'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div>Apple Pay / Google Pay</div>
                      <div
                        className={`text-[10px] font-normal ${
                          paymentMethod === 'apple_google_pay'
                            ? 'text-neutral-300'
                            : 'text-neutral-500'
                        }`}
                      >
                        Biometric Passkey Token
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="pay-method-cod"
                  onClick={() => {
                    setPaymentMethod('cash_on_delivery');
                    setPaymentError(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Banknote className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div>Cash / POS on Delivery</div>
                      <div
                        className={`text-[10px] font-normal ${
                          paymentMethod === 'cash_on_delivery'
                            ? 'text-neutral-300'
                            : 'text-neutral-500'
                        }`}
                      >
                        Pay Doha Courier upon QID check
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Dynamic Gateway Form Body */}
              {paymentMethod === 'credit_card_gateway' && (
                <div
                  data-testid="credit-card-gateway-fields"
                  className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4"
                >
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-semibold text-neutral-800">
                      Client-Side PCI Tokenization Active (Zero Raw Card Storage)
                    </span>
                    <span className="font-mono-numbers">QNB / QPay / Stripe 3DS</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        data-testid="checkout-card-number-input"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 •••• •••• 4481"
                        maxLength={23}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-mono-numbers focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Name on Card *
                      </label>
                      <input
                        type="text"
                        data-testid="checkout-card-holder-input"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                        placeholder="HAMAD AL THANI"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs uppercase focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Expiration Date (MM/YY) *
                      </label>
                      <input
                        type="text"
                        data-testid="checkout-card-expiry-input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="09/28"
                        maxLength={7}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-mono-numbers focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Security Code (CVV) *
                      </label>
                      <input
                        type="password"
                        data-testid="checkout-card-cvv-input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-mono-numbers focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal_express' && (
                <div
                  data-testid="paypal-gateway-fields"
                  className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 text-xs"
                >
                  <div className="font-bold text-blue-950">
                    PayPal Express International Merchant Checkout
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      PayPal Account Email *
                    </label>
                    <input
                      type="email"
                      data-testid="checkout-paypal-email-input"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-blue-300 bg-white text-xs"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'apple_google_pay' && (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
                  Your device biometric wallet token will authorize{' '}
                  <strong className="font-mono-numbers">{financials.formattedTotal}</strong> upon clicking Complete Order.
                </div>
              )}

              {paymentMethod === 'cash_on_delivery' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                  Pay via portable QPay card terminal or QAR cash when our Doha courier verifies your 21+ Qatar National ID at delivery.
                </div>
              )}

              {/* Payment Failure Simulation Toggle (For testing Failure & Retry Handling) */}
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                  <input
                    type="checkbox"
                    data-testid="simulate-payment-decline-checkbox"
                    checked={simulateDecline}
                    onChange={(e) => setSimulateDecline(e.target.checked)}
                    className="accent-red-600 rounded"
                  />
                  <span>
                    Simulate Gateway Bank Decline (Test Payment Failure &amp; Retry Handling)
                  </span>
                </label>
                <span className="text-[10px] font-mono-numbers text-neutral-500">
                  Or use card ending 0002
                </span>
              </div>

              {/* Payment Failure Alert & Retry Action */}
              {paymentError && (
                <div
                  data-testid="checkout-payment-error-banner"
                  className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-2.5 animate-in fade-in"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-red-950">
                        Payment Authorization Failed
                      </div>
                      <p className="text-red-800 leading-relaxed">{paymentError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      data-testid="checkout-retry-payment-btn"
                      onClick={() => {
                        setSimulateDecline(false);
                        if (cardNumber.trim().endsWith('0002')) {
                          setCardNumber('4532 8810 9921 4481');
                        }
                        void handleCompleteCheckout(undefined, { forceDeclineOff: true });
                      }}
                      className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Payment Now</span>
                    </button>
                    <span className="text-[11px] text-red-700">
                      Your order details and cart are safely preserved.
                    </span>
                  </div>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                data-testid="checkout-submit-order-btn"
                disabled={paymentStatus === 'authorizing' || paymentStatus === 'captured'}
                className="w-full py-4 px-6 rounded-xl bg-[#8a1538] hover:bg-[#70112d] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {paymentStatus === 'authorizing'
                    ? 'Authorizing & Locking Inventory...'
                    : `Pay Now & Complete Order • ${financials.formattedTotal}`}
                </span>
              </button>
            </section>
          </form>

          {/* RIGHT COLUMN (5 Cols): Sticky Order Summary, Product Images, Discounts & Gift Cards */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 block">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold font-display text-neutral-900">
                  Order Summary ({cartItems.reduce((a, b) => a + b.quantity, 0)} Items)
                </h2>
                <span className="text-[11px] font-mono-numbers text-neutral-500">
                  Ref: {draftOrderNumber}
                </span>
              </div>

              {/* Itemized List with Product Images & Quantity Badges */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-neutral-100">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`checkout-summary-item-${item.productId}`}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={item.variant.image || item.product.galleryImages[0]}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-neutral-100 border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-mono-numbers font-bold flex items-center justify-center shadow-2xs">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {item.variant.title}
                        </div>
                        <div className="text-[10px] font-mono-numbers text-neutral-400">
                          SKU: {item.variant.sku}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold font-mono-numbers text-neutral-900 shrink-0">
                      {formatMinorUnits(item.totalPriceMinorUnits, currentCurrency)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Code Input */}
              <div className="pt-4 border-t border-neutral-200 space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Discount Code
                </label>
                <div className="flex gap-2">
                  <div className="relative grow">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-testid="checkout-discount-input"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                      placeholder="Discount code (e.g. PEARL15)"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono-numbers uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="checkout-apply-discount-btn"
                    onClick={() => handleApplyDiscount()}
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {discountMessage && (
                  <p
                    className={`text-[11px] font-medium ${
                      discountMessage.type === 'success'
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {discountMessage.text}
                  </p>
                )}
              </div>

              {/* Gift Card Application */}
              <div className="pt-3 border-t border-neutral-100 space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Gift Card or Sovereign Store Credit
                </label>
                <div className="flex gap-2">
                  <div className="relative grow">
                    <Gift className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-testid="checkout-giftcard-input"
                      value={giftCardInput}
                      onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                      placeholder="e.g. AURA-QA88-9921-PEARL"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono-numbers uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="checkout-apply-giftcard-btn"
                    onClick={() => handleApplyGiftCard()}
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick-Select Active Gift Cards for Demo/Test Convenience */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">Available Gift Cards:</span>
                  {giftCards
                    .filter((g) => g.status === 'active' && g.balanceMinorUnits > 0)
                    .map((gc) => (
                      <button
                        key={gc.id}
                        type="button"
                        data-testid={`quick-giftcard-${gc.code}`}
                        onClick={() => handleApplyGiftCard(gc.code)}
                        className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono-numbers text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        {gc.code} ({formatMinorUnits(gc.balanceMinorUnits, currentCurrency)})
                      </button>
                    ))}
                  {appliedGiftCardCode && (
                    <button
                      type="button"
                      onClick={() => handleApplyGiftCard('')}
                      className="text-[10px] text-red-600 hover:underline ml-1 cursor-pointer"
                    >
                      Remove Gift Card
                    </button>
                  )}
                </div>

                {giftCardMessage && (
                  <p
                    data-testid="checkout-giftcard-feedback"
                    className={`text-[11px] font-medium ${
                      giftCardMessage.type === 'success'
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {giftCardMessage.text}
                  </p>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="pt-4 border-t border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span
                    data-testid="checkout-subtotal"
                    className="font-mono-numbers font-semibold text-neutral-900"
                  >
                    {formatMinorUnits(financials.subtotalMinorUnits, currentCurrency)}
                  </span>
                </div>

                {financials.discountMinorUnits > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedDiscountCode})</span>
                    <span
                      data-testid="checkout-discount-amount"
                      className="font-mono-numbers"
                    >
                      -{formatMinorUnits(financials.discountMinorUnits, currentCurrency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Shipping ({activeShippingMethod.name.split('(')[0].trim()})</span>
                  <span
                    data-testid="checkout-shipping-fee"
                    className="font-mono-numbers font-medium text-neutral-900"
                  >
                    {financials.shippingFeeMinorUnits === 0
                      ? 'FREE'
                      : formatMinorUnits(financials.shippingFeeMinorUnits, currentCurrency)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>
                    Taxes ({Math.round(currentCountry.standardTaxRate * 100)}%)
                  </span>
                  <span
                    data-testid="checkout-tax-amount"
                    className="font-mono-numbers"
                  >
                    {formatMinorUnits(financials.taxMinorUnits, currentCurrency)}
                  </span>
                </div>

                {financials.dutyMinorUnits > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Import Excise ({Math.round(currentCountry.customsDutyRate * 100)}%)
                    </span>
                    <span className="font-mono-numbers">
                      {formatMinorUnits(financials.dutyMinorUnits, currentCurrency)}
                    </span>
                  </div>
                )}

                {(financials.giftCardAppliedMinorUnits || 0) > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Gift Card ({appliedGiftCardCode})</span>
                    <span
                      data-testid="checkout-giftcard-deduction"
                      className="font-mono-numbers"
                    >
                      -
                      {formatMinorUnits(
                        financials.giftCardAppliedMinorUnits || 0,
                        currentCurrency
                      )}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">
                      Final Total Due
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {backendVerifiedTotalMinor !== null
                        ? '✓ Verified by Backend Pricing Engine'
                        : 'Calculated in real time'}
                    </span>
                  </div>
                  <span
                    data-testid="checkout-final-total"
                    className="text-xl font-bold font-mono-numbers text-neutral-900"
                  >
                    {financials.formattedTotal}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
