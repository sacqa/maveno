export type CountryStatus = 'approved' | 'restricted' | 'blocked' | 'pending_legal_review';

export type UserRole = 
  | 'super_admin' 
  | 'administrator' 
  | 'product_manager' 
  | 'order_manager' 
  | 'content_manager' 
  | 'compliance_manager' 
  | 'customer';

export interface Currency {
  code: string; // ISO 4217, e.g. "USD", "GBP", "EUR", "AED", "QAR"
  symbol: string;
  name: string;
  exchangeRateToBase: number; // e.g. 1.0 for QAR
  decimalPrecision: number; // usually 2
  symbolPosition: 'before' | 'after';
  isBaseCurrency?: boolean;
  isActive: boolean;
  lastUpdated: string;
}

export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2, e.g. "QA", "US", "GB", "AE", "SA", "DE"
  flagEmoji: string;
  defaultCurrencyCode: string;
  supportedCurrencyCodes: string[];
  status: CountryStatus;
  minimumAge: number; // e.g. 21 in QA/US, 18 in UK
  ageVerificationRequired: boolean;
  verificationMethod: 'provider_id_lookup' | 'kyc_document_eval' | 'facial_biometric' | 'disabled';
  salesEligible: boolean;
  importRestrictions: string;
  shippingAvailable: boolean;
  standardTaxRate: number;
  customsDutyRate: number;
  complianceNotes: string;
  legalReviewApprovedBy?: string;
  legalReviewDate?: string;
}

export interface ProductAttribute {
  id: string;
  name: string; // e.g. "Color", "Resistance", "Nicotine Strength", "Capacity", "Size"
  values: string[];
}

export interface ProductMetafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: 'single_line_text' | 'number_integer' | 'json' | 'boolean';
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  title: string;
  attributes: Record<string, string>;
  priceMinorUnits: number;
  compareAtPriceMinorUnits?: number;
  costPerItemMinorUnits?: number;
  stockQuantity: number;
  committedQuantity?: number;
  incomingQuantity?: number;
  locationStock?: Record<string, number>; // locationId -> available qty
  weightGrams: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  brand: string;
  vendor?: string;
  categoryId: string;
  productType: 'hardware_mod' | 'atomizer_tank' | 'botanical_eliquid' | 'pod_system' | 'accessory';
  tags?: string[];
  collectionIds?: string[];
  shortDescription: string;
  fullDescription: string;
  galleryImages: string[];
  mediaVideos?: string[];
  specs: Record<string, string>;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  status: 'published' | 'draft' | 'archived' | 'discontinued';
  basePriceMinorUnits: number;
  compareAtPriceMinorUnits?: number;
  costPerItemMinorUnits?: number;
  trackQuantity?: boolean;
  continueSellingWhenOutOfStock?: boolean;
  isPhysicalProduct?: boolean;
  shippingWeightGrams?: number;
  countrySpecificPrices?: Record<string, number>;
  currencySpecificPrices?: Record<string, number>;
  restrictedCountries?: string[];
  isAgeRestricted: boolean;
  complianceWarning: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  metafields?: ProductMetafield[];
  createdAt?: string;
  salesCount?: number;
  sizes?: string[];
  colors?: string[];
}

export interface BulkInventoryUpdateItem {
  productId: string;
  variantId: string;
  productName: string;
  variantTitle: string;
  sku: string;
  locationId: string;
  currentStock: number;
  newStock: number;
  delta: number;
  reason: StockHistoryEntry['reason'];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentCategoryId?: string;
  image: string;
  sortOrder: number;
  itemCount: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  originCountry: string;
  logo: string;
  description: string;
  website: string;
  productCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unitPriceMinorUnits: number;
  totalPriceMinorUnits: number;
}

export interface Cart {
  items: CartItem[];
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  shippingMinorUnits: number;
  taxMinorUnits: number;
  dutyMinorUnits: number;
  finalTotalMinorUnits: number;
  currencyCode: string;
  countryCode: string;
}

export interface AgeVerificationRecord {
  id: string;
  customerEmail: string;
  customerName: string;
  countryCode: string;
  dateOfBirth: string; // YYYY-MM-DD
  verifiedAge: number;
  provider: 'Qatar National ID (QID)' | 'MOPH Verification API' | 'Veratad Global' | 'VerifyMyAge UK' | 'Persona Identity' | 'Simulated Provider API';
  providerReference: string;
  status: 'passed' | 'failed' | 'pending';
  timestamp: string;
  complianceAuditHash: string;
}

