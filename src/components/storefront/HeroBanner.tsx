import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import { Country, Currency, Product, StoreSettings } from '../../types/ecommerce';
import { formatMinorUnits, resolveProductPrice } from '../../utils/commerce-engine';

const heroContainerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

interface HeroBannerProps {
  settings: StoreSettings;
  currentCountry: Country;
  currentCurrency: Currency;
  featuredProduct?: Product;
  onExploreCatalog: () => void;
  onDiscoverMaveno?: () => void;
  onOpenCompliance: () => void;
  onInspectProduct?: (product: Product) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  settings,
  currentCountry,
  currentCurrency,
  featuredProduct,
  onExploreCatalog,
  onDiscoverMaveno,
  onOpenCompliance,
  onInspectProduct,
}) => {
  const headlineText =
    settings.heroHeadline &&
    settings.heroHeadline !== 'Precision Engineering. Pure Botanical Extracts.'
      ? settings.heroHeadline
      : 'Designed to stand apart.';

  const supportingText =
    settings.heroDescription &&
    !settings.heroDescription.startsWith('Curated luxury vapor platforms')
      ? settings.heroDescription
      : 'Discover a carefully curated collection of modern products, thoughtful design and distinctive craftsmanship.';

  const primaryCtaText =
    settings.heroPrimaryButtonText &&
    settings.heroPrimaryButtonText !== 'Explore Catalog'
      ? settings.heroPrimaryButtonText
      : 'Shop Collection';

  const spotlightPrice = featuredProduct
    ? formatMinorUnits(
        resolveProductPrice(featuredProduct, currentCountry.code, currentCurrency),
        currentCurrency
      )
    : null;

  return (
    <section
      data-testid="maveno-hero-section"
      className="bg-[#FDFCF9] pt-4 pb-8 sm:pt-6 sm:pb-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Soft Botanical Mint-to-Celadon Rounded-3xl Hero Card */}
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="relative rounded-[28px] sm:rounded-[34px] overflow-hidden bg-linear-to-r from-[#DCECE2] via-[#EAF4EE] to-[#D2E6DA] border border-[#CFE0D6] shadow-xs"
        >
          {/* Subtle decorative radial highlights */}
          <div
            className="pointer-events-none absolute inset-0 opacity-75"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.6), transparent 52%), radial-gradient(circle at 85% 20%, rgba(17, 50, 37, 0.08), transparent 50%)',
            }}
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center min-h-[420px] sm:min-h-[480px] lg:min-h-[520px]">
            {/* Left Column (6 Cols): Editorial Product & Lifestyle Composition */}
            <motion.div
              variants={heroItemVariants}
              className="lg:col-span-6 relative h-full flex items-center justify-center p-6 sm:p-10 lg:p-12 order-2 lg:order-1"
            >
              <div className="relative w-full max-w-lg aspect-4/3 sm:aspect-16/11 rounded-2xl overflow-hidden shadow-lg border-4 border-white/85 bg-[#E5EFE9] group">
                <img
                  src="/src/assets/images/maveno_editorial_hero_showcase_1794341295701.jpg"
                  alt="Maveno Curated Titanium Hardware and Amber Glass Botanical Vessels"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />

                {/* Floating Product Pill Overlay */}
                {featuredProduct && (
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-md border border-[#CFE0D6] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={featuredProduct.galleryImages[0]}
                        alt={featuredProduct.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#CFE0D6] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#113225]/75 truncate">
                          {featuredProduct.brand} · Flagship Edition
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-neutral-950 truncate">
                          {featuredProduct.name}
                        </div>
                        {spotlightPrice && (
                          <div className="text-xs font-mono-numbers font-semibold text-[#113225]">
                            {spotlightPrice}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="hero-spotlight-inspect-btn"
                      onClick={() => onInspectProduct?.(featuredProduct)}
                      className="px-3.5 py-2 rounded-full bg-[#113225] hover:bg-[#0B2219] text-white text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Column (6 Cols): Centered/Right-Aligned Display Headline, Quiz Link & Emerald Pill CTA */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left justify-center p-8 sm:p-12 lg:pr-16 space-y-5 order-1 lg:order-2">
              <motion.div
                variants={heroItemVariants}
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 border border-[#CFE0D6] text-[11px] font-semibold text-[#113225] tracking-wide"
              >
                <span>{currentCountry.flagEmoji}</span>
                <span>{currentCountry.name} Storefront</span>
                <span aria-hidden="true">·</span>
                <span>Verified {currentCountry.minimumAge}+ Only</span>
              </motion.div>

              <motion.h1
                variants={heroItemVariants}
                data-testid="hero-headline"
                className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold text-neutral-950 tracking-tight leading-[1.08]"
                style={{ fontFamily: "'Poppins', sans-serif", textWrap: 'balance' }}
              >
                {headlineText}
              </motion.h1>

              <motion.p
                variants={heroItemVariants}
                data-testid="hero-supporting-text"
                className="text-sm sm:text-base text-neutral-700 max-w-lg leading-relaxed"
              >
                {supportingText}{' '}
                <button
                  type="button"
                  onClick={onOpenCompliance}
                  className="font-semibold text-neutral-950 underline underline-offset-4 hover:text-[#113225] cursor-pointer"
                >
                  Take the 60-second platform guide
                </button>{' '}
                to find your ideal hardware &amp; botanical pairing.
              </motion.p>

              <motion.div
                variants={heroItemVariants}
                className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3"
              >
                <button
                  type="button"
                  data-testid="hero-explore-collection-btn"
                  onClick={onExploreCatalog}
                  className="px-8 py-3.5 rounded-full bg-[#113225] hover:bg-[#0B2219] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-sm transition-all cursor-pointer"
                >
                  {primaryCtaText}
                </button>

                <button
                  type="button"
                  data-testid="hero-discover-maveno-btn"
                  onClick={() => {
                    if (onDiscoverMaveno) {
                      onDiscoverMaveno();
                    } else {
                      document
                        .getElementById('brand-story')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-3.5 rounded-full bg-white/90 hover:bg-white text-[#113225] font-semibold text-xs sm:text-sm border border-[#113225]/20 transition-all cursor-pointer"
                >
                  Explore Our Story
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
