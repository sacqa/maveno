import React, { useState } from 'react';
import {
  Globe,
  Coins,
  ShoppingBag,
  User,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
  AlertTriangle,
  BookOpen,
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
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const isMarketBlocked = currentCountry.status === 'blocked';
  const isMarketPending = currentCountry.status === 'pending_legal_review';
  const isMarketRestricted = currentCountry.status === 'restricted';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      {/* Top Compliance & Announcement Bar */}
      {settings.announcementBarEnabled && (
        <div className="bg-neutral-900 text-neutral-300 text-xs px-4 py-2 border-b border-neutral-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-amber-400">Notice:</span>
              <span className="text-neutral-300 truncate max-w-xl">
                {settings.announcementBarText}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-neutral-400">
              <span className="hidden md:inline">Concierge: {settings.contactPhone}</span>
              <button
                onClick={onOpenBlog}
                className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Compliance & Guides</span>
              </button>
            </div>
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

      {/* Main Header 3-Zone Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              if (onOpenHome) {
                e.preventDefault();
                onOpenHome();
              }
            }}
            className="text-2xl font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <span>{settings.storeName}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8a1538] text-white tracking-wider uppercase">
              🇶🇦 QATAR
            </span>
          </a>
          <span className="hidden xl:inline text-xs text-neutral-500 uppercase tracking-widest pl-3 border-l border-neutral-300">
            Doha Hub (Min Age {currentCountry.minimumAge}+)
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <button
            onClick={() => {
              onOpenHome?.();
            }}
            className={`hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              storefrontView === 'home' ? 'text-neutral-900 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            data-testid="header-shop-all-btn"
            onClick={() => {
              onSelectCategory?.('all');
              onOpenShop?.();
            }}
            className={`hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              storefrontView === 'shop'
                ? 'text-[#8a1538] font-bold underline underline-offset-4'
                : ''
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => {
              onSelectCategory?.('regulated-mods');
              if (storefrontView === 'home') {
                document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Precision Mods
          </button>
          <button
            onClick={() => {
              onSelectCategory?.('atomizers-tanks');
              if (storefrontView === 'home') {
                document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Rebuildables
          </button>
          <button
            onClick={() => {
              onSelectCategory?.('botanical-eliquids');
              if (storefrontView === 'home') {
                document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Botanical Reserves
          </button>
          <button
            onClick={onOpenBlog}
            className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            Regulatory Guides
          </button>
        </nav>

        {/* Zone 3: Interactive Controls (Country, Currency, Search, Cart, Account, Admin) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Trigger */}
          {showSearchInput ? (
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search SKU, brand, model..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
                className="w-48 sm:w-64 pl-8 pr-8 py-1.5 text-xs bg-neutral-100 rounded-md border border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-500" />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  onSearch('');
                }}
                className="absolute right-2 text-neutral-400 hover:text-neutral-700"
                aria-label="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="p-2 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
              aria-label="Open search input"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Country / Market Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsCountryMenuOpen(!isCountryMenuOpen);
                setIsCurrencyMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors whitespace-nowrap"
              aria-label={`Select destination country, currently ${currentCountry.name}`}
            >
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span className="mr-0.5">{currentCountry.flagEmoji}</span>
              <span className="font-semibold">{currentCountry.code}</span>
            </button>

            {isCountryMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 border-b border-neutral-100 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                  Select Destination Market
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {countries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onSelectCountry(c);
                        setIsCountryMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                        c.code === currentCountry.code ? 'bg-amber-50/60 font-semibold text-amber-950' : 'text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{c.flagEmoji}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                        <span className="text-neutral-500">{c.minimumAge}+</span>
                        {c.status === 'approved' && (
                          <span className="text-emerald-700 font-medium">Eligible</span>
                        )}
                        {c.status === 'blocked' && (
                          <span className="text-red-700 font-medium">Blocked</span>
                        )}
                        {c.status === 'pending_legal_review' && (
                          <span className="text-amber-700 font-medium">Pending</span>
                        )}
                        {c.status === 'restricted' && (
                          <span className="text-blue-700 font-medium">Restricted</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Currency Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                setIsCountryMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors whitespace-nowrap"
              aria-label={`Select currency, currently ${currentCurrency.code}`}
            >
              <Coins className="w-3.5 h-3.5 text-neutral-500" />
              <span className="font-semibold">{currentCurrency.code}</span>
            </button>

            {isCurrencyMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 z-50">
                <div className="px-3 py-1.5 border-b border-neutral-100 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                  Select Currency
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        onSelectCurrency(curr);
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                        curr.code === currentCurrency.code ? 'bg-amber-50 font-semibold text-amber-950' : 'text-neutral-700'
                      }`}
                    >
                      <span>
                        {curr.code} ({curr.symbol.trim()})
                      </span>
                      <span className="text-neutral-400 text-[10px]">{curr.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Account Button */}
          <button
            onClick={onOpenAccount}
            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
            title="Customer Account & Order History"
            aria-label="Open customer account"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Admin Control Dashboard Toggle */}
          <button
            onClick={onOpenAdmin}
            className="px-2.5 py-1.5 text-xs font-semibold bg-[#1a1a1a] hover:bg-neutral-800 text-white rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer border border-neutral-700 shadow-xs"
            title="Open Shopify Admin Dashboard"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Shopify Admin</span>
          </button>

          {/* Cart Trigger Button */}
          <button
            data-testid="header-cart-btn"
            onClick={onOpenCart}
            className="relative px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            aria-label={`Shopping cart containing ${cartItemCount} items`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span data-testid="header-cart-count" className="font-mono-numbers">
              {cartItemCount}
            </span>
            <span
              data-testid="header-cart-subtotal"
              className="hidden md:inline font-mono-numbers border-l border-amber-600/60 pl-2"
            >
              {formatMinorUnits(cartSubtotalMinorUnits, currentCurrency)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
