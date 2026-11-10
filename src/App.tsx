import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Flame,
  Award,
} from 'lucide-react';
import {
  Country,
  Currency,
  Product,
  CartItem,
  ProductVariant,
  ImmutableOrderSnapshot,
  StoreSettings,
  UserRole,
} from './types/ecommerce';
import { storeDb } from './services/store-db';
import { resolveProductPrice } from './utils/commerce-engine';
import { Header } from './components/common/Header';
import { HeroBanner } from './components/storefront/HeroBanner';
import { ProductCard } from './components/storefront/ProductCard';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { ShopAllProductsPage } from './components/storefront/ShopAllProductsPage';
import { CartDrawer } from './components/cart/CartDrawer';
import { ShoppingCartPage } from './components/cart/ShoppingCartPage';
import { ShopifyCheckoutPage } from './components/checkout/ShopifyCheckoutPage';
import { OrderConfirmationPage } from './components/checkout/OrderConfirmationPage';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { OrderConfirmationModal } from './components/checkout/OrderConfirmationModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import {
  adminAuthClient,
  AuthenticatedAdminProfile,
} from './services/admin-auth-client';
import { CustomerDashboardModal } from './components/account/CustomerDashboardModal';
import { BlogModal } from './components/cms/BlogModal';
import { Footer } from './components/common/Footer';

