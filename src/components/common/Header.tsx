import React, { useState } from 'react';
import {
  ShoppingBag,
  User,
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Menu,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Country, Currency, StoreSettings } from '../../types/ecommerce';
import { formatMinorUnits } from '../../utils/commerce-engine';

interface HeaderProps {
  settings: StoreSettings;
  currentCountry: Country;
  currentCurrency: Currency;
  countries: Country[];
  currencies: Currency[];
  onSelectCountry: (country: Country) => void;
  onSelectCurrency: (currency: Currency) => void;
  cartItemCount: number;
  cartSubtotalMinorUnits: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenBlog: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onSelectCategory?: (categoryId: string) => void;
  storefrontView?: 'home' | 'shop' | 'cart' | 'checkout' | 'order_confirmation';
  onOpenShop?: () => void;
  onOpenHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentCountry,
  currentCurrency,
  countries,
  currencies,
  onSelectCountry,
  onSelectCurrency,
  cartItemCount,
  cartSubtotalMinorUnits,
  onOpenCart,
  onOpenAdmin,
  onOpenAccount,
  onOpenBlog,
  onSearch,
  searchQuery,
  onSelectCategory,
  storefrontView = 'home',
  onOpenShop,
  onOpenHome,
}) => {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isMarketBlocked = currentCountry.status === 'blocked';
  const isMarketPending = currentCountry.status === 'pending_legal_review';
  const isMarketRestricted = currentCountry.status === 'restricted';

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    setIsCatalogOpen(false);
    if (storefrontView !== 'home') {
      onOpenHome?.();
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        data-testid="maveno-header"
        className="sticky top-0 z-40 w-full bg-[#FDFCF9] text-neutral-900 border-b border-[#CFE0D6]"
      >
        {/* Top Deep Forest Repeating Announcement Bar */}
        {settings.announcementBarEnabled && (
          <div className="bg-[#0A1F17] text-white text-[11px] font-medium py-2 px-4 overflow-hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 whitespace-nowrap overflow-x-auto no-scrollbar">
              <span>Free Shipping on Advance Payment.</span>
              <span className="hidden sm:inline">12 Months Warranty</span>
              <span className="hidden md:inline">Free Shipping on Advance Payment.</span>
              <span className="hidden lg:inline">12 Months Warranty</span>
              <span className="hidden xl:inline">
                Express Delivery Across {currentCountry.name} ({currentCurrency.code})
              </span>
            </div>
          </div>
        )}

        {/* Destination Warning Banner if Restricted/Blocked */}
        {(isMarketBlocked || isMarketPending || isMarketRestricted) && (
          <div
            className={`text-xs px-4 py-1.5 flex items-center justify-center gap-2 text-center ${
              isMarketBlocked
                ? 'bg-red-50 text-red-800 border-b border-red-200'
                : isMarketPending
                ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isMarketBlocked && (
                <strong>
                  SALES PROHIBITED IN {currentCountry.name.toUpperCase()}: Commerce is legally disabled for this jurisdiction.
                </strong>
              )}
              {isMarketPending && (
                <span>
                  {currentCountry.name} is currently undergoing legal regulatory review. Catalog is preview-only.
                </span>
              )}
              {isMarketRestricted && (
                <span>
                  {currentCountry.name} is subject to strict non-nicotine and prescription rules. Certain items restricted.
                </span>
              )}
            </span>
          </div>
        )}

        {/* Main Ivory Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-6">
          {/* Left: Mobile Menu Button + Brand Logo Lockup */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-neutral-800 hover:bg-[#F1F6F3] rounded-full transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="/"
              data-testid="header-brand-logo"
              onClick={(e) => {
                if (onOpenHome) {
                  e.preventDefault();
                  onOpenHome();
                }
              }}
              className="flex items-center gap-2.5 shrink-0 group cursor-pointer"
            >
              {/* Dual-Tone Emerald & Sage Emblem */}
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#E5EFE9] border border-[#CFE0D6]">
                <span className="w-4 h-4 rounded-full bg-[#113225] -ml-1.5" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#7BA98E] -ml-1" />
              </span>
              <span
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#113225]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {settings.storeName}
              </span>
            </a>

            {/* Desktop Navigation Links */}
            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-5 text-xs font-medium text-neutral-700 pl-2"
            >
              <button
                type="button"
                onClick={() => onOpenHome?.()}
                className={`hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap ${
                  storefrontView === 'home' ? 'text-[#113225] font-semibold' : ''
                }`}
              >
                Home
              </button>

              {/* Catalog Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  data-testid="header-shop-all-btn"
                  onClick={() => {
                    onSelectCategory?.('all');
                    onOpenShop?.();
                  }}
                  onMouseEnter={() => setIsCatalogOpen(true)}
                  className={`inline-flex items-center gap-1 hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap ${
                    storefrontView === 'shop' ? 'text-[#113225] font-semibold' : ''
                  }`}
                >
                  <span>Catalog</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {isCatalogOpen && (
                  <div
                    onMouseLeave={() => setIsCatalogOpen(false)}
                    className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#CFE0D6] py-2 z-50"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogOpen(false);
                        onSelectCategory?.('all');
                        onOpenShop?.();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#113225] hover:bg-[#F1F6F3] cursor-pointer"
                    >
                      Shop All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogOpen(false);
                        onSelectCategory?.('regulated-mods');
                        onOpenShop?.();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-[#F1F6F3] cursor-pointer"
                    >
                      Precision Box Mods
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogOpen(false);
                        onSelectCategory?.('atomizers-tanks');
                        onOpenShop?.();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-[#F1F6F3] cursor-pointer"
                    >
                      Rebuildable Atomizers
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogOpen(false);
                        onSelectCategory?.('botanical-eliquids');
                        onOpenShop?.();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-[#F1F6F3] cursor-pointer"
                    >
                      Botanical Extracts
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogOpen(false);
                        onSelectCategory?.('billet-accessories');
                        onOpenShop?.();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-[#F1F6F3] cursor-pointer"
                    >
                      Billet Panels &amp; Bridges
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenBlog}
                className="hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap"
              >
                Blogs
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('bundle-builder')}
                className="hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap"
              >
                Complete Bundle
              </button>

              <button
                type="button"
                onClick={onOpenAccount}
                className="hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap"
              >
                Track Order
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('trusted-partners')}
                className="hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap hidden xl:inline"
              >
                Where to Buy
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('faq-section')}
                className="hover:text-[#113225] transition-colors cursor-pointer whitespace-nowrap hidden xl:inline"
              >
                FAQ
              </button>
            </nav>
          </div>

          {/* Right: Search, Country/Currency, Account, Admin & Shopping Bag */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search Input / Icon */}
            {showSearchInput ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  data-testid="header-search-input"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    onSearch(e.target.value);
                    if (storefrontView === 'home' && e.target.value.trim()) {
                      document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  autoFocus
                  className="w-40 sm:w-56 pl-8 pr-7 py-1.5 text-xs rounded-full bg-[#F1F6F3] text-neutral-900 border border-[#CFE0D6] focus:outline-hidden focus:border-[#113225]"
                />
                <Search className="w-3.5 h-3.5 absolute left-3 text-[#113225]" />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchInput(false);
                    onSearch('');
                  }}
                  className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  aria-label="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="header-search-toggle"
                onClick={() => setShowSearchInput(true)}
                className="p-2 text-neutral-700 hover:text-[#113225] hover:bg-[#F1F6F3] rounded-full transition-colors cursor-pointer"
                aria-label="Open search input"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Compact Country Selector */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setIsCountryMenuOpen(!isCountryMenuOpen);
                  setIsCurrencyMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:text-[#113225] bg-[#F1F6F3] border border-[#CFE0D6]/60 rounded-full transition-colors cursor-pointer"
                aria-label={`Select destination country, currently ${currentCountry.name}`}
              >
                <span>{currentCountry.flagEmoji}</span>
                <span className="font-semibold">{currentCountry.code}</span>
              </button>

              {isCountryMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-neutral-900 rounded-2xl shadow-xl border border-[#CFE0D6] py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-neutral-100 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
                    Destination Market
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          onSelectCountry(c);
                          setIsCountryMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F1F6F3] cursor-pointer ${
                          c.code === currentCountry.code ? 'bg-[#F1F6F3] font-semibold text-[#113225]' : 'text-neutral-700'
                        }`}
                      >
                        <span>
                          {c.flagEmoji} {c.name}
                        </span>
                        <span className="text-[10px] text-neutral-500">{c.minimumAge}+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Currency Selector */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                  setIsCountryMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:text-[#113225] bg-[#F1F6F3] border border-[#CFE0D6]/60 rounded-full transition-colors cursor-pointer"
                aria-label={`Select currency, currently ${currentCurrency.code}`}
              >
                <span>{currentCurrency.code}</span>
              </button>

              {isCurrencyMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white text-neutral-900 rounded-2xl shadow-xl border border-[#CFE0D6] py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-neutral-100 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
                    Billing Currency
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => {
                          onSelectCurrency(curr);
                          setIsCurrencyMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F1F6F3] cursor-pointer ${
                          curr.code === currentCurrency.code ? 'bg-[#F1F6F3] font-semibold text-[#113225]' : 'text-neutral-700'
                        }`}
                      >
                        <span>{curr.code}</span>
                        <span className="text-[10px] text-neutral-400">{curr.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account Icon */}
            <button
              type="button"
              onClick={onOpenAccount}
              className="p-2 text-neutral-700 hover:text-[#113225] hover:bg-[#F1F6F3] rounded-full transition-colors cursor-pointer"
              title="Customer Account & Order History"
              aria-label="Open customer account"
            >
              <User className="w-4 h-4" />
            </button>

            {/* Admin Console Button */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#F1F6F3] hover:bg-[#113225] text-[#113225] hover:text-white border border-[#CFE0D6] transition-colors cursor-pointer"
              title="Open Shopify Admin Dashboard"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden xl:inline">Admin</span>
            </button>

            {/* Shopping Bag Button */}
            <button
              type="button"
              data-testid="header-cart-btn"
              onClick={onOpenCart}
              className="relative px-3.5 py-2 rounded-full bg-[#113225] hover:bg-[#0B2219] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              aria-label={`Shopping cart containing ${cartItemCount} items`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span data-testid="header-cart-count" className="font-mono-numbers">
                {cartItemCount}
              </span>
              <span
                data-testid="header-cart-subtotal"
                className="hidden md:inline font-mono-numbers border-l border-white/25 pl-2"
              >
                {formatMinorUnits(cartSubtotalMinorUnits, currentCurrency)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          data-testid="mobile-nav-drawer"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-[#113225]/40 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-[#FDFCF9] text-neutral-900 h-full flex flex-col justify-between p-6 overflow-y-auto z-10 border-r border-[#CFE0D6]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#CFE0D6] pb-4">
                <span className="text-lg font-bold text-[#113225]">
                  {settings.storeName}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-neutral-500 hover:text-neutral-900 rounded-full cursor-pointer"
                  aria-label="Close mobile menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenHome?.();
                  }}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>Home</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSelectCategory?.('all');
                    onOpenShop?.();
                  }}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>Catalog (Shop All)</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('editorial-categories')}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>Shop by Category</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('bundle-builder')}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>Complete Routine Bundle</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBlog();
                  }}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>Blogs &amp; Guides</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('faq-section')}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-neutral-800 hover:text-[#113225] border-b border-neutral-100 cursor-pointer"
                >
                  <span>FAQ</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
              </nav>

              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Destination &amp; Currency
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Mobile destination country"
                    value={currentCountry.code}
                    onChange={(e) => {
                      const found = countries.find((c) => c.code === e.target.value);
                      if (found) onSelectCountry(found);
                    }}
                    className="bg-[#F1F6F3] border border-[#CFE0D6] rounded-xl px-3 py-2 text-xs text-neutral-900"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flagEmoji} {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Mobile billing currency"
                    value={currentCurrency.code}
                    onChange={(e) => {
                      const found = currencies.find((curr) => curr.code === e.target.value);
                      if (found) onSelectCurrency(found);
                    }}
                    className="bg-[#F1F6F3] border border-[#CFE0D6] rounded-xl px-3 py-2 text-xs text-neutral-900"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} ({curr.symbol.trim()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#CFE0D6] space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAccount();
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#F1F6F3] text-[#113225] border border-[#CFE0D6] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Track Order / My Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#113225] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Shopify Admin Console</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
