import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowRight,
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
import { analyticsTracker } from './services/analytics-tracker';
import { resolveProductPrice } from './utils/commerce-engine';
import { Header } from './components/common/Header';
import { HeroBanner } from './components/storefront/HeroBanner';
import { ProductCard } from './components/storefront/ProductCard';
import { motion } from 'motion/react';
import {
  EditorialCategoryShowcase,
  MavenoTrustIconStrip,
  MavenoCustomerReviews,
  MavenoBundleBuilder,
  MavenoHonestAnswersBlog,
  MavenoIndulgeDarkBanner,
  MavenoTrustedPartners,
  MavenoBrandStory,
  MavenoFaqSection,
  staggerContainerVariants,
  staggerItemVariants,
  staggerCardVariants,
} from './components/storefront/MavenoEditorialSections';
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

  // Real-time storefront analytics tracking for active visitor sessions, cart state & checkout
  useEffect(() => {
    const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalValueMinor = cartItems.reduce((acc, item) => acc + item.totalPriceMinorUnits, 0);
    const pagePath =
      storefrontView === 'home'
        ? '/'
        : storefrontView === 'order_confirmation'
        ? '/order-confirmation'
        : `/${storefrontView}`;

    analyticsTracker.trackEvent({
      type: storefrontView === 'checkout' ? 'checkout_started' : 'page_view',
      countryCode: currentCountry.code,
      pagePath,
      cartItemCount: totalCount,
      cartValueMinorUnits: totalValueMinor,
      inCheckout: storefrontView === 'checkout' || isCheckoutOpen,
    });
  }, [storefrontView, currentCountry.code, cartItems, isCheckoutOpen]);

  // Keep active visitor heartbeat fresh while tab is open
  useEffect(() => {
    const timer = window.setInterval(() => {
      const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalValueMinor = cartItems.reduce((acc, item) => acc + item.totalPriceMinorUnits, 0);
      analyticsTracker.trackEvent({
        type: 'heartbeat',
        countryCode: currentCountry.code,
        cartItemCount: totalCount,
        cartValueMinorUnits: totalValueMinor,
        inCheckout: storefrontView === 'checkout' || isCheckoutOpen,
      });
    }, 25000);

    return () => window.clearInterval(timer);
  }, [currentCountry.code, cartItems, storefrontView, isCheckoutOpen]);

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

  const handleInspectProduct = (product: Product) => {
    storeDb.recordRecentlyViewedProduct(product.id);
    setSelectedProduct(product);
    analyticsTracker.trackEvent({
      type: 'product_view',
      countryCode: currentCountry.code,
      productId: product.id,
      productName: product.name,
    });
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

    analyticsTracker.trackEvent({
      type: 'add_to_cart',
      countryCode: currentCountry.code,
      productId: product.id,
      productName: product.name,
      variantTitle: selectedVar.title,
      quantity,
      amountMinorUnits: quantity * unitPriceMinorUnits,
    });
  };

  // Bundle Add All Handler (adds all 3 bundle items to cart & opens drawer)
  const handleAddBundleToCart = (
    bundleEntries: Array<{ product: Product; variant: ProductVariant }>
  ) => {
    bundleEntries.forEach((entry, idx) => {
      handleAddToCart(
        entry.product,
        entry.variant,
        1,
        idx === bundleEntries.length - 1
      );
    });
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
  const filteredProducts = products.filter((p) => {
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
  const heroSpotlightProduct =
    products.find((p) => p.id === 'prod_architek_titan_mod') || products[0];

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
    <div className="min-h-screen flex flex-col bg-[#FDFCF9] text-neutral-900">
      {/* 1. Top Deep Forest Marquee + Clean Ivory Responsive Header */}
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

      {/* 2. Main Storefront Body: Shop (/shop), Cart (/cart), Checkout (/checkout), Order Confirmation (/order-confirmation), or Redesigned Maveno Homepage (/) */}
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
            onViewProduct={handleInspectProduct}
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
            onViewProduct={handleInspectProduct}
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
              analyticsTracker.trackEvent({
                type: 'purchase_completed',
                countryCode: order.shippingAddress.countryCode || currentCountry.code,
                city: order.shippingAddress.municipality || order.shippingAddress.city,
                pagePath: '/order-confirmation',
                cartItemCount: 0,
                cartValueMinorUnits: 0,
                inCheckout: false,
                orderId: order.orderId,
                orderNumber: order.orderNumber,
                amountMinorUnits: order.financials.totalAmountMinorUnits,
              });
              setCompletedOrder(order);
              handleClearCart();
              refreshAllData();
              window.history.pushState({}, '', '/order-confirmation');
              setStorefrontView('order_confirmation');
              window.scrollTo(0, 0);
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
          {/* SECTION 1: Soft Pink Rounded-3xl Hero Card */}
          <HeroBanner
            settings={settings}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            featuredProduct={heroSpotlightProduct}
            onExploreCatalog={() => {
              document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onDiscoverMaveno={() => {
              document.getElementById('brand-story')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenCompliance={() => setIsBlogOpen(true)}
            onInspectProduct={handleInspectProduct}
          />

          {/* SECTION 2: "Shop by category" on Soft Blush Band */}
          <EditorialCategoryShowcase
            categories={allCategories}
            products={products}
            onSelectCategoryForShop={(catId) => handleOpenShopPage(catId)}
            onFilterHomepageCategory={(catId) => {
              setSelectedCategory(catId);
              document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* SECTION 3: 4-Item Horizontal Trust Icon Strip */}
          <MavenoTrustIconStrip currentCountry={currentCountry} />

          {/* SECTION 4: Tabbed Best Selling / Featured Products Grid (Matching Screenshot's Underline Tabs + "View All" Link) */}
          <motion.section
            id="catalogue"
            data-testid="maveno-featured-collection"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.14 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
          >
            {/* Top Underline Tabs Row + Right "View All" Link */}
            <motion.div
              variants={staggerItemVariants}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CFE0D6] pb-0"
            >
              <div className="flex items-center gap-6 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`pb-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'border-[#113225] text-neutral-950'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Best Selling ({publishedCatalogCount})
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`pb-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'border-[#113225] text-neutral-950'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="pb-3 sm:pb-3.5 flex items-center justify-between sm:justify-end gap-4">
                <button
                  type="button"
                  data-testid="homepage-view-all-top-btn"
                  onClick={() => handleOpenShopPage()}
                  className="text-xs sm:text-sm font-semibold text-neutral-900 hover:text-[#113225] underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  View All
                </button>
              </div>
            </motion.div>

            {/* Subtle Secondary Filter & Count Bar */}
            <motion.div
              variants={staggerItemVariants}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid="homepage-showing-count" className="font-medium text-neutral-700">
                  Showing {homepageDisplayedProducts.length} of {filteredProducts.length} active products
                </span>
                {searchQuery && (
                  <span>
                    for &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  aria-label="Filter by brand"
                  className="bg-[#F1F6F3] border border-[#CFE0D6] rounded-full px-3 py-1 text-xs text-neutral-800 font-medium focus:outline-hidden"
                >
                  <option value="all">All Brands</option>
                  {allBrands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort products"
                  className="bg-[#F1F6F3] border border-[#CFE0D6] rounded-full px-3 py-1 text-xs text-neutral-800 font-medium focus:outline-hidden"
                >
                  <option value="featured">Sort: Best Selling</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </motion.div>

            {/* 4-Column Product Grid */}
            {homepageDisplayedProducts.length === 0 ? (
              <motion.div
                variants={staggerItemVariants}
                className="py-16 text-center text-neutral-500 bg-[#F1F6F3] rounded-2xl border border-[#CFE0D6] mt-2 space-y-3"
              >
                <Search className="w-9 h-9 text-neutral-400 mx-auto" />
                <p className="text-sm font-medium">No products match your criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedBrand('all');
                    setSearchQuery('');
                  }}
                  className="px-5 py-2 bg-[#113225] text-white rounded-full text-xs font-semibold hover:bg-[#0B2219] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </motion.div>
            ) : (
              <>
                <motion.div
                  key={`${selectedCategory}_${selectedBrand}_${sortBy}`}
                  variants={staggerContainerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  data-testid="homepage-products-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2"
                >
                  {homepageDisplayedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={staggerCardVariants}
                      whileHover={{ y: -4 }}
                    >
                      <ProductCard
                        product={product}
                        currentCountry={currentCountry}
                        currentCurrency={currentCurrency}
                        onViewProduct={handleInspectProduct}
                        onAddToCart={(p, variant, qty) => handleAddToCart(p, variant, qty)}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Bottom View All Products Pill CTA */}
                <motion.div
                  variants={staggerItemVariants}
                  className="mt-10 flex justify-center"
                >
                  <button
                    type="button"
                    data-testid="homepage-view-all-products-btn"
                    onClick={() => handleOpenShopPage()}
                    className="px-7 py-3 bg-[#113225] hover:bg-[#0B2219] text-white rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>View All Products ({publishedCatalogCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              </>
            )}
          </motion.section>

          {/* SECTION 5: "Loved by Customers Like You" Review Carousel on Soft Sage Band */}
          <MavenoCustomerReviews
            products={products}
            onViewProduct={handleInspectProduct}
          />

          {/* SECTION 6: Interactive 3-Item Bundle Builder ("Complete Sovereign Bundle") */}
          <MavenoBundleBuilder
            products={products}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            onViewProduct={handleInspectProduct}
            onAddBundleToCart={handleAddBundleToCart}
          />

          {/* SECTION 7: "Honest answers about our craft" 3-Column Blog/Guides Grid */}
          <MavenoHonestAnswersBlog
            posts={blogPosts}
            onOpenBlog={() => setIsBlogOpen(true)}
          />

          {/* SECTION 8: Dark Luxury Feature Banner ("Indulge in precision.") + 4-Pill Service Strip */}
          <MavenoIndulgeDarkBanner
            products={products}
            currentCountry={currentCountry}
            currentCurrency={currentCurrency}
            onViewProduct={handleInspectProduct}
          />

          {/* SECTION 9: "Trusted Partners / Available on" Logo Strip */}
          <MavenoTrustedPartners />

          {/* SECTION 10: "Born From A Vision, Built for Every Connoisseur" 2-Column Story */}
          <MavenoBrandStory
            settings={settings}
            currentCountry={currentCountry}
            onExploreShop={() => handleOpenShopPage()}
            onOpenCompliance={() => setIsBlogOpen(true)}
          />

          {/* SECTION 11: "Your questions, answered" Interactive 01-04 FAQ + Emerald Concierge Card */}
          <MavenoFaqSection
            settings={settings}
            currentCountry={currentCountry}
            onOpenCompliance={() => setIsBlogOpen(true)}
          />
        </main>
      )}

      {/* SECTION 12: 5-Column Light Blush Footer with "Subscribe to our emails" */}
      <Footer
        settings={settings}
        currentCountry={currentCountry}
        currentCurrency={currentCurrency}
        countries={countries}
        currencies={currencies}
        onSelectCountry={handleSelectCountry}
        onSelectCurrency={setCurrentCurrency}
        onOpenBlog={() => setIsBlogOpen(true)}
        onOpenAdmin={() => void handleOpenAdminGateway()}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenShop={(catId) => handleOpenShopPage(catId)}
        onOpenCart={handleOpenCartPage}
        onOpenHome={handleOpenHomePage}
        onSubscribed={refreshAllData}
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
        onOrdersUpdated={refreshAllData}
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