export default function App() {
  // Database States
  const [settings, setSettings] = useState<StoreSettings>(storeDb.getSettings());
  const [countries, setCountries] = useState<Country[]>(storeDb.getCountries());
  const [currencies, setCurrencies] = useState<Currency[]>(storeDb.getCurrencies());
  const [products, setProducts] = useState<Product[]>(storeDb.getProducts());
  const [orders, setOrders] = useState<ImmutableOrderSnapshot[]>(storeDb.getOrders());
  const [verifications, setVerifications] = useState(storeDb.getAgeVerifications());
  const [blogPosts, setBlogPosts] = useState(storeDb.getBlogPosts());
  const [userRole, setUserRole] = useState<UserRole>(storeDb.getCurrentUserRole());

  // Navigation States (Defaulting to Qatar QA / QAR)
  const [currentCountry, setCurrentCountry] = useState<Country>(
    countries.find((c) => c.code === 'QA') || countries[0]
  );
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(
    currencies.find((c) => c.code === 'QAR') || currencies[0]
  );

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');

  // Persistent Cart State (hydrated from localStorage on initial load)
  const initialPersistedCart = storeDb.getPersistedCart(
    (countries.find((c) => c.code === 'QA') || countries[0]).code,
    currencies.find((c) => c.code === 'QAR') || currencies[0]
  );
  const [cartItems, setCartItems] = useState<CartItem[]>(initialPersistedCart.items);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string>(
    initialPersistedCart.discountCode
  );
  const [appliedGiftCardCode, setAppliedGiftCardCode] = useState<string>(
    initialPersistedCart.giftCardCode
  );
  const [cartOrderNotes, setCartOrderNotes] = useState<string>(
    initialPersistedCart.orderNotes
  );
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string>(
    initialPersistedCart.shippingMethodId || 'doha_same_day'
  );
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals & Protected Admin Route State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ImmutableOrderSnapshot | null>(
    () => storeDb.getOrders()[0] || null
  );
  const [receiptModalOrder, setReceiptModalOrder] = useState<ImmutableOrderSnapshot | null>(null);
  const [adminView, setAdminView] = useState<'closed' | 'login' | 'dashboard'>('closed');
  const [storefrontView, setStorefrontView] = useState<
    'home' | 'shop' | 'cart' | 'checkout' | 'order_confirmation'
  >(() => {
    if (typeof window === 'undefined') return 'home';
    const p = window.location.pathname;
    if (p === '/shop') return 'shop';
    if (p === '/cart') return 'cart';
    if (p === '/checkout') return 'checkout';
    if (p === '/order-confirmation') return 'order_confirmation';
    return 'home';
  });
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AuthenticatedAdminProfile | null>(null);
  const [adminAuthNotice, setAdminAuthNotice] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);

  // Apply dynamic CSS branding on load and updates
  useEffect(() => {
    storeDb.applyBrandStyling();
  }, [settings]);

  // Persist cart state across page refreshes whenever cart or codes change
  useEffect(() => {
    storeDb.savePersistedCart({
      items: cartItems,
      discountCode: appliedDiscountCode,
      giftCardCode: appliedGiftCardCode,
      orderNotes: cartOrderNotes,
      shippingMethodId: selectedShippingMethodId,
    });
  }, [
    cartItems,
    appliedDiscountCode,
    appliedGiftCardCode,
    cartOrderNotes,
    selectedShippingMethodId,
  ]);

  // Recalculate cart item prices if country or currency changes
  useEffect(() => {
    setCartItems((prev) =>
      prev.map((item) => {
        const unitPriceMinorUnits = resolveProductPrice(
          item.product,
          currentCountry.code,
          currentCurrency,
          1.0,
          item.variant
        );
        return {
          ...item,
          unitPriceMinorUnits,
          totalPriceMinorUnits: item.quantity * unitPriceMinorUnits,
        };
      })
    );
  }, [currentCountry.code, currentCurrency]);

  // Route guard for /admin and /admin/login + storefront routes (/shop, /cart, /checkout, /order-confirmation)
  useEffect(() => {
    const evaluateAdminRoute = async () => {
      const path = window.location.pathname;
      if (path === '/admin/login') {
        const session = await adminAuthClient.verifySession();
        if (session.authenticated && session.admin) {
          setAuthenticatedAdmin(session.admin);
          window.history.replaceState({}, '', '/admin');
          setAdminView('dashboard');
        } else {
          setAuthenticatedAdmin(null);
          setAdminView('login');
        }
      } else if (path === '/admin' || path.startsWith('/admin/')) {
        const session = await adminAuthClient.verifySession();
        if (session.authenticated && session.admin) {
          setAuthenticatedAdmin(session.admin);
          setAdminAuthNotice(null);
          setAdminView('dashboard');
        } else {
          setAuthenticatedAdmin(null);
          setAdminAuthNotice('Unauthorized access: Please sign in with valid administrator credentials.');
          window.history.replaceState({}, '', '/admin/login');
          setAdminView('login');
        }
      } else if (path === '/shop') {
        setAdminView('closed');
        setStorefrontView('shop');
      } else if (path === '/cart') {
        setAdminView('closed');
        setStorefrontView('cart');
      } else if (path === '/checkout') {
        setAdminView('closed');
        setStorefrontView('checkout');
      } else if (path === '/order-confirmation') {
        setAdminView('closed');
        setStorefrontView('order_confirmation');
      } else {
        setAdminView('closed');
        setStorefrontView('home');
      }
    };

    void evaluateAdminRoute();

    const onPopState = () => {
      void evaluateAdminRoute();
    };
    window.addEventListener('popstate', onPopState);

    const unsubscribeUnauth = adminAuthClient.onUnauthorized(() => {
      setAuthenticatedAdmin(null);
      setAdminAuthNotice('Your administrator session expired or is unauthorized. Please sign in again.');
      window.history.replaceState({}, '', '/admin/login');
      setAdminView('login');
    });

    return () => {
      window.removeEventListener('popstate', onPopState);
      unsubscribeUnauth();
    };
  }, []);

  const handleOpenAdminGateway = async () => {
    const session = await adminAuthClient.verifySession();
    if (session.authenticated && session.admin) {
      setAuthenticatedAdmin(session.admin);
      setAdminAuthNotice(null);
      window.history.pushState({}, '', '/admin');
      setAdminView('dashboard');
    } else {
      setAuthenticatedAdmin(null);
      setAdminAuthNotice(null);
      window.history.pushState({}, '', '/admin/login');
      setAdminView('login');
    }
  };

  const handleAdminLogout = async () => {
    await adminAuthClient.logout();
    setAuthenticatedAdmin(null);
    setAdminAuthNotice('You have been securely signed out of the Admin Console.');
    window.history.pushState({}, '', '/admin/login');
    setAdminView('login');
  };

  const handleCloseAdminToStorefront = () => {
    window.history.pushState({}, '', '/');
    setAdminView('closed');
    setStorefrontView('home');
  };

  const handleOpenShopPage = (categoryId?: string) => {
    if (categoryId) {
      setSelectedCategory(categoryId);
    }
    window.history.pushState({}, '', '/shop');
    setStorefrontView('shop');
    window.scrollTo(0, 0);
  };

  const handleOpenHomePage = () => {
    window.history.pushState({}, '', '/');
    setStorefrontView('home');
    window.scrollTo(0, 0);
  };

  const handleOpenCartPage = () => {
    setIsCartOpen(false);
    window.history.pushState({}, '', '/cart');
    setStorefrontView('cart');
    window.scrollTo(0, 0);
  };

  const handleOpenCheckoutPage = () => {
    setIsCartOpen(false);
    window.history.pushState({}, '', '/checkout');
    setStorefrontView('checkout');
    window.scrollTo(0, 0);
  };

  const refreshAllData = () => {
    setSettings(storeDb.getSettings());
    const refreshedCountries = storeDb.getCountries();
    setCountries(refreshedCountries);
    setCurrencies(storeDb.getCurrencies());
    setProducts(storeDb.getProducts());
    setOrders(storeDb.getOrders());
    setVerifications(storeDb.getAgeVerifications());
    setBlogPosts(storeDb.getBlogPosts());
    setUserRole(storeDb.getCurrentUserRole());

    const updatedCurrent = refreshedCountries.find((c) => c.code === currentCountry.code);
    if (updatedCurrent) {
      setCurrentCountry(updatedCurrent);
    }
  };

  // Country Selection Handler
  const handleSelectCountry = (country: Country) => {
    setCurrentCountry(country);
    const matchingCurrency = currencies.find((c) => c.code === country.defaultCurrencyCode);
    if (matchingCurrency) {
      setCurrentCurrency(matchingCurrency);
    }
  };

  // Cart Handlers (Variant-Aware & Instant Updates without Page Reload)
  const handleAddToCart = (
    product: Product,
    variant?: ProductVariant,
    quantity = 1,
    openDrawer = true
  ) => {
    const selectedVar = variant || product.variants[0];
    const unitPriceMinorUnits = resolveProductPrice(
      product,
      currentCountry.code,
      currentCurrency,
      1.0,
      selectedVar
    );

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === selectedVar.id
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          unitPriceMinorUnits,
          quantity: newQty,
          totalPriceMinorUnits: newQty * unitPriceMinorUnits,
        };
        return updated;
      }

      const newItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        variantId: selectedVar.id,
        product,
        variant: selectedVar,
        quantity,
        unitPriceMinorUnits,
        totalPriceMinorUnits: quantity * unitPriceMinorUnits,
      };
      return [...prev, newItem];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity: newQty,
              totalPriceMinorUnits: newQty * item.unitPriceMinorUnits,
            }
          : item
      )
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setAppliedDiscountCode('');
    setAppliedGiftCardCode('');
    setCartOrderNotes('');
    storeDb.clearPersistedCart();
  };

  const cartSubtotalMinorUnits = cartItems.reduce(
    (acc, item) => acc + item.totalPriceMinorUnits,
    0
  );

  // Filter and sort products
  let filteredProducts = products.filter((p) => {
    if (p.status !== 'published') return false;
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.seoKeywords.some((k) => k.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  if (sortBy === 'price_asc') {
    filteredProducts.sort((a, b) => {
      const pa = resolveProductPrice(a, currentCountry.code, currentCurrency);
      const pb = resolveProductPrice(b, currentCountry.code, currentCurrency);
      return pa - pb;
    });
  } else if (sortBy === 'price_desc') {
    filteredProducts.sort((a, b) => {
      const pa = resolveProductPrice(a, currentCountry.code, currentCurrency);
      const pb = resolveProductPrice(b, currentCountry.code, currentCurrency);
      return pb - pa;
    });
  }

  const allCategories = storeDb.getCategories();
  const allBrands = storeDb.getBrands();
  const allCollections = storeDb.getCollections();
  const allDiscounts = storeDb.getDiscounts();
  const allGiftCards = storeDb.getGiftCards();
  const allCustomers = storeDb.getCustomers();
  const publishedCatalogCount = products.filter((p) => p.status === 'published').length;
  const homepageProductLimit = Math.max(1, Number(settings.homepageProductLimit) || 4);
  const homepageDisplayedProducts = filteredProducts.slice(0, homepageProductLimit);

  // If user is on the Secure Admin Login Page (/admin/login), render it exclusively
  if (adminView === 'login') {
    return (
      <AdminLoginPage
        settings={settings}
        unauthorizedReason={adminAuthNotice}
        onLoginSuccess={(admin) => {
          setAuthenticatedAdmin(admin);
          setAdminAuthNotice(null);
          window.history.pushState({}, '', '/admin');
          setAdminView('dashboard');
        }}
        onBackToStorefront={handleCloseAdminToStorefront}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* 1. International Header */}
      <Header
        settings={settings}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        countries={countries}
        currencies={currencies}
        onSelectCountry={handleSelectCountry}
        onSelectCurrency={setCurrentCurrency}
        cartItemCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        cartSubtotalMinorUnits={cartSubtotalMinorUnits}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => void handleOpenAdminGateway()}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenBlog={() => setIsBlogOpen(true)}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onSelectCategory={setSelectedCategory}
        storefrontView={storefrontView}
        onOpenShop={() => handleOpenShopPage()}
        onOpenHome={handleOpenHomePage}
      />

      {/* 2. Main Storefront Body: Shop (/shop), Cart (/cart), Checkout (/checkout), Order Confirmation (/order-confirmation), or Homepage (/) */}
      {storefrontView === 'shop' ? (
        <main className="grow">
          <ShopAllProductsPage
            products={products}
            categories={allCategories}
            collections={allCollections}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            defaultProductsPerPage={settings.shopProductsPerPage || 8}
            initialCategory={selectedCategory}
            initialSearchQuery={searchQuery}
            onBackToHome={handleOpenHomePage}
            onViewProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p, variant, qty) => handleAddToCart(p, variant, qty)}
          />
        </main>
      ) : storefrontView === 'cart' ? (
        <main className="grow">
          <ShoppingCartPage
            items={cartItems}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            settings={settings}
            discounts={allDiscounts}
            appliedDiscountCode={appliedDiscountCode}
            onApplyDiscountCode={setAppliedDiscountCode}
            orderNotes={cartOrderNotes}
            onChangeOrderNotes={setCartOrderNotes}
            selectedShippingMethodId={selectedShippingMethodId}
            onSelectShippingMethod={setSelectedShippingMethodId}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onContinueShopping={() => handleOpenShopPage()}
            onProceedToCheckout={handleOpenCheckoutPage}
            onViewProduct={(p) => setSelectedProduct(p)}
          />
        </main>
      ) : storefrontView === 'checkout' ? (
        <main className="grow">
          <ShopifyCheckoutPage
            cartItems={cartItems}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            settings={settings}
            discounts={allDiscounts}
            giftCards={allGiftCards}
            customers={allCustomers}
            appliedDiscountCode={appliedDiscountCode}
            onApplyDiscountCode={setAppliedDiscountCode}
            appliedGiftCardCode={appliedGiftCardCode}
            onApplyGiftCardCode={setAppliedGiftCardCode}
            selectedShippingMethodId={selectedShippingMethodId}
            onSelectShippingMethod={setSelectedShippingMethodId}
            orderNotes={cartOrderNotes}
            onChangeOrderNotes={setCartOrderNotes}
            onBackToCart={handleOpenCartPage}
            onBackToStorefront={handleOpenHomePage}
            onOrderCompleted={(order) => {
              setCompletedOrder(order);
              handleClearCart();
              refreshAllData();
              window.history.pushState({}, '', '/order-confirmation');
              setStorefrontView('order_confirmation');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </main>
      ) : storefrontView === 'order_confirmation' ? (
        <main className="grow">
          <OrderConfirmationPage
            order={completedOrder}
            allOrders={orders}
            currentCurrency={currentCurrency}
            onContinueShopping={handleOpenHomePage}
            onViewOrderReceipt={(ord) => setReceiptModalOrder(ord)}
            onOpenCustomerAccount={() => setIsAccountOpen(true)}
          />
        </main>
      ) : (
        <main className="grow">
          <HeroBanner
            settings={settings}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            onExploreCatalog={() => {
              const el = document.getElementById('catalogue');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenCompliance={() => setIsBlogOpen(true)}
          />

          {/* 3. Catalog Section with Interactive Filters */}
          <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Category Navigation Tabs (Interactive Segmented Control) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
                  Catalogue Architecture
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-display text-neutral-900 mt-1">
                  Precision Hardware &amp; Extracts
                </h2>
              </div>

              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All Platforms ({publishedCatalogCount})
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Filter & Sort Bar */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600">
              <div className="flex flex-wrap items-center gap-3">
                <span data-testid="homepage-showing-count" className="font-semibold text-neutral-800">
                  Showing {homepageDisplayedProducts.length} of {filteredProducts.length} active products
                </span>
                {searchQuery && (
                  <span className="text-neutral-500">
                    for query &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </span>
                )}
                <button
                  type="button"
                  data-testid="homepage-view-all-top-btn"
                  onClick={() => handleOpenShopPage()}
                  className="text-xs font-bold text-[#8a1538] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Products ({publishedCatalogCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Brand Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">Brand:</span>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:outline-hidden"
                  >
                    <option value="all">All Brands</option>
                    {allBrands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Sort */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:outline-hidden"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Product Cards Grid (Limited by Admin Homepage Product Display Setting) */}
            {homepageDisplayedProducts.length === 0 ? (
              <div className="py-20 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 mt-4 space-y-3">
                <Search className="w-10 h-10 text-neutral-300 mx-auto" />
                <p className="text-sm font-medium">No products match your criteria.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedBrand('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  data-testid="homepage-products-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4"
                >
                  {homepageDisplayedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currentCountry={currentCountry}
                      currentCurrency={currentCurrency}
                      onViewProduct={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, variant, qty) => handleAddToCart(p, variant, qty)}
                    />
                  ))}
                </div>

                {/* Prominent View All Products CTA Banner below Homepage Grid */}
                <div className="mt-10 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-2xs">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      Explore the Complete {settings.storeName} Catalogue
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Showing {homepageDisplayedProducts.length} featured items on the homepage. Browse all {publishedCatalogCount} active products with advanced filters for category, collection, price range, availability, size, and color.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="homepage-view-all-products-btn"
                    onClick={() => handleOpenShopPage()}
                    className="px-6 py-3.5 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
                  >
                    <span>View All Products ({publishedCatalogCount})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </section>

          {/* 5. Craftsmanship & Quality Standards Section */}
          <section className="bg-neutral-900 text-white py-16 border-t border-b border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Aerospace CNC Tolerances
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Every titanium and aluminum chassis is milled to microscopic +/- 0.02mm tolerances. Solid gold-plated copper connection pins ensure maximum conductivity and zero voltage sag.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Sovereign Legal Compliance
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Destination-specific rules automatically govern purchases. Minimum age thresholds (18+ in UK/EU, 21+ in USA/UAE) and TPD/FDA/ESMA declarations are enforced before any checkout proceeds.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Cold-Macerated Botanicals
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Naturally extracted oakwood, bergamot and heritage leaf profiles aged 90 days. Zero artificial sweeteners, zero diacetyl, bottled in UV-blocking pharmaceutical amber glass.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Spotlight Showcase: Botanical Cold Extraction */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 aspect-4/3 lg:aspect-auto lg:h-full">
                <img
                  src="/src/assets/images/product_craft_eliquid_1794234137051.jpg"
                  alt="Botanica Reserve Hand-Crafted Amber Bottle"
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="lg:col-span-7 p-8 sm:p-12 space-y-5">
                <div className="text-xs font-semibold text-amber-800 uppercase tracking-widest">
                  Artisanal Formulary · Somerset, England
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold font-display text-neutral-900 leading-tight">
                  Botanica Reserve No. 12: Charred Oak &amp; Bergamot
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
                  Aged in virgin charred white oak barrels with cold-distilled Calabrian bergamot zest. Verified 100% compliant with UK MHRA and EU TPD standards. Available in 0mg aroma, 3mg and 6mg pharmaceutical strengths.
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <button
                    onClick={() => {
                      const prod = products.find((p) => p.id === 'prod_botanica_oakwood_eliquid');
                      if (prod) setSelectedProduct(prod);
                    }}
                    className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Explore Reserve No. 12</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 7. Compliant Footer */}
      <Footer
        settings={settings}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        onOpenBlog={() => setIsBlogOpen(true)}
        onOpenAdmin={() => void handleOpenAdminGateway()}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, variant, qty) => {
          handleAddToCart(prod, variant, qty);
          setSelectedProduct(null);
        }}
        onBuyNow={(prod, variant, qty) => {
          handleAddToCart(prod, variant, qty, false);
          setSelectedProduct(null);
          handleOpenCheckoutPage();
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        settings={settings}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onViewFullCart={handleOpenCartPage}
        onCheckout={handleOpenCheckoutPage}
      />

      {/* Legacy 7-Step Compliance Checkout Modal (if triggered directly) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        settings={settings}
        onOrderCompleted={(order) => {
          setIsCheckoutOpen(false);
          handleClearCart();
          setCompletedOrder(order);
          refreshAllData();
          window.history.pushState({}, '', '/order-confirmation');
          setStorefrontView('order_confirmation');
        }}
      />

      {/* Receipt Inspection Modal */}
      <OrderConfirmationModal
        order={receiptModalOrder}
        onClose={() => setReceiptModalOrder(null)}
      />

      {/* Protected Admin Operations Console */}
      <AdminDashboard
        isOpen={adminView === 'dashboard' && Boolean(authenticatedAdmin)}
        authenticatedAdmin={authenticatedAdmin}
        onClose={handleCloseAdminToStorefront}
        onLogout={() => void handleAdminLogout()}
        settings={settings}
        countries={countries}
        currencies={currencies}
        products={products}
        orders={orders}
        verifications={verifications}
        onRefreshData={refreshAllData}
      />

      {/* Customer Account & Verification Vault */}
      <CustomerDashboardModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        orders={orders}
        settings={settings}
        currentRole={userRole}
        onRoleChanged={(r) => setUserRole(r)}
        onViewOrder={(order) => {
          setIsAccountOpen(false);
          setCompletedOrder(order);
          window.history.pushState({}, '', '/order-confirmation');
          setStorefrontView('order_confirmation');
        }}
      />

      {/* Blog & Regulatory Editorial Modal */}
      <BlogModal
        isOpen={isBlogOpen}
        onClose={() => setIsBlogOpen(false)}
        posts={blogPosts}
      />
    </div>
  );
}
