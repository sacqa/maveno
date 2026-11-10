import {
  Country,
  Currency,
  Product,
  Category,
  Brand,
  StoreSettings,
  BlogPost,
  AgeVerificationRecord,
  ImmutableOrderSnapshot,
  UserRole,
  CustomerRecord,
  InventoryLocation,
  InventoryTransfer,
  StockHistoryEntry,
  ProductCollection,
  DiscountRule,
  MarketingCampaign,
  GiftCard,
  StorePage,
  NavigationMenu,
  MediaAsset,
  StaffAccount,
  AdminNotification,
  BulkInventoryUpdateItem,
  PersistedCartState,
  CartItem,
} from '../types/ecommerce';
import { resolveProductPrice } from '../utils/commerce-engine';
import { ParsedCsvProductPreview, CsvImportExecutionReport } from '../utils/shopify-csv';
import {
  INITIAL_COUNTRIES,
  INITIAL_CURRENCIES,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_AGE_VERIFICATIONS,
  INITIAL_BLOG_POSTS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY_LOCATIONS,
  INITIAL_INVENTORY_TRANSFERS,
  INITIAL_STOCK_HISTORY,
  INITIAL_COLLECTIONS,
  INITIAL_DISCOUNTS,
  INITIAL_MARKETING_CAMPAIGNS,
  INITIAL_GIFT_CARDS,
  INITIAL_PAGES,
  INITIAL_MENUS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_STAFF,
  INITIAL_NOTIFICATIONS,
} from '../data/initial-database';

const STORAGE_KEYS = {
  COUNTRIES: 'aura_db_countries',
  CURRENCIES: 'aura_db_currencies',
  PRODUCTS: 'aura_db_products',
  CATEGORIES: 'aura_db_categories',
  BRANDS: 'aura_db_brands',
  SETTINGS: 'aura_db_settings',
  ORDERS: 'aura_db_orders',
  VERIFICATIONS: 'aura_db_verifications',
  BLOGS: 'aura_db_blogs',
  USER_ROLE: 'aura_user_role',
  CUSTOMERS: 'aura_db_customers',
  LOCATIONS: 'aura_db_locations',
  TRANSFERS: 'aura_db_transfers',
  STOCK_HISTORY: 'aura_db_stock_history',
  COLLECTIONS: 'aura_db_collections',
  DISCOUNTS: 'aura_db_discounts',
  CAMPAIGNS: 'aura_db_campaigns',
  GIFT_CARDS: 'aura_db_gift_cards',
  PAGES: 'aura_db_pages',
  MENUS: 'aura_db_menus',
  MEDIA: 'aura_db_media',
  STAFF: 'aura_db_staff',
  NOTIFICATIONS: 'aura_db_notifications',
  CART: 'aura_qatar_shopping_cart_v1',
};

