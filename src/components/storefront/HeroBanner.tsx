import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Country, Currency, StoreSettings } from '../../types/ecommerce';

interface HeroBannerProps {
  settings: StoreSettings;
  currentCountry: Country;
  currentCurrency: Currency;
  onExploreCatalog: () => void;
  onOpenCompliance: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  settings,
  currentCountry,
  currentCurrency,
  onExploreCatalog,
  onOpenCompliance,
}) => {
  return (
    <section className="relative bg-neutral-900 text-white overflow-hidden border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{settings.heroBadge || 'State of Qatar Regulated Platform · 🇶🇦 Doha Hub (21+ MOPH)'}</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight font-display"
              style={{ fontFamily: "'Poppins', sans-serif", textWrap: 'balance' }}
            >
              {settings.heroHeadline || 'Precision Engineering. Pure Botanical Extracts.'}
            </h1>

            <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed">
              {settings.heroDescription || 'Curated luxury vapor platforms, high-vacuum rebuildable atomizers, and small-batch aged botanical liquids. Express warehouse fulfillment across Doha, Lusail, The Pearl, Al Rayyan, and all Qatar municipalities with mandatory Qatar National ID age verification.'}
            </p>

            {/* Jurisdiction Compliance Trust Strip */}
            <div className="pt-2 pb-2">
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Destination: <strong className="text-white">{currentCountry.name}</strong> ({currentCountry.code})
                  </span>
                </div>
                <span className="text-neutral-600">·</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Min Legal Age: <strong className="text-white">{currentCountry.minimumAge}+</strong>
                  </span>
                </div>
                <span className="text-neutral-600">·</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Billing Currency: <strong className="text-white">{currentCurrency.code}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={onExploreCatalog}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>{settings.heroPrimaryButtonText || 'Explore Catalog'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCompliance}
                className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm rounded-lg border border-neutral-700 transition-colors cursor-pointer"
              >
                {settings.heroSecondaryButtonText || 'Compliance & Legal Framework'}
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950 aspect-16/10 lg:aspect-4/3">
              <img
                src="/src/assets/images/hero_luxury_vape_mod_1794234135797.jpg"
                alt="Architek Titan 80W Precision Vaporizer on Travertine Stone"
                className="w-full h-full object-cover object-center transform hover:scale-102 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-linear-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-neutral-900/80 backdrop-blur-md border border-neutral-700/60 text-xs text-neutral-300 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Architek Titan Series</div>
                  <div className="text-[11px] text-neutral-400">Grade 5 Monolithic Titanium · DNA60C</div>
                </div>
                <span className="font-mono-numbers text-amber-400 font-bold text-sm">
                  {settings.heroFeaturedTag || `Available in ${currentCountry.code}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
