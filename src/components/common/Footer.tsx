import React from 'react';
import { ShieldCheck, Globe, AlertTriangle } from 'lucide-react';
import { StoreSettings, Country, Currency } from '../../types/ecommerce';

interface FooterProps {
  settings: StoreSettings;
  currentCountry: Country;
  currentCurrency: Currency;
  onOpenBlog: () => void;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  currentCountry,
  currentCurrency,
  onOpenBlog,
  onOpenAdmin,
  onOpenAccount,
}) => {
  return (
    <footer className="bg-neutral-900 text-neutral-300 border-t border-neutral-800 text-xs">
      {/* Required Legal & Health Warning Strip */}
      <div className="bg-neutral-950 border-b border-neutral-800 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>MANDATORY JURISDICTION HEALTH NOTICE:</span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed max-w-4xl">
            This site contains adult-only products including vaporizers and botanical formulations. Nicotine is an addictive chemical. Sales are restricted to adults aged {currentCountry.minimumAge}+ in {currentCountry.name}. Identity and age verification are enforced prior to order fulfillment. Keep out of reach of children and domestic animals.
          </p>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="text-xl font-bold font-display text-white">
              {settings.storeName}
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed">
              {settings.tagline}
            </p>
            <div className="text-[11px] text-neutral-500 pt-2 space-y-1">
              <div>Doha Pearl Concierge: {settings.contactPhone}</div>
              <div>Inquiries: {settings.contactEmail}</div>
              <div className="text-neutral-600">{settings.supportAddress}</div>
            </div>
          </div>

          {/* Catalog Categories */}
          <div>
            <div className="text-white font-semibold uppercase tracking-wider mb-3 text-xs">
              Catalogue Architecture
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#featured-mods" className="hover:text-white transition-colors">Precision Box Mods</a></li>
              <li><a href="#atomizers" className="hover:text-white transition-colors">Rebuildable Tank Atomizers</a></li>
              <li><a href="#eliquids" className="hover:text-white transition-colors">Botanical Cold Extracts</a></li>
              <li><a href="#catalogue" className="hover:text-white transition-colors">Boro Panels &amp; Accessories</a></li>
            </ul>
          </div>

          {/* Compliance & Governance */}
          <div>
            <div className="text-white font-semibold uppercase tracking-wider mb-3 text-xs">
              Qatar Governance &amp; Standards
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <button onClick={onOpenBlog} className="hover:text-white transition-colors cursor-pointer text-left">
                  State of Qatar MOPH Standards
                </button>
              </li>
              <li>
                <button onClick={onOpenBlog} className="hover:text-white transition-colors cursor-pointer text-left">
                  Qatar ID Age Verification Protocols
                </button>
              </li>
              <li>
                <button onClick={onOpenBlog} className="hover:text-white transition-colors cursor-pointer text-left">
                  Lithium Battery Safety Guides
                </button>
              </li>
              <li>
                <button onClick={onOpenAccount} className="hover:text-white transition-colors cursor-pointer text-left">
                  Age Verification Customer Vault
                </button>
              </li>
            </ul>
          </div>

          {/* Destination Status Strip */}
          <div>
            <div className="text-white font-semibold uppercase tracking-wider mb-3 text-xs">
              Selected Jurisdiction
            </div>
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Country:</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <span>{currentCountry.flagEmoji}</span>
                  <span>{currentCountry.name}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Legal Status:</span>
                <span className="font-semibold text-emerald-400 uppercase text-[10px]">
                  {currentCountry.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Display Currency:</span>
                <span className="text-white font-mono-numbers font-medium">
                  {currentCurrency.code} ({currentCurrency.symbol.trim()})
                </span>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={onOpenAdmin}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 transition-colors cursor-pointer"
              >
                Access Administration Console
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            &copy; 2026 {settings.storeName}. All rights reserved. Sovereign international compliance engine.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>RLS Row-Level Security Enabled</span>
            </span>
            <span>·</span>
            <span>Minor-unit multi-currency</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
