import React, { useState } from 'react';
import { ChevronRight, ShieldAlert, X } from 'lucide-react';
import { StoreSettings, Country, Currency } from '../../types/ecommerce';
import { storeDb } from '../../services/store-db';

interface FooterProps {
  settings: StoreSettings;
  currentCountry: Country;
  currentCurrency: Currency;
  countries?: Country[];
  currencies?: Currency[];
  onSelectCountry?: (country: Country) => void;
  onSelectCurrency?: (currency: Currency) => void;
  onOpenBlog: () => void;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenShop?: (categoryId?: string) => void;
  onOpenCart?: () => void;
  onOpenHome?: () => void;
  onSubscribed?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  currentCountry,
  currentCurrency,
  countries = [],
  currencies = [],
  onSelectCountry,
  onSelectCurrency,
  onOpenBlog,
  onOpenAdmin,
  onOpenAccount,
  onOpenShop,
  onOpenCart,
  onOpenHome,
  onSubscribed,
}) => {
  const [activeLegalModal, setActiveLegalModal] = useState<
    'privacy' | 'refund' | 'terms' | null
  >(null);
  const [emailInput, setEmailInput] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const scrollToHomepageSection = (sectionId: string) => {
    onOpenHome?.();
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = storeDb.subscribeToNewsletter(emailInput, consentChecked);
    if (!result.success) {
      setFeedback({ type: 'error', message: result.message });
      return;
    }
    setFeedback({ type: 'success', message: result.message });
    setEmailInput('');
    onSubscribed?.();
  };

  return (
    <>
      <footer
        id="newsletter"
        data-testid="maveno-footer"
        className="bg-[#F1F6F3] text-neutral-800 border-t border-[#CFE0D6] text-xs"
      >
        {/* Main 5-Column Soft Sage/Ivory Footer Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-8 lg:gap-6">
            {/* Column 1 (2 Cols): About */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-3">
              <div className="font-bold text-neutral-950 text-xs sm:text-sm">
                About
              </div>
              <ul className="space-y-2.5 text-neutral-600 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToHomepageSection('brand-story')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Our Story
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenBlog}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Editorial &amp; Blog
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToHomepageSection('trusted-partners')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Trusted Partners
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('privacy')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2 (2 Cols): Shop */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-3">
              <div className="font-bold text-neutral-950 text-xs sm:text-sm">
                Shop
              </div>
              <ul className="space-y-2.5 text-neutral-600 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenShop?.('all')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Shop All
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenShop?.('regulated-mods')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Precision Box Mods
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenShop?.('atomizers-tanks')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Rebuildable Atomizers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenShop?.('botanical-eliquids')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Botanical Extracts
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToHomepageSection('bundle-builder')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Sovereign Bundles
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3 (2 Cols): Customer Care */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-3">
              <div className="font-bold text-neutral-950 text-xs sm:text-sm">
                Customer Care
              </div>
              <ul className="space-y-2.5 text-neutral-600 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToHomepageSection('faq-section')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    FAQs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    My Account &amp; Orders
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenCart?.()}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Shipping &amp; Bag
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('refund')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Refund Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('terms')}
                    className="hover:text-[#113225] transition-colors cursor-pointer text-left"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4 (2 Cols): Get the App + Country/Currency & Admin */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-3">
              <div className="font-bold text-neutral-950 text-xs sm:text-sm">
                Get the {settings.storeName} App
              </div>

              {/* Google Play & App Store Badges */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="px-3 py-2 rounded-lg bg-[#0A1F17] hover:bg-[#113225] text-white text-left flex items-center gap-2 transition-colors cursor-pointer w-fit"
                >
                  <span className="text-sm">▶</span>
                  <div className="leading-none">
                    <div className="text-[8px] uppercase tracking-wider text-neutral-300">
                      GET IT ON
                    </div>
                    <div className="text-[11px] font-bold">Google Play</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="px-3 py-2 rounded-lg bg-[#0A1F17] hover:bg-[#113225] text-white text-left flex items-center gap-2 transition-colors cursor-pointer w-fit"
                >
                  <span className="text-sm"></span>
                  <div className="leading-none">
                    <div className="text-[8px] uppercase tracking-wider text-neutral-300">
                      Download on the
                    </div>
                    <div className="text-[11px] font-bold">App Store</div>
                  </div>
                </button>
              </div>

              {/* Compact Country & Currency Selectors */}
              <div className="pt-2 space-y-1.5">
                {countries.length > 0 && onSelectCountry && (
                  <select
                    data-testid="footer-country-select"
                    value={currentCountry.code}
                    onChange={(e) => {
                      const found = countries.find((c) => c.code === e.target.value);
                      if (found) onSelectCountry(found);
                    }}
                    aria-label="Shipping country"
                    className="w-full bg-white border border-[#CFE0D6] rounded-lg px-2 py-1.5 text-[11px] text-neutral-800 focus:outline-hidden"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flagEmoji} {c.name} ({c.minimumAge}+)
                      </option>
                    ))}
                  </select>
                )}

                {currencies.length > 0 && onSelectCurrency && (
                  <select
                    data-testid="footer-currency-select"
                    value={currentCurrency.code}
                    onChange={(e) => {
                      const found = currencies.find((curr) => curr.code === e.target.value);
                      if (found) onSelectCurrency(found);
                    }}
                    aria-label="Billing currency"
                    className="w-full bg-white border border-[#CFE0D6] rounded-lg px-2 py-1.5 text-[11px] text-neutral-800 font-mono-numbers focus:outline-hidden"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} ({curr.symbol.trim()})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="w-full py-1.5 px-2.5 bg-white hover:bg-[#113225] text-[#113225] hover:text-white rounded-lg text-[11px] font-semibold border border-[#113225]/25 transition-colors cursor-pointer"
                >
                  Admin Console
                </button>
              </div>
            </div>

            {/* Column 5 (4 Cols): "Subscribe to our emails" */}
            <div className="col-span-2 md:col-span-3 lg:col-span-4 space-y-3.5 lg:pl-4">
              <h2
                data-testid="newsletter-heading"
                className="text-xl sm:text-2xl font-extrabold text-neutral-950 tracking-tight leading-snug"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Subscribe to our
                <br />
                emails
              </h2>

              <form onSubmit={handleNewsletterSubmit} noValidate className="space-y-2.5">
                <div className="flex items-center bg-white rounded-full border border-[#CFE0D6] p-1 shadow-2xs focus-within:border-[#113225]">
                  <input
                    type="email"
                    data-testid="newsletter-email-input"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (feedback) setFeedback(null);
                    }}
                    placeholder="Email"
                    aria-label="Email address for newsletter"
                    className="grow px-4 py-2 text-xs sm:text-sm bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    data-testid="newsletter-submit-btn"
                    aria-label="Subscribe to newsletter"
                    className="w-9 h-9 rounded-full bg-[#113225] hover:bg-[#0B2219] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <label className="flex items-start gap-2 text-[11px] text-neutral-500 cursor-pointer leading-relaxed">
                  <input
                    type="checkbox"
                    data-testid="newsletter-consent-checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 accent-[#113225] rounded"
                  />
                  <span>
                    By subscribing you confirm you are {currentCountry.minimumAge}+ and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveLegalModal('terms')}
                      className="underline text-neutral-800 hover:text-[#113225]"
                    >
                      Terms of Use
                    </button>{' '}
                    &amp;{' '}
                    <button
                      type="button"
                      onClick={() => setActiveLegalModal('privacy')}
                      className="underline text-neutral-800 hover:text-[#113225]"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>

                {feedback && (
                  <div
                    data-testid="newsletter-feedback"
                    role="status"
                    className={`p-2.5 rounded-xl text-xs font-medium ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Social Links & Copyright Row */}
          <div className="mt-12 pt-6 border-t border-[#CFE0D6] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-neutral-600 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-[#113225]" />
                <span>
                  Adult {currentCountry.minimumAge}+ Signature &amp; ID Required on Delivery ({currentCountry.name})
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span>
                &copy; 2026, {settings.storeName}. Powered by Shopify.
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Policy Modal when Privacy, Refund, or Terms is clicked */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-950">
                {activeLegalModal === 'privacy' && 'Privacy & Personal Data Protection Policy'}
                {activeLegalModal === 'refund' && 'Returns, Exchanges & Refund Policy'}
                {activeLegalModal === 'terms' && 'Terms of Service & Adult Eligibility'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-md cursor-pointer"
                aria-label="Close legal policy modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              {activeLegalModal === 'privacy' && settings.privacyPolicyText}
              {activeLegalModal === 'refund' && settings.refundPolicyText}
              {activeLegalModal === 'terms' && settings.termsOfServiceText}
            </p>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{settings.storeName} · {settings.contactEmail}</span>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 bg-[#113225] text-white rounded-full text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