export interface ShippingMethodOption {
  id: string;
  name: string;
  carrier: string;
  description: string;
  estimatedDays: number;
  estimatedLabel: string;
  baseFeeMinorUnits: number;
  freeOverThreshold: boolean;
}

export interface PersistedCartState {
  items: {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
  }[];
  discountCode?: string;
  giftCardCode?: string;
  orderNotes?: string;
  shippingMethodId?: string;
  updatedAt: string;
}

export interface ImmutableOrderSnapshot {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  idempotencyKey?: string;
  status: 'awaiting_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  isDraft?: boolean;
  isGuestCheckout?: boolean;
  refundedAmountMinorUnits?: number;
  returnStatus?: 'none' | 'requested' | 'approved' | 'returned';
  notes?: string;
  tags?: string[];
  discountCode?: string;
  giftCardCode?: string;
  confirmationEmailSentAt?: string;
  customer: {
    id?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    municipality?: string;
    zone?: string;
    stateOrProvince: string;
    postalCode: string;
    countryCode: string;
    countryName: string;
  };
  billingSameAsShipping?: boolean;
  billingAddress?: {
    fullName?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    municipality?: string;
    zone?: string;
    stateOrProvince: string;
    postalCode: string;
    countryCode: string;
    countryName: string;
  };
  items: {
    productId: string;
    variantId: string;
    productName: string;
    variantTitle: string;
    sku: string;
    quantity: number;
    unitPriceMinorUnits: number;
    totalPriceMinorUnits: number;
    productSnapshot: {
      brand: string;
      image: string;
      specs: Record<string, string>;
    };
  }[];
  financials: {
    currencyCode: string;
    exchangeRateUsed: number;
    subtotalMinorUnits: number;
    discountMinorUnits: number;
    giftCardAppliedMinorUnits?: number;
    shippingFeeMinorUnits: number;
    taxMinorUnits: number;
    dutyMinorUnits: number;
    totalAmountMinorUnits: number;
    formattedTotal: string;
  };
  compliance: {
    countryMinimumAgeRequired: number;
    customerVerifiedAge: number;
    ageVerificationRecordId: string;
    verificationProviderRef: string;
    jurisdictionLegalStatus: CountryStatus;
    tpdFdaComplianceStatement: string;
  };
  payment: {
    method:
      | 'credit_card_gateway'
      | 'paypal_express'
      | 'apple_google_pay'
      | 'high_risk_approved_gateway'
      | 'sandbox_terminal'
      | 'wire_transfer_swift'
      | 'cash_on_delivery';
    paymentStatus: 'authorized' | 'captured' | 'pending' | 'failed' | 'partially_refunded' | 'refunded';
    transactionId: string;
    cardBrand?: string;
    cardLast4?: string;
    payerEmail?: string;
    paymentToken?: string;
  };
  shipping: {
    methodId?: string;
    carrier: string;
    service: string;
    trackingNumber?: string;
    estimatedDeliveryDays: number;
  };
  timeline: {
    status: string;
    timestamp: string;
    note: string;
  }[];
}

// --- Shopify Admin Expanded Entities ---

export interface CustomerAddress {
  id: string;
  label: string; // e.g. "Primary Residence", "Office Tower"
  addressLine1: string;
  addressLine2?: string;
  city: string;
  municipality: string;
  zone: string;
  postalCode: string;
  countryCode: string;
  countryName: string;
  isDefault: boolean;
}

export interface CustomerRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  addresses: CustomerAddress[];
  tags: string[];
  notes: string;
  marketingSubscribed: boolean;
  smsMarketingSubscribed: boolean;
  segment: 'VIP' | 'Returning' | 'First-Time' | 'At-Risk' | 'Wholesale';
  qidNumber?: string;
  verifiedAge?: number;
  taxExempt?: boolean;
  createdAt: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  countryCode: string;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  priority: number;
}

export interface InventoryTransfer {
  id: string;
  referenceNumber: string;
  originLocationId: string;
  destinationLocationId: string;
  status: 'draft' | 'pending' | 'in_transit' | 'received' | 'cancelled';
  items: {
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
  }[];
  expectedArrival: string;
  createdAt: string;
  notes?: string;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  locationId: string;
  locationName: string;
  delta: number;
  newAvailable: number;
  reason: 'correction' | 'received' | 'damaged' | 'theft_loss' | 'order_fulfillment' | 'transfer' | 'return_restock';
  adjustedBy: string;
  timestamp: string;
}