class StoreDatabase {
  private countries: Country[] = [];
  private currencies: Currency[] = [];
  private products: Product[] = [];
  private categories: Category[] = [];
  private brands: Brand[] = [];
  private settings: StoreSettings = INITIAL_SETTINGS;
  private orders: ImmutableOrderSnapshot[] = [];
  private verifications: AgeVerificationRecord[] = [];
  private blogPosts: BlogPost[] = [];
  private currentUserRole: UserRole = 'super_admin';
  private customers: CustomerRecord[] = [];
  private locations: InventoryLocation[] = [];
  private transfers: InventoryTransfer[] = [];
  private stockHistory: StockHistoryEntry[] = [];
  private collections: ProductCollection[] = [];
  private discounts: DiscountRule[] = [];
  private campaigns: MarketingCampaign[] = [];
  private giftCards: GiftCard[] = [];
  private pages: StorePage[] = [];
  private menus: NavigationMenu[] = [];
  private mediaAssets: MediaAsset[] = [];
  private staffAccounts: StaffAccount[] = [];
  private notifications: AdminNotification[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      this.settings = storedSettings ? { ...INITIAL_SETTINGS, ...JSON.parse(storedSettings) } : { ...INITIAL_SETTINGS };
      if (!storedSettings || this.settings.storeName === 'AURA INTERNATIONAL' || this.settings.baseCurrencyCode === 'USD') {
        this.settings = { ...INITIAL_SETTINGS };
      }
      this.settings.headingFont = "'Poppins', sans-serif";
      if (!this.settings.homepageProductLimit || this.settings.homepageProductLimit < 1) {
        this.settings.homepageProductLimit = 4;
      }
      if (!this.settings.shopProductsPerPage || this.settings.shopProductsPerPage < 1) {
        this.settings.shopProductsPerPage = 8;
      }

      const storedCountries = localStorage.getItem(STORAGE_KEYS.COUNTRIES);
      this.countries = storedCountries ? JSON.parse(storedCountries) : [...INITIAL_COUNTRIES];
      const qatarIdx = this.countries.findIndex((c) => c.code === 'QA');
      if (qatarIdx >= 0) {
        this.countries[qatarIdx].status = 'approved';
        this.countries[qatarIdx].salesEligible = true;
        this.countries[qatarIdx].shippingAvailable = true;
        this.countries[qatarIdx].minimumAge = 21;
      } else {
        this.countries.unshift(INITIAL_COUNTRIES[0]);
      }

      const storedCurrencies = localStorage.getItem(STORAGE_KEYS.CURRENCIES);
      this.currencies = storedCurrencies ? JSON.parse(storedCurrencies) : [...INITIAL_CURRENCIES];
      const qarCurr = this.currencies.find((c) => c.code === 'QAR');
      if (qarCurr) {
        this.currencies.forEach((c) => { c.isBaseCurrency = c.code === 'QAR'; });
      } else {
        this.currencies = [...INITIAL_CURRENCIES];
      }

      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (storedProducts) {
        const parsed: Product[] = JSON.parse(storedProducts);
        // Enrich any older product missing compareAtPriceMinorUnits / costPerItemMinorUnits / tags
        this.products = parsed.map((p, idx) => {
          const seed = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
          return {
            ...seed,
            ...p,
            tags: p.tags || seed?.tags || p.seoKeywords || ['Qatar-MOPH'],
            vendor: p.vendor || seed?.vendor || p.brand,
            compareAtPriceMinorUnits: p.compareAtPriceMinorUnits ?? seed?.compareAtPriceMinorUnits ?? Math.round(p.basePriceMinorUnits * 1.15),
            costPerItemMinorUnits: p.costPerItemMinorUnits ?? seed?.costPerItemMinorUnits ?? Math.round(p.basePriceMinorUnits * 0.5),
            barcode: p.barcode || seed?.barcode || '6291041500999',
            trackQuantity: p.trackQuantity ?? true,
            isPhysicalProduct: p.isPhysicalProduct ?? true,
            metafields: p.metafields || seed?.metafields || [],
            createdAt: p.createdAt || seed?.createdAt || `2026-10-${String(15 + (idx % 14)).padStart(2, '0')}T10:00:00Z`,
            salesCount: p.salesCount ?? seed?.salesCount ?? (120 - idx * 7),
          };
        });
        // Append any newly added INITIAL_PRODUCTS that weren't in localStorage yet
        INITIAL_PRODUCTS.forEach((seedProd) => {
          if (!this.products.some((p) => p.id === seedProd.id || p.slug === seedProd.slug)) {
            this.products.push({ ...seedProd });
          }
        });
      } else {
        this.products = [...INITIAL_PRODUCTS];
      }

      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      this.categories = storedCategories ? JSON.parse(storedCategories) : [...INITIAL_CATEGORIES];

      const storedBrands = localStorage.getItem(STORAGE_KEYS.BRANDS);
      this.brands = storedBrands ? JSON.parse(storedBrands) : [...INITIAL_BRANDS];

      const storedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      this.orders = storedOrders ? JSON.parse(storedOrders) : [...INITIAL_ORDERS];

      const storedVerifications = localStorage.getItem(STORAGE_KEYS.VERIFICATIONS);
      this.verifications = storedVerifications ? JSON.parse(storedVerifications) : [...INITIAL_AGE_VERIFICATIONS];

      const storedBlogs = localStorage.getItem(STORAGE_KEYS.BLOGS);
      this.blogPosts = storedBlogs ? JSON.parse(storedBlogs) : [...INITIAL_BLOG_POSTS];

      const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
      if (storedRole) {
        this.currentUserRole = storedRole as UserRole;
      }

      const storedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      this.customers = storedCustomers ? JSON.parse(storedCustomers) : [...INITIAL_CUSTOMERS];
      this.syncOrdersIntoCustomers();

      const storedLocations = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      this.locations = storedLocations ? JSON.parse(storedLocations) : [...INITIAL_INVENTORY_LOCATIONS];

      const storedTransfers = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      this.transfers = storedTransfers ? JSON.parse(storedTransfers) : [...INITIAL_INVENTORY_TRANSFERS];

      const storedStockHistory = localStorage.getItem(STORAGE_KEYS.STOCK_HISTORY);
      this.stockHistory = storedStockHistory ? JSON.parse(storedStockHistory) : [...INITIAL_STOCK_HISTORY];

      const storedCollections = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      this.collections = storedCollections ? JSON.parse(storedCollections) : [...INITIAL_COLLECTIONS];

      const storedDiscounts = localStorage.getItem(STORAGE_KEYS.DISCOUNTS);
      this.discounts = storedDiscounts ? JSON.parse(storedDiscounts) : [...INITIAL_DISCOUNTS];

      const storedCampaigns = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      this.campaigns = storedCampaigns ? JSON.parse(storedCampaigns) : [...INITIAL_MARKETING_CAMPAIGNS];

      const storedGiftCards = localStorage.getItem(STORAGE_KEYS.GIFT_CARDS);
      this.giftCards = storedGiftCards ? JSON.parse(storedGiftCards) : [...INITIAL_GIFT_CARDS];

      const storedPages = localStorage.getItem(STORAGE_KEYS.PAGES);
      this.pages = storedPages ? JSON.parse(storedPages) : [...INITIAL_PAGES];

      const storedMenus = localStorage.getItem(STORAGE_KEYS.MENUS);
      this.menus = storedMenus ? JSON.parse(storedMenus) : [...INITIAL_MENUS];

      const storedMedia = localStorage.getItem(STORAGE_KEYS.MEDIA);
      this.mediaAssets = storedMedia ? JSON.parse(storedMedia) : [...INITIAL_MEDIA_ASSETS];

      const storedStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
      this.staffAccounts = storedStaff ? JSON.parse(storedStaff) : [...INITIAL_STAFF];

      const storedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = storedNotifications ? JSON.parse(storedNotifications) : [...INITIAL_NOTIFICATIONS];
    } catch {
      this.resetToDefaults();
    }
  }

  private syncOrdersIntoCustomers() {
    this.orders.forEach((o) => {
      const exists = this.customers.some(
        (c) => c.email.toLowerCase() === o.customer.email.toLowerCase()
      );
      if (!exists) {
        this.customers.unshift({
          id: 'cust_' + Math.random().toString(36).substring(2, 9),
          fullName: o.customer.fullName,
          email: o.customer.email,
          phone: o.customer.phone,
          addresses: [
            {
              id: 'addr_' + Math.random().toString(36).substring(2, 7),
              label: 'Primary Delivery Address',
              addressLine1: o.shippingAddress.addressLine1,
              addressLine2: o.shippingAddress.addressLine2,
              city: o.shippingAddress.city,
              municipality: o.shippingAddress.municipality || o.shippingAddress.city,
              zone: o.shippingAddress.zone || 'Zone 66',
              postalCode: o.shippingAddress.postalCode,
              countryCode: o.shippingAddress.countryCode,
              countryName: o.shippingAddress.countryName,
              isDefault: true,
            },
          ],
          tags: ['Qatar-Resident', 'Verified-21+'],
          notes: `Auto-synced from Order ${o.orderNumber}`,
          marketingSubscribed: true,
          smsMarketingSubscribed: true,
          segment: 'Returning',
          qidNumber: o.compliance?.verificationProviderRef || 'QID-Verified',
          verifiedAge: o.compliance?.customerVerifiedAge || 28,
          taxExempt: false,
          createdAt: o.orderDate,
        });
      }
    });
  }

  public resetToDefaults() {
    this.settings = { ...INITIAL_SETTINGS };
    this.countries = [...INITIAL_COUNTRIES];
    this.currencies = [...INITIAL_CURRENCIES];
    this.products = [...INITIAL_PRODUCTS];
    this.categories = [...INITIAL_CATEGORIES];
    this.brands = [...INITIAL_BRANDS];
    this.orders = [...INITIAL_ORDERS];
    this.verifications = [...INITIAL_AGE_VERIFICATIONS];
    this.blogPosts = [...INITIAL_BLOG_POSTS];
    this.customers = [...INITIAL_CUSTOMERS];
    this.locations = [...INITIAL_INVENTORY_LOCATIONS];
    this.transfers = [...INITIAL_INVENTORY_TRANSFERS];
    this.stockHistory = [...INITIAL_STOCK_HISTORY];
    this.collections = [...INITIAL_COLLECTIONS];
    this.discounts = [...INITIAL_DISCOUNTS];
    this.campaigns = [...INITIAL_MARKETING_CAMPAIGNS];
    this.giftCards = [...INITIAL_GIFT_CARDS];
    this.pages = [...INITIAL_PAGES];
    this.menus = [...INITIAL_MENUS];
    this.mediaAssets = [...INITIAL_MEDIA_ASSETS];
    this.staffAccounts = [...INITIAL_STAFF];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.saveAll();
  }

  private saveAll() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      localStorage.setItem(STORAGE_KEYS.COUNTRIES, JSON.stringify(this.countries));
      localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(this.currencies));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(this.brands));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
      localStorage.setItem(STORAGE_KEYS.VERIFICATIONS, JSON.stringify(this.verifications));
      localStorage.setItem(STORAGE_KEYS.BLOGS, JSON.stringify(this.blogPosts));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, this.currentUserRole);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(this.customers));
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(this.locations));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(this.transfers));
      localStorage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(this.stockHistory));
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(this.collections));
      localStorage.setItem(STORAGE_KEYS.DISCOUNTS, JSON.stringify(this.discounts));
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(this.campaigns));
      localStorage.setItem(STORAGE_KEYS.GIFT_CARDS, JSON.stringify(this.giftCards));
      localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(this.pages));
      localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(this.menus));
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(this.mediaAssets));
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(this.staffAccounts));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
    } catch {
      // storage unavailable
    }
  }

  // --- Settings ---
  public getSettings(): StoreSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    this.settings = { ...this.settings, ...updates, headingFont: "'Poppins', sans-serif" };
    this.saveAll();
    this.applyBrandStyling();
    return { ...this.settings };
  }

  public applyBrandStyling() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (this.settings.primaryColor) {
      root.style.setProperty('--brand-primary', this.settings.primaryColor);
    }
    if (this.settings.secondaryColor) {
      root.style.setProperty('--brand-secondary', this.settings.secondaryColor);
    }
    if (this.settings.accentColor) {
      root.style.setProperty('--brand-accent', this.settings.accentColor);
    }
    if (this.settings.headingFont) {
      root.style.setProperty('--font-heading', this.settings.headingFont);
      root.style.setProperty('--font-sans', this.settings.headingFont);
    }
  }

  // --- Countries ---
  public getCountries(): Country[] {
    return [...this.countries];
  }

  public getCountryByCode(code: string): Country | undefined {
    return this.countries.find((c) => c.code.toUpperCase() === code.toUpperCase());
  }

  public updateCountry(code: string, updates: Partial<Country>): Country {
    const index = this.countries.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());
    if (index === -1) {
      throw new Error(`Country ${code} not found`);
    }

    if (updates.status === 'approved' && this.countries[index].status !== 'approved') {
      if (!updates.legalReviewApprovedBy && !this.countries[index].legalReviewApprovedBy) {
        updates.legalReviewApprovedBy = 'Compliance Officer (Manual Verification)';
        updates.legalReviewDate = new Date().toISOString().split('T')[0];
      }
      updates.salesEligible = true;
      updates.shippingAvailable = true;
    } else if (updates.status === 'blocked' || updates.status === 'pending_legal_review') {
      updates.salesEligible = false;
      updates.shippingAvailable = false;
    }

    this.countries[index] = { ...this.countries[index], ...updates };
    this.saveAll();
    return { ...this.countries[index] };
  }

  // --- Currencies ---
  public getCurrencies(): Currency[] {
    return [...this.currencies];
  }

  public getCurrencyByCode(code: string): Currency {
    return (
      this.currencies.find((c) => c.code.toUpperCase() === code.toUpperCase()) ||
      this.currencies[0]
    );
  }

  public updateExchangeRate(code: string, newRate: number): Currency {
    const curr = this.currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!curr) throw new Error(`Currency ${code} not found`);
    curr.exchangeRateToBase = newRate;
    curr.lastUpdated = new Date().toISOString();
    this.saveAll();
    return { ...curr };
  }

  public addCurrency(currency: Omit<Currency, 'lastUpdated'>): Currency {
    const existing = this.currencies.find((c) => c.code.toUpperCase() === currency.code.toUpperCase());
    if (existing) throw new Error(`Currency ${currency.code} already exists`);
    const newCurr: Currency = {
      ...currency,
      lastUpdated: new Date().toISOString(),
    };
    this.currencies.push(newCurr);
    this.saveAll();
    return newCurr;
  }

  // --- Products ---
  public getProducts(filter?: {
    categoryId?: string;
    brand?: string;
    status?: Product['status'];
    search?: string;
  }): Product[] {
    let result = [...this.products];
    if (filter) {
      if (filter.status) {
        result = result.filter((p) => p.status === filter.status);
      }
      if (filter.categoryId && filter.categoryId !== 'all') {
        result = result.filter((p) => p.categoryId === filter.categoryId);
      }
      if (filter.brand && filter.brand !== 'all') {
        result = result.filter((p) => p.brand === filter.brand);
      }
      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.shortDescription.toLowerCase().includes(query) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(query)) ||
            p.seoKeywords.some((k) => k.toLowerCase().includes(query))
        );
      }
    }
    return result;
  }

  public getProductBySlug(slug: string): Product | undefined {
    return this.products.find((p) => p.slug === slug);
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public saveProduct(product: Product): Product {
    const idx = this.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.unshift(product);
    }
    this.saveAll();
    return product;
  }

  public duplicateProduct(productId: string): Product | undefined {
    const orig = this.getProductById(productId);
    if (!orig) return undefined;
    const copyId = `prod_${Date.now()}`;
    const copy: Product = {
      ...JSON.parse(JSON.stringify(orig)),
      id: copyId,
      name: `${orig.name} (Copy)`,
      slug: `${orig.slug}-copy-${Math.floor(100 + Math.random() * 900)}`,
      sku: `${orig.sku}-COPY`,
      status: 'draft',
    };
    this.products.unshift(copy);
    this.saveAll();
    return copy;
  }

  public bulkUpdateProducts(
    productIds: string[],
    updates: { status?: Product['status']; addTag?: string; priceAdjustmentPercent?: number }
  ) {
    this.products = this.products.map((p) => {
      if (!productIds.includes(p.id)) return p;
      const updated = { ...p };
      if (updates.status) updated.status = updates.status;
      if (updates.addTag && updates.addTag.trim()) {
        const currentTags = new Set(updated.tags || []);
        currentTags.add(updates.addTag.trim());
        updated.tags = Array.from(currentTags);
      }
      if (updates.priceAdjustmentPercent !== undefined && updates.priceAdjustmentPercent !== 0) {
        const factor = 1 + updates.priceAdjustmentPercent / 100;
        const newPrice = Math.round(updated.basePriceMinorUnits * factor);
        updated.basePriceMinorUnits = newPrice;
        updated.countrySpecificPrices = { ...updated.countrySpecificPrices, QA: newPrice };
        updated.currencySpecificPrices = { ...updated.currencySpecificPrices, QAR: newPrice };
        updated.variants = updated.variants.map((v) => ({
          ...v,
          priceMinorUnits: Math.round(v.priceMinorUnits * factor),
        }));
      }
      return updated;
    });
    this.saveAll();
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    if (this.products.length !== initialLen) {
      this.saveAll();
      return true;
    }
    return false;
  }

  public importShopifyCsvProducts(
    previews: ParsedCsvProductPreview[],
    options: { overwriteExisting: boolean }
  ): CsvImportExecutionReport {
    const report: CsvImportExecutionReport = {
      totalRowsProcessed: previews.reduce((acc, p) => acc + p.sourceRowNumbers.length, 0),
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      collectionsLinked: 0,
      createdProducts: [],
      updatedProducts: [],
      failedItems: [],
      completedAt: new Date().toISOString(),
    };

    previews.forEach((item) => {
      if (!item.isValid) {
        report.skippedCount++;
        report.failedItems.push({
          handle: item.handle,
          rowNumbers: item.sourceRowNumbers,
          errors: item.errors.map((e) => e.message),
        });
        return;
      }

      if (item.action === 'update' && !options.overwriteExisting) {
        report.skippedCount++;
        report.failedItems.push({
          handle: item.handle,
          rowNumbers: item.sourceRowNumbers,
          errors: ['Skipped existing product because "Overwrite existing products" is unchecked.'],
        });
        return;
      }

      const prod = { ...item.product };

      // Ensure brand exists in brands list
      if (prod.brand) {
        const brandExists = this.brands.some((b) => b.name.toLowerCase() === prod.brand.toLowerCase());
        if (!brandExists) {
          this.brands.push({
            id: `brand_${prod.brand.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            name: prod.brand,
            slug: prod.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            originCountry: 'QA',
            logo: prod.galleryImages[0] || '/src/assets/images/hero_luxury_vape_mod_1794234135797.jpg',
            description: `${prod.brand} — Authorized Qatar Distributor`,
            website: 'https://aura.qa',
            productCount: 1,
          });
        }
      }

      // Link collections (match by title or handle, or create manual collection if new)
      const linkedCollectionIds = new Set<string>(prod.collectionIds || []);
      item.collectionNames.forEach((colName) => {
        const normName = colName.trim();
        if (!normName) return;
        const normHandle = normName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let col = this.collections.find(
          (c) =>
            c.title.toLowerCase() === normName.toLowerCase() ||
            c.handle.toLowerCase() === normHandle
        );
        if (!col) {
          col = {
            id: `col_csv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: normName,
            handle: normHandle,
            description: `Collection imported via Shopify CSV (${normName}).`,
            image: prod.galleryImages[0] || '/src/assets/images/hero_luxury_vape_mod_1794234135797.jpg',
            type: 'manual',
            conditions: [],
            productIds: [prod.id],
            sortOrder: 'best_selling',
            seoTitle: `${normName} | AURA Qatar`,
            seoDescription: `Explore ${normName} collection at AURA Qatar.`,
            status: 'active',
            updatedAt: new Date().toISOString(),
          };
          this.collections.unshift(col);
        } else if (!col.productIds.includes(prod.id)) {
          col.productIds.push(prod.id);
          col.updatedAt = new Date().toISOString();
        }
        linkedCollectionIds.add(col.id);
        report.collectionsLinked++;
      });
      prod.collectionIds = Array.from(linkedCollectionIds);

      // Save or update product
      const existingIdx = this.products.findIndex(
        (p) => p.id === prod.id || p.slug.toLowerCase() === prod.slug.toLowerCase()
      );

      if (existingIdx >= 0) {
        const prevProd = this.products[existingIdx];
        prod.id = prevProd.id;
        this.products[existingIdx] = prod;
        report.updatedCount++;
        report.updatedProducts.push({
          id: prod.id,
          handle: prod.slug,
          name: prod.name,
          sku: prod.sku,
          variantsCount: prod.variants.length,
        });
      } else {
        this.products.unshift(prod);
        report.createdCount++;
        report.createdProducts.push({
          id: prod.id,
          handle: prod.slug,
          name: prod.name,
          sku: prod.sku,
          variantsCount: prod.variants.length,
        });
      }

      // Record stock history entries for variants
      const defaultLoc = this.locations[0] || {
        id: 'loc_doha_pearl',
        name: 'Doha Pearl Flagship Fulfillment Hub',
      };
      prod.variants.forEach((v) => {
        this.stockHistory.unshift({
          id: `sh_csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productId: prod.id,
          variantId: v.id,
          productName: `${prod.name} (${v.title})`,
          sku: v.sku,
          locationId: defaultLoc.id,
          locationName: defaultLoc.name,
          delta: v.stockQuantity,
          newAvailable: v.stockQuantity,
          reason: 'received',
          adjustedBy: 'Shopify CSV Batch Importer',
          timestamp: new Date().toISOString(),
        });
      });

      report.variantsProcessed += prod.variants.length;
      report.imagesProcessed += prod.galleryImages.length;
    });

    this.saveAll();
    return report;
  }

  // --- Categories & Brands ---
  public getCategories(): Category[] {
    return [...this.categories];
  }

  public saveCategory(category: Category): Category {
    const idx = this.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      this.categories[idx] = category;
    } else {
      this.categories.push(category);
    }
    this.saveAll();
    return category;
  }

  public getBrands(): Brand[] {
    return [...this.brands];
  }

  public saveBrand(brand: Brand): Brand {
    const idx = this.brands.findIndex((b) => b.id === brand.id);
    if (idx >= 0) {
      this.brands[idx] = brand;
    } else {
      this.brands.push(brand);
    }
    this.saveAll();
    return brand;
  }

  // --- Age Verification & Compliance Audit ---
  public recordAgeVerification(record: Omit<AgeVerificationRecord, 'id' | 'timestamp' | 'complianceAuditHash'>): AgeVerificationRecord {
    const newRecord: AgeVerificationRecord = {
      ...record,
      id: 'av_' + Math.random().toString(36).substring(2, 10),
      timestamp: new Date().toISOString(),
      complianceAuditHash: 'sha256_' + Math.random().toString(36).substring(2, 18),
    };
    this.verifications.unshift(newRecord);
    this.saveAll();
    return newRecord;
  }

  public getAgeVerifications(): AgeVerificationRecord[] {
    return [...this.verifications];
  }

  // --- Orders & Snapshots ---
  public createOrder(order: ImmutableOrderSnapshot): ImmutableOrderSnapshot {
    // 1. Idempotency protection: prevent duplicate orders and duplicate payment/inventory processing
    if (order.idempotencyKey) {
      const existingByKey = this.orders.find((o) => o.idempotencyKey === order.idempotencyKey);
      if (existingByKey) {
        return existingByKey;
      }
    }
    const existingByNumber = this.orders.find(
      (o) => o.orderNumber === order.orderNumber || o.orderId === order.orderId
    );
    if (existingByNumber) {
      return existingByNumber;
    }

    this.orders.unshift(order);

    // 2. Decrement stock according to product inventory policy if not a draft order
    if (!order.isDraft) {
      order.items.forEach((item) => {
        const prod = this.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.salesCount = (prod.salesCount || 0) + item.quantity;
          const variant = prod.variants.find((v) => v.id === item.variantId) || prod.variants[0];
          const shouldTrackInventory = prod.trackQuantity !== false;
          if (variant && shouldTrackInventory) {
            const newStock = Math.max(0, variant.stockQuantity - item.quantity);
            const actualDelta = newStock - variant.stockQuantity;
            variant.stockQuantity = newStock;
            if (!variant.locationStock) variant.locationStock = {};
            const currentLocStock = variant.locationStock['loc_doha_pearl'] ?? newStock;
            variant.locationStock['loc_doha_pearl'] = Math.max(0, currentLocStock - item.quantity);

            this.stockHistory.unshift({
              id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              productId: prod.id,
              variantId: variant.id,
              productName: `${prod.name} (${variant.title})`,
              sku: variant.sku,
              locationId: 'loc_doha_pearl',
              locationName: 'Doha Pearl Flagship Fulfillment Hub',
              delta: actualDelta !== 0 ? actualDelta : -item.quantity,
              newAvailable: variant.stockQuantity,
              reason: 'order_fulfillment',
              adjustedBy: `Order ${order.orderNumber} (${order.customer.fullName})`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });

      // 3. Increment discount usage count if a discount code was redeemed
      if (order.discountCode) {
        const disc = this.discounts.find(
          (d) => d.code.toUpperCase() === order.discountCode?.trim().toUpperCase()
        );
        if (disc) {
          disc.usedCount = (disc.usedCount || 0) + 1;
        }
      }

      // 4. Deduct gift card balance if a gift card was applied
      const giftCardApplied = order.financials.giftCardAppliedMinorUnits || 0;
      if (order.giftCardCode && giftCardApplied > 0) {
        const gc = this.giftCards.find(
          (g) => g.code.toUpperCase() === order.giftCardCode?.trim().toUpperCase()
        );
        if (gc) {
          gc.balanceMinorUnits = Math.max(0, gc.balanceMinorUnits - giftCardApplied);
          gc.transactions.unshift({
            id: 'gctx_' + Date.now(),
            date: new Date().toISOString(),
            type: 'redemption',
            amountMinorUnits: -giftCardApplied,
            orderNumber: order.orderNumber,
            note: `Redeemed at checkout by ${order.customer.email}`,
          });
        }
      }
    }

    this.syncOrdersIntoCustomers();
    this.saveAll();
    return order;
  }

  public getOrders(): ImmutableOrderSnapshot[] {
    return [...this.orders];
  }

  public getOrderById(orderId: string): ImmutableOrderSnapshot | undefined {
    return this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
  }

  public updateOrder(orderId: string, updates: Partial<ImmutableOrderSnapshot>): ImmutableOrderSnapshot {
    const idx = this.orders.findIndex((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (idx === -1) throw new Error(`Order ${orderId} not found`);
    this.orders[idx] = { ...this.orders[idx], ...updates };
    this.saveAll();
    return { ...this.orders[idx] };
  }

  public convertDraftOrderToActive(orderId: string): ImmutableOrderSnapshot {
    const order = this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.isDraft = false;
    order.status = 'paid';
    order.payment.paymentStatus = 'captured';
    order.timeline.push({
      status: 'Draft Converted to Active Order & Payment Captured',
      timestamp: new Date().toISOString(),
      note: 'Invoice paid and inventory committed from Doha Pearl Hub.',
    });
    this.saveAll();
    return { ...order };
  }

  public refundOrder(orderId: string, refundMinorUnits: number, reason: string, restockItems = true): ImmutableOrderSnapshot {
    const order = this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const currentRefunded = order.refundedAmountMinorUnits || 0;
    const totalRefunded = Math.min(order.financials.totalAmountMinorUnits, currentRefunded + refundMinorUnits);
    order.refundedAmountMinorUnits = totalRefunded;

    const isFullRefund = totalRefunded >= order.financials.totalAmountMinorUnits;
    order.status = isFullRefund ? 'refunded' : order.status;
    order.payment.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    if (restockItems && isFullRefund) {
      order.items.forEach((item) => {
        const prod = this.products.find((p) => p.id === item.productId);
        const variant = prod?.variants.find((v) => v.id === item.variantId) || prod?.variants[0];
        if (prod && variant) {
          variant.stockQuantity += item.quantity;
          this.stockHistory.unshift({
            id: 'sh_' + Date.now(),
            productId: prod.id,
            variantId: variant.id,
            productName: prod.name,
            sku: variant.sku,
            locationId: 'loc_doha_pearl',
            locationName: 'Doha Pearl Flagship Fulfillment Hub',
            delta: item.quantity,
            newAvailable: variant.stockQuantity,
            reason: 'return_restock',
            adjustedBy: `Refund on ${order.orderNumber}`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    order.timeline.push({
      status: isFullRefund ? 'Full Refund Issued' : `Partial Refund (${(refundMinorUnits / 100).toFixed(2)} QAR) Issued`,
      timestamp: new Date().toISOString(),
      note: `Reason: ${reason}${restockItems && isFullRefund ? ' · Inventory restocked to Doha Hub.' : ''}`,
    });

    this.saveAll();
    return { ...order };
  }

  public addOrderTimelineNote(orderId: string, note: string, statusTitle = 'Staff Comment Added'): ImmutableOrderSnapshot {
    const order = this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.timeline.push({
      status: statusTitle,
      timestamp: new Date().toISOString(),
      note,
    });
    this.saveAll();
    return { ...order };
  }

  public updateOrderStatus(orderId: string, status: ImmutableOrderSnapshot['status'], note: string): ImmutableOrderSnapshot {
    const order = this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.status = status;
    order.timeline.push({
      status: `Status updated to: ${status.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      note,
    });
    this.saveAll();
    return { ...order };
  }

  public fulfillOrder(orderId: string, trackingNumber?: string, carrier = 'Doha City Express'): ImmutableOrderSnapshot {
    const order = this.orders.find((o) => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.status = 'shipped';
    if (trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
    }
    order.shipping.carrier = carrier;
    order.timeline.push({
      status: 'Fulfilled & Handed to Courier',
      timestamp: new Date().toISOString(),
      note: `Package dispatched from Doha Fulfillment Hub via ${carrier}. Tracking: ${order.shipping.trackingNumber || 'DHA-EXP-PRIORITY'}`,
    });
    this.saveAll();
    return { ...order };
  }

  // --- Customers ---
  public getCustomers(): CustomerRecord[] {
    return [...this.customers];
  }

  public saveCustomer(customer: CustomerRecord): CustomerRecord {
    const idx = this.customers.findIndex((c) => c.id === customer.id || c.email.toLowerCase() === customer.email.toLowerCase());
    if (idx >= 0) {
      this.customers[idx] = customer;
    } else {
      this.customers.unshift(customer);
    }
    this.saveAll();
    return customer;
  }

  public deleteCustomer(id: string): boolean {
    const len = this.customers.length;
    this.customers = this.customers.filter((c) => c.id !== id);
    this.saveAll();
    return this.customers.length !== len;
  }

  public mergeCustomers(primaryId: string, duplicateId: string): CustomerRecord | undefined {
    const primary = this.customers.find((c) => c.id === primaryId);
    const duplicate = this.customers.find((c) => c.id === duplicateId);
    if (!primary || !duplicate) return undefined;

    // Combine tags and addresses
    const mergedTags = Array.from(new Set([...primary.tags, ...duplicate.tags])).filter(
      (t) => t !== 'Duplicate-Candidate'
    );
    const mergedAddresses = [
      ...primary.addresses,
      ...duplicate.addresses.map((a) => ({ ...a, isDefault: false })),
    ];
    primary.tags = mergedTags;
    primary.addresses = mergedAddresses;
    primary.notes = [primary.notes, `Merged profile ${duplicate.email} on ${new Date().toISOString().split('T')[0]}.`]
      .filter(Boolean)
      .join(' | ');

    // Reassign any orders from duplicate email to primary email
    this.orders.forEach((o) => {
      if (o.customer.email.toLowerCase() === duplicate.email.toLowerCase()) {
        o.customer.email = primary.email;
        o.customer.fullName = primary.fullName;
      }
    });

    this.customers = this.customers.filter((c) => c.id !== duplicateId);
    this.saveAll();
    return primary;
  }

  // --- Inventory & Locations ---
  public getLocations(): InventoryLocation[] {
    return [...this.locations];
  }

  public saveLocation(loc: InventoryLocation): InventoryLocation {
    const idx = this.locations.findIndex((l) => l.id === loc.id);
    if (idx >= 0) {
      this.locations[idx] = loc;
    } else {
      this.locations.push(loc);
    }
    this.saveAll();
    return loc;
  }

  public adjustVariantStock(
    productId: string,
    variantId: string,
    locationId: string,
    delta: number,
    reason: StockHistoryEntry['reason'],
    adjustedBy = 'Admin (Qatar Ops)'
  ) {
    const prod = this.products.find((p) => p.id === productId);
    if (!prod) return;
    const variant = prod.variants.find((v) => v.id === variantId) || prod.variants[0];
    if (!variant) return;

    const newStock = Math.max(0, variant.stockQuantity + delta);
    variant.stockQuantity = newStock;
    if (!variant.locationStock) variant.locationStock = {};
    const currentLocStock = variant.locationStock[locationId] ?? newStock;
    variant.locationStock[locationId] = Math.max(0, currentLocStock + delta);

    const loc = this.locations.find((l) => l.id === locationId) || this.locations[0];
    this.stockHistory.unshift({
      id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: prod.id,
      variantId: variant.id,
      productName: `${prod.name} (${variant.title})`,
      sku: variant.sku,
      locationId: loc.id,
      locationName: loc.name,
      delta,
      newAvailable: newStock,
      reason,
      adjustedBy,
      timestamp: new Date().toISOString(),
    });

    this.saveAll();
  }

  public bulkUpdateVariantInventory(
    updates: BulkInventoryUpdateItem[],
    adjustedBy = 'Admin Bulk Inventory Update'
  ): { updatedVariantsCount: number; netDelta: number } {
    let updatedVariantsCount = 0;
    let netDelta = 0;

    updates.forEach((u) => {
      const prod = this.products.find((p) => p.id === u.productId);
      if (!prod) return;
      const variant = prod.variants.find((v) => v.id === u.variantId) || prod.variants[0];
      if (!variant) return;

      const clampedNewStock = Math.max(0, Math.round(u.newStock));
      const actualDelta = clampedNewStock - variant.stockQuantity;
      variant.stockQuantity = clampedNewStock;

      if (!variant.locationStock) variant.locationStock = {};
      const targetLocId = u.locationId && u.locationId !== 'all' ? u.locationId : (this.locations[0]?.id || 'loc_doha_pearl');
      variant.locationStock[targetLocId] = clampedNewStock;

      const loc = this.locations.find((l) => l.id === targetLocId) || this.locations[0] || {
        id: 'loc_doha_pearl',
        name: 'Doha Pearl Flagship Fulfillment Hub',
      };

      this.stockHistory.unshift({
        id: `sh_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: prod.id,
        variantId: variant.id,
        productName: `${prod.name} (${variant.title})`,
        sku: variant.sku,
        locationId: loc.id,
        locationName: loc.name,
        delta: actualDelta,
        newAvailable: clampedNewStock,
        reason: u.reason || 'correction',
        adjustedBy,
        timestamp: new Date().toISOString(),
      });

      updatedVariantsCount++;
      netDelta += actualDelta;
    });

    this.saveAll();
    return { updatedVariantsCount, netDelta };
  }

  public getStockHistory(): StockHistoryEntry[] {
    return [...this.stockHistory];
  }

  public getTransfers(): InventoryTransfer[] {
    return [...this.transfers];
  }

  public saveTransfer(transfer: InventoryTransfer): InventoryTransfer {
    const idx = this.transfers.findIndex((t) => t.id === transfer.id);
    if (idx >= 0) {
      this.transfers[idx] = transfer;
    } else {
      this.transfers.unshift(transfer);
    }
    this.saveAll();
    return transfer;
  }

  public receiveTransfer(transferId: string): InventoryTransfer | undefined {
    const transfer = this.transfers.find((t) => t.id === transferId);
    if (!transfer || transfer.status === 'received') return transfer;
    transfer.status = 'received';

    transfer.items.forEach((item) => {
      this.adjustVariantStock(
        item.productId,
        item.variantId,
        transfer.destinationLocationId,
        item.quantity,
        'transfer',
        `Transfer ${transfer.referenceNumber} Received`
      );
    });

    this.saveAll();
    return transfer;
  }

  // --- Collections ---
  public getCollections(): ProductCollection[] {
    return [...this.collections];
  }

  public saveCollection(collection: ProductCollection): ProductCollection {
    const idx = this.collections.findIndex((c) => c.id === collection.id);
    if (idx >= 0) {
      this.collections[idx] = collection;
    } else {
      this.collections.unshift(collection);
    }
    this.saveAll();
    return collection;
  }

  public deleteCollection(id: string): boolean {
    const len = this.collections.length;
    this.collections = this.collections.filter((c) => c.id !== id);
    this.saveAll();
    return this.collections.length !== len;
  }

  // --- Discounts ---
  public getDiscounts(): DiscountRule[] {
    return [...this.discounts];
  }

  public saveDiscount(discount: DiscountRule): DiscountRule {
    const idx = this.discounts.findIndex((d) => d.id === discount.id);
    if (idx >= 0) {
      this.discounts[idx] = discount;
    } else {
      this.discounts.unshift(discount);
    }
    this.saveAll();
    return discount;
  }

  public deleteDiscount(id: string): boolean {
    const len = this.discounts.length;
    this.discounts = this.discounts.filter((d) => d.id !== id);
    this.saveAll();
    return this.discounts.length !== len;
  }

  // --- Marketing Campaigns ---
  public getCampaigns(): MarketingCampaign[] {
    return [...this.campaigns];
  }

  public saveCampaign(campaign: MarketingCampaign): MarketingCampaign {
    const idx = this.campaigns.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      this.campaigns[idx] = campaign;
    } else {
      this.campaigns.unshift(campaign);
    }
    this.saveAll();
    return campaign;
  }

  public deleteCampaign(id: string): boolean {
    const len = this.campaigns.length;
    this.campaigns = this.campaigns.filter((c) => c.id !== id);
    this.saveAll();
    return this.campaigns.length !== len;
  }

  // --- Gift Cards ---
  public getGiftCards(): GiftCard[] {
    return [...this.giftCards];
  }

  public saveGiftCard(giftCard: GiftCard): GiftCard {
    const idx = this.giftCards.findIndex((g) => g.id === giftCard.id);
    if (idx >= 0) {
      this.giftCards[idx] = giftCard;
    } else {
      this.giftCards.unshift(giftCard);
    }
    this.saveAll();
    return giftCard;
  }

  // --- Content: Pages, Blogs, Menus, Media ---
  public getBlogPosts(): BlogPost[] {
    return [...this.blogPosts];
  }

  public saveBlogPost(post: BlogPost): BlogPost {
    const idx = this.blogPosts.findIndex((b) => b.id === post.id);
    if (idx >= 0) {
      this.blogPosts[idx] = post;
    } else {
      this.blogPosts.unshift(post);
    }
    this.saveAll();
    return post;
  }

  public deleteBlogPost(id: string): boolean {
    const len = this.blogPosts.length;
    this.blogPosts = this.blogPosts.filter((b) => b.id !== id);
    this.saveAll();
    return this.blogPosts.length !== len;
  }

  public getPages(): StorePage[] {
    return [...this.pages];
  }

  public savePage(page: StorePage): StorePage {
    const idx = this.pages.findIndex((p) => p.id === page.id);
    if (idx >= 0) {
      this.pages[idx] = page;
    } else {
      this.pages.unshift(page);
    }
    this.saveAll();
    return page;
  }

  public deletePage(id: string): boolean {
    const len = this.pages.length;
    this.pages = this.pages.filter((p) => p.id !== id);
    this.saveAll();
    return this.pages.length !== len;
  }

  public getMenus(): NavigationMenu[] {
    return [...this.menus];
  }

  public saveMenu(menu: NavigationMenu): NavigationMenu {
    const idx = this.menus.findIndex((m) => m.id === menu.id);
    if (idx >= 0) {
      this.menus[idx] = menu;
    } else {
      this.menus.push(menu);
    }
    this.saveAll();
    return menu;
  }

  public getMediaAssets(): MediaAsset[] {
    return [...this.mediaAssets];
  }

  public saveMediaAsset(asset: MediaAsset): MediaAsset {
    const idx = this.mediaAssets.findIndex((m) => m.id === asset.id);
    if (idx >= 0) {
      this.mediaAssets[idx] = asset;
    } else {
      this.mediaAssets.unshift(asset);
    }
    this.saveAll();
    return asset;
  }

  public deleteMediaAsset(id: string): boolean {
    const len = this.mediaAssets.length;
    this.mediaAssets = this.mediaAssets.filter((m) => m.id !== id);
    this.saveAll();
    return this.mediaAssets.length !== len;
  }

  // --- Staff & RBAC & Notifications ---
  public getStaffAccounts(): StaffAccount[] {
    return [...this.staffAccounts];
  }

  public saveStaffAccount(staff: StaffAccount): StaffAccount {
    const idx = this.staffAccounts.findIndex((s) => s.id === staff.id);
    if (idx >= 0) {
      this.staffAccounts[idx] = staff;
    } else {
      this.staffAccounts.push(staff);
    }
    this.saveAll();
    return staff;
  }

  public getNotifications(): AdminNotification[] {
    return [...this.notifications];
  }

  public markNotificationRead(id: string) {
    const n = this.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.saveAll();
    }
  }

  public markAllNotificationsRead() {
    this.notifications.forEach((n) => {
      n.read = true;
    });
    this.saveAll();
  }

  public getCurrentUserRole(): UserRole {
    return this.currentUserRole;
  }

  public setCurrentUserRole(role: UserRole) {
    this.currentUserRole = role;
    this.saveAll();
  }

  // --- Persistent Shopping Cart State ---
  public getPersistedCart(countryCode: string, currency: Currency): {
    items: CartItem[];
    discountCode: string;
    giftCardCode: string;
    orderNotes: string;
    shippingMethodId: string;
  } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CART);
      if (!raw) {
        return {
          items: [],
          discountCode: '',
          giftCardCode: '',
          orderNotes: '',
          shippingMethodId: 'doha_same_day',
        };
      }
      const parsed: PersistedCartState = JSON.parse(raw);
      const hydratedItems: CartItem[] = [];
      (parsed.items || []).forEach((savedItem) => {
        const prod = this.products.find((p) => p.id === savedItem.productId);
        if (!prod || prod.status !== 'published') return;
        const variant =
          prod.variants.find((v) => v.id === savedItem.variantId) || prod.variants[0];
        if (!variant) return;
        const qty = Math.max(1, Number(savedItem.quantity) || 1);
        const unitPriceMinorUnits = resolveProductPrice(
          prod,
          countryCode,
          currency,
          1.0,
          variant
        );
        hydratedItems.push({
          id: savedItem.id || `cart_${prod.id}_${variant.id}`,
          productId: prod.id,
          variantId: variant.id,
          product: prod,
          variant,
          quantity: qty,
          unitPriceMinorUnits,
          totalPriceMinorUnits: qty * unitPriceMinorUnits,
        });
      });

      return {
        items: hydratedItems,
        discountCode: parsed.discountCode || '',
        giftCardCode: parsed.giftCardCode || '',
        orderNotes: parsed.orderNotes || '',
        shippingMethodId: parsed.shippingMethodId || 'doha_same_day',
      };
    } catch {
      return {
        items: [],
        discountCode: '',
        giftCardCode: '',
        orderNotes: '',
        shippingMethodId: 'doha_same_day',
      };
    }
  }

  public savePersistedCart(state: {
    items: CartItem[];
    discountCode?: string;
    giftCardCode?: string;
    orderNotes?: string;
    shippingMethodId?: string;
  }) {
    try {
      const payload: PersistedCartState = {
        items: state.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        discountCode: state.discountCode || '',
        giftCardCode: state.giftCardCode || '',
        orderNotes: state.orderNotes || '',
        shippingMethodId: state.shippingMethodId || 'doha_same_day',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  public clearPersistedCart() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CART);
    } catch {
      // ignore
    }
  }
}

export const storeDb = new StoreDatabase();