export interface CollectionCondition {
  id: string;
  field: 'tag' | 'price' | 'vendor' | 'product_type' | 'inventory';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

export interface ProductCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: string;
  type: 'manual' | 'automated';
  conditions: CollectionCondition[];
  productIds: string[]; // used when manual
  sortOrder: 'best_selling' | 'alpha_asc' | 'price_desc' | 'price_asc' | 'manual';
  seoTitle: string;
  seoDescription: string;
  status: 'active' | 'draft';
  updatedAt: string;
}

export interface DiscountRule {
  id: string;
  code: string;
  title: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
  method: 'code' | 'automatic';
  value: number; // percentage (e.g. 15) or minor units (e.g. 5000 = 50.00 QAR)
  buyQuantity?: number;
  getQuantity?: number;
  minPurchaseMinorUnits: number;
  customerEligibility: 'all' | 'specific_segment' | 'specific_customers';
  eligibleSegment?: string;
  eligibleCustomerEmails?: string[];
  usageLimit?: number;
  usedCount: number;
  startsAt: string;
  endsAt?: string;
  status: 'active' | 'scheduled' | 'expired';
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: 'email' | 'paid_search' | 'social_instagram' | 'sms_concierge' | 'whatsapp_vip';
  status: 'active' | 'draft' | 'completed' | 'paused';
  budgetMinorUnits: number;
  spentMinorUnits: number;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  sessions: number;
  ordersCount: number;
  revenueMinorUnits: number;
  subjectLine?: string;
  audienceSegment?: string;
  createdAt: string;
}

export interface GiftCardTransaction {
  id: string;
  date: string;
  amountMinorUnits: number; // positive for issue/refund, negative for redemption
  type: 'issue' | 'redemption' | 'refund' | 'adjustment';
  orderNumber?: string;
  note: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initialValueMinorUnits: number;
  balanceMinorUnits: number;
  currencyCode: string;
  customerEmail?: string;
  customerName?: string;
  recipientNote?: string;
  expiresAt?: string;
  status: 'active' | 'disabled' | 'expired' | 'depleted';
  createdAt: string;
  transactions: GiftCardTransaction[];
}

export interface StorePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  template: 'default' | 'compliance' | 'contact' | 'faq';
  status: 'published' | 'draft';
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  url: string;
  type: 'collection' | 'page' | 'product' | 'external';
}

export interface NavigationMenu {
  id: string;
  title: string;
  handle: string;
  items: NavigationMenuItem[];
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  fileType: 'image/jpeg' | 'image/png' | 'video/mp4' | 'application/pdf';
  sizeBytes: number;
  dimensions?: string;
  altText: string;
  uploadedAt: string;
  usedIn: string[];
}

export interface StaffAccount {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions: string[];
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
  twoFactorEnabled: boolean;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  category: 'order' | 'inventory' | 'compliance' | 'system';
  read: boolean;
  timestamp: string;
  targetTab?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoText: string;
  logoImageUrl?: string;
  faviconUrl?: string;
  contactEmail: string;
  contactPhone: string;
  supportAddress: string;
  baseCurrencyCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  announcementBarText: string;
  announcementBarEnabled: boolean;
  ageDisclaimerHeader: string;
  ageDisclaimerBody: string;
  freeShippingThresholdMinorUnits: number;
  enableSandboxPayment: boolean;
  // Homepage Management
  heroBadge?: string;
  heroHeadline?: string;
  heroDescription?: string;
  heroPrimaryButtonText?: string;
  heroSecondaryButtonText?: string;
  heroFeaturedTag?: string;
  homepageProductLimit?: number;
  shopProductsPerPage?: number;
  // Shipping Management
  standardShippingFeeMinorUnits?: number;
  expressShippingFeeMinorUnits?: number;
  defaultShippingCarrier?: string;
  shippingEstimatedDays?: number;
  dohaLocalSameDayEnabled?: boolean;
  // Extended Settings
  primaryDomain?: string;
  multiLanguageEnabled?: boolean;
  supportedLocales?: string[];
  checkoutRequirePhone?: boolean;
  checkoutRequireQid?: boolean;
  checkoutAutoFulfillDigital?: boolean;
  customerSelfServeReturns?: boolean;
  privacyPolicyText?: string;
  refundPolicyText?: string;
  termsOfServiceText?: string;
  webhookEndpointUrl?: string;
  storefrontApiToken?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  publishedDate: string;
  status?: 'published' | 'draft';
  category: string;
  tags: string[];
  readTime: string;
  image: string;
  seoTitle: string;
  seoDescription: string;
}
