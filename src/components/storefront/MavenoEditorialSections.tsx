import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ShoppingBag,
  Check,
  Truck,
  ShieldCheck,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import {
  BlogPost,
  Category,
  Country,
  Currency,
  Product,
  ProductVariant,
  StoreSettings,
} from '../../types/ecommerce';
import {
  formatMinorUnits,
  resolveProductPrice,
} from '../../utils/commerce-engine';
import { storeDb } from '../../services/store-db';

// ============================================================================
// SHARED FRAMER MOTION STAGGERED ENTRANCE VARIANTS
// ============================================================================
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const staggerCardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.58,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// ============================================================================
// 1. "SHOP BY CATEGORY" SECTION (Emerald Botanical & Ivory Palette)
// ============================================================================
interface EditorialCategoryShowcaseProps {
  categories: Category[];
  products: Product[];
  onSelectCategoryForShop: (categoryId: string) => void;
  onFilterHomepageCategory: (categoryId: string) => void;
}

export const EditorialCategoryShowcase: React.FC<EditorialCategoryShowcaseProps> = ({
  categories,
  products,
  onSelectCategoryForShop,
}) => {
  const publishedProducts = products.filter((p) => p.status === 'published');
  const firstThreeCategories = categories.slice(0, 3);

  return (
    <section
      id="editorial-categories"
      data-testid="maveno-category-section"
      className="bg-[#F1F6F3] py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-[#CFE0D6]"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column (3 Cols): "Shop by category" Heading */}
          <motion.div variants={staggerItemVariants} className="lg:col-span-3 space-y-3">
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.12]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Shop by
              <br />
              category
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xs">
              Curated CNC hardware, rebuildable atomizers, and small-batch oak-aged botanicals.
            </p>
          </motion.div>

          {/* Right Column (9 Cols): 4 Rounded-2xl Portrait Category Cards (3 Categories + 4th "Shop all" Card) */}
          <motion.div
            variants={staggerContainerVariants}
            className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5"
          >
            {firstThreeCategories.map((cat) => {
              const count = publishedProducts.filter(
                (p) => p.categoryId === cat.id
              ).length;

              return (
                <motion.div
                  key={cat.id}
                  variants={staggerCardVariants}
                  whileHover={{ y: -4 }}
                  data-testid={`editorial-category-tile-${cat.id}`}
                  onClick={() => onSelectCategoryForShop(cat.id)}
                  className="group relative aspect-3/4 rounded-2xl overflow-hidden bg-[#E5EFE9] border border-[#CFE0D6] cursor-pointer shadow-xs hover:shadow-md transition-shadow duration-300"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />

                  <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-2">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] text-white/80 font-medium">
                        {count} {count === 1 ? 'Product' : 'Products'}
                      </span>
                    </div>

                    <span className="w-8 h-8 rounded-full bg-white text-[#113225] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#113225] group-hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* 4th Card: "Shop all" Emerald Botanical Brand Emblem Card */}
            <motion.div
              variants={staggerCardVariants}
              whileHover={{ y: -4 }}
              data-testid="editorial-category-tile-shop-all"
              onClick={() => onSelectCategoryForShop('all')}
              className="group relative aspect-3/4 rounded-2xl overflow-hidden bg-linear-to-b from-[#DCECE2] via-[#EAF4EE] to-[#D2E6DA] border border-[#CFE0D6] cursor-pointer shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col justify-between p-4 sm:p-5"
            >
              <div className="grow flex items-center justify-center">
                {/* Dual-circle brand emblem */}
                <span className="relative inline-flex items-center justify-center w-20 h-14">
                  <span className="w-11 h-11 rounded-full bg-[#113225] opacity-95 -mr-3 shadow-sm group-hover:scale-105 transition-transform" />
                  <span className="w-11 h-11 rounded-full bg-white/90 border-2 border-[#113225] shadow-sm group-hover:scale-105 transition-transform" />
                </span>
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#113225] leading-tight">
                    Shop all
                  </h3>
                  <span className="text-[10px] text-[#113225]/75 font-medium">
                    {publishedProducts.length} Active Items
                  </span>
                </div>

                <span className="w-8 h-8 rounded-full bg-white text-[#113225] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#113225] group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 2. 4-ITEM HORIZONTAL TRUST ICON STRIP (Circular Emerald Icons on Ivory Band)
// ============================================================================
interface MavenoTrustIconStripProps {
  currentCountry: Country;
}

export const MavenoTrustIconStrip: React.FC<MavenoTrustIconStripProps> = ({
  currentCountry,
}) => {
  return (
    <section
      data-testid="maveno-trust-icon-strip"
      className="bg-[#FDFCF9] py-10 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-[#CFE0D6]/60"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
      >
        {/* Item 1 */}
        <motion.div variants={staggerItemVariants} className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border-2 border-[#113225] bg-[#F1F6F3] text-[#113225] flex items-center justify-center shrink-0 font-extrabold text-xs font-mono-numbers">
            100k+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
            Loved by 100k+
            <br />
            <span className="font-normal text-neutral-600">Connoisseurs Worldwide</span>
          </div>
        </motion.div>

        {/* Item 2 */}
        <motion.div variants={staggerItemVariants} className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border-2 border-[#113225] bg-[#F1F6F3] text-[#113225] flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
            Fast Delivery Across
            <br />
            <span className="font-normal text-neutral-600">
              {currentCountry.name} {currentCountry.flagEmoji}
            </span>
          </div>
        </motion.div>

        {/* Item 3 */}
        <motion.div variants={staggerItemVariants} className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border-2 border-[#113225] bg-[#F1F6F3] text-[#113225] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
            Safe, Authentic &amp;
            <br />
            <span className="font-normal text-neutral-600">Batch-Certified Craft</span>
          </div>
        </motion.div>

        {/* Item 4 */}
        <motion.div variants={staggerItemVariants} className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border-2 border-[#113225] bg-[#F1F6F3] text-[#113225] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
            MOPH &amp; {currentCountry.minimumAge}+ QA
            <br />
            <span className="font-normal text-neutral-600">Approved Standards</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 3. "LOVED BY CUSTOMERS LIKE YOU" 4-CARD REVIEW CAROUSEL ON SAGE BAND
// ============================================================================
interface MavenoCustomerReviewsProps {
  products: Product[];
  onViewProduct: (product: Product) => void;
}

export const MavenoCustomerReviews: React.FC<MavenoCustomerReviewsProps> = ({
  products,
  onViewProduct,
}) => {
  const [pageIndex, setPageIndex] = useState(0);

  const published = products.filter((p) => p.status === 'published');
  const p0 = published[0];
  const p1 = published[1] || published[0];
  const p2 = published[2] || published[0];
  const p3 = published[3] || published[0];

  const reviews = [
    {
      id: 'rev_1',
      author: 'Ramsha Ibrahim',
      title: 'Unmatched machining & effortless daily reliability',
      body: 'The Grade 5 titanium finish feels extraordinary in hand. Same-day courier delivery to The Pearl was seamless and the packaging is truly world-class.',
      product: p0,
    },
    {
      id: 'rev_2',
      author: 'Tariq Al-Mansoori',
      title: 'Precision airflow that outperforms every other RBA',
      body: 'Swapping the PEEK airflow pins took seconds. Zero leakage even in Doha summer heat, and flavor rendering is remarkably pure.',
      product: p1,
    },
    {
      id: 'rev_3',
      author: 'Yasmin Al-Sabah',
      title: 'Pure botanical notes without any harshness',
      body: 'You can immediately tell the difference with the 90-day charred oak aging. Clean, complex, and gentle on coils week after week.',
      product: p2,
    },
    {
      id: 'rev_4',
      author: 'Nasser Al-Kuwari',
      title: 'My go-to store for authentic sovereign hardware',
      body: 'Every serialized component checked out immediately. Customer concierge answered my compatibility questions within five minutes.',
      product: p3,
    },
  ];

  // Rotate order subtly when prev/next is clicked so carousel controls are interactive
  const rotatedReviews = [
    ...reviews.slice(pageIndex % reviews.length),
    ...reviews.slice(0, pageIndex % reviews.length),
  ];

  return (
    <section
      id="customer-reviews"
      data-testid="maveno-reviews-section"
      className="bg-[#F1F6F3] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-[#CFE0D6]"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="max-w-7xl mx-auto"
      >
        {/* Heading + Prev/Next Circular Arrows */}
        <motion.div
          variants={staggerItemVariants}
          className="flex items-center justify-between gap-4 mb-8 sm:mb-10"
        >
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Loved by Customers Like You
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPageIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
              }
              aria-label="Previous customer reviews"
              className="w-9 h-9 rounded-full bg-white border border-[#CFE0D6] text-[#113225] hover:bg-[#113225] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPageIndex((prev) => (prev + 1) % reviews.length)}
              aria-label="Next customer reviews"
              className="w-9 h-9 rounded-full bg-white border border-[#CFE0D6] text-[#113225] hover:bg-[#113225] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* 4 White Rounded-2xl Review Cards */}
        <motion.div
          variants={staggerContainerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {rotatedReviews.map((rev) => (
            <motion.div
              key={rev.id}
              variants={staggerCardVariants}
              whileHover={{ y: -3 }}
              className="bg-white rounded-2xl p-5 border border-[#CFE0D6] shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">
                    {rev.author}
                  </span>
                  <span className="text-[10px] font-medium text-[#113225] bg-[#E5EFE9] px-2 py-0.5 rounded-full">
                    Verified Buyer
                  </span>
                </div>

                {/* 5 Gold Stars */}
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-neutral-950 leading-snug">
                  {rev.title}
                </h3>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  &ldquo;{rev.body}&rdquo;
                </p>
              </div>

              {/* Linked Mini Product Footer */}
              {rev.product && (
                <button
                  type="button"
                  onClick={() => onViewProduct(rev.product!)}
                  className="pt-3 border-t border-neutral-100 flex items-center gap-2.5 text-left group cursor-pointer w-full"
                >
                  <img
                    src={rev.product.galleryImages[0]}
                    alt={rev.product.name}
                    className="w-9 h-9 rounded-lg object-cover bg-[#E5EFE9] border border-[#CFE0D6] shrink-0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 grow">
                    <div className="text-[11px] font-semibold text-neutral-900 group-hover:text-[#113225] truncate">
                      {rev.product.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      View Referenced Item →
                    </div>
                  </div>
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 4. INTERACTIVE 3-ITEM BUNDLE BUILDER ("Complete Sovereign Bundle")
// ============================================================================
interface MavenoBundleBuilderProps {
  products: Product[];
  currentCountry: Country;
  currentCurrency: Currency;
  onViewProduct: (product: Product) => void;
  onAddBundleToCart: (
    items: Array<{ product: Product; variant: ProductVariant }>
  ) => void;
}

export const MavenoBundleBuilder: React.FC<MavenoBundleBuilderProps> = ({
  products,
  currentCountry,
  currentCurrency,
  onViewProduct,
  onAddBundleToCart,
}) => {
  const bundleProducts = products
    .filter((p) => p.status === 'published')
    .slice(0, 3);

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      bundleProducts.forEach((p) => {
        if (p.variants[0]) {
          initial[p.id] = p.variants[0].id;
        }
      });
      return initial;
    }
  );
  const [bundleAdded, setBundleAdded] = useState(false);

  if (bundleProducts.length === 0) return null;

  const resolvedBundleItems = bundleProducts.map((p) => {
    const varId = selectedVariants[p.id];
    const variant = p.variants.find((v) => v.id === varId) || p.variants[0];
    const unitMinor = resolveProductPrice(
      p,
      currentCountry.code,
      currentCurrency,
      1.0,
      variant
    );
    const rawCompare =
      variant?.compareAtPriceMinorUnits ||
      p.compareAtPriceMinorUnits ||
      Math.round((variant?.priceMinorUnits || p.basePriceMinorUnits) * 1.18);
    const compareMinor = Math.round(rawCompare * currentCurrency.exchangeRateToBase);

    return {
      product: p,
      variant,
      unitMinor,
      compareMinor: Math.max(unitMinor, compareMinor),
    };
  });

  const bundleTotalMinor = resolvedBundleItems.reduce(
    (acc, item) => acc + item.unitMinor,
    0
  );
  const bundleCompareTotalMinor = resolvedBundleItems.reduce(
    (acc, item) => acc + item.compareMinor,
    0
  );

  const handleAddAllClick = () => {
    onAddBundleToCart(
      resolvedBundleItems.map((i) => ({ product: i.product, variant: i.variant }))
    );
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 1600);
  };

  return (
    <section
      id="bundle-builder"
      data-testid="maveno-bundle-builder"
      className="bg-[#FDFCF9] py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.16 }}
        className="max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (6 Cols): Soft Botanical Mint/Celadon Rounded-3xl Visual with Numbered Hotspot Pins 1, 2, 3 */}
          <motion.div variants={staggerCardVariants} className="lg:col-span-6">
            <div className="relative rounded-[28px] overflow-hidden bg-linear-to-br from-[#DCECE2] via-[#EAF4EE] to-[#D2E6DA] border border-[#CFE0D6] p-6 sm:p-8 aspect-4/3 sm:aspect-square flex flex-col justify-between shadow-xs">
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full bg-white/90 text-[#113225] text-xs font-bold shadow-2xs">
                  Save 15% on Complete Set
                </span>
                <span className="text-xs font-extrabold tracking-wider uppercase text-[#113225]">
                  MAVENO EDITION
                </span>
              </div>

              {/* Center Composite Image with Interactive Numbered Pins */}
              <div className="relative my-auto rounded-2xl overflow-hidden aspect-16/11 border-4 border-white/85 shadow-md bg-[#E5EFE9]">
                <img
                  src="/src/assets/images/maveno_editorial_hero_showcase_1794341295701.jpg"
                  alt="Maveno Complete Sovereign Bundle"
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

                {/* Hotspot Pin 1 */}
                {bundleProducts[0] && (
                  <button
                    type="button"
                    onClick={() => onViewProduct(bundleProducts[0])}
                    title={`1. ${bundleProducts[0].name}`}
                    className="absolute top-[26%] left-[24%] w-8 h-8 rounded-full bg-white text-[#113225] border-2 border-[#113225] font-extrabold text-xs shadow-md hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
                  >
                    1
                  </button>
                )}

                {/* Hotspot Pin 2 */}
                {bundleProducts[1] && (
                  <button
                    type="button"
                    onClick={() => onViewProduct(bundleProducts[1])}
                    title={`2. ${bundleProducts[1].name}`}
                    className="absolute top-[48%] left-[54%] w-8 h-8 rounded-full bg-white text-[#113225] border-2 border-[#113225] font-extrabold text-xs shadow-md hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
                  >
                    2
                  </button>
                )}

                {/* Hotspot Pin 3 */}
                {bundleProducts[2] && (
                  <button
                    type="button"
                    onClick={() => onViewProduct(bundleProducts[2])}
                    title={`3. ${bundleProducts[2].name}`}
                    className="absolute bottom-[20%] right-[22%] w-8 h-8 rounded-full bg-white text-[#113225] border-2 border-[#113225] font-extrabold text-xs shadow-md hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
                  >
                    3
                  </button>
                )}
              </div>

              <div className="relative z-10 text-center">
                <p className="text-xs font-semibold text-[#113225]">
                  Click any numbered pin (1–3) to inspect individual specifications
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column (6 Cols): Bundle Title, Numbered Items 1, 2, 3 & "Add All To Cart" Emerald Pill CTA */}
          <motion.div
            variants={staggerContainerVariants}
            className="lg:col-span-6 space-y-6"
          >
            <motion.div variants={staggerItemVariants} className="space-y-2">
              <h2
                className="text-2xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Complete Sovereign Bundle
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Got questions on pairing? Our curated 3-piece bundle combines our flagship CNC chassis, precision rebuildable chamber, and oak-aged botanical reserve for complete day-to-night harmony.
              </p>
            </motion.div>

            {/* Numbered Product Rows (1, 2, 3) */}
            <motion.div variants={staggerContainerVariants} className="space-y-3.5">
              {resolvedBundleItems.map((item, idx) => (
                <motion.div
                  key={item.product.id}
                  variants={staggerItemVariants}
                  data-testid={`bundle-item-row-${idx + 1}`}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#F1F6F3] border border-[#CFE0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#113225]/30 text-[#113225] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <img
                      src={item.variant?.image || item.product.galleryImages[0]}
                      alt={item.product.name}
                      onClick={() => onViewProduct(item.product)}
                      className="w-12 h-12 rounded-xl object-cover bg-white border border-[#CFE0D6] shrink-0 cursor-pointer"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3
                        onClick={() => onViewProduct(item.product)}
                        className="text-xs sm:text-sm font-bold text-neutral-950 hover:text-[#113225] truncate cursor-pointer"
                      >
                        {item.product.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs font-extrabold font-mono-numbers text-neutral-900">
                          {formatMinorUnits(item.unitMinor, currentCurrency)}
                        </span>
                        {item.compareMinor > item.unitMinor && (
                          <span className="text-[11px] font-mono-numbers text-neutral-400 line-through">
                            {formatMinorUnits(item.compareMinor, currentCurrency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variant Dropdown */}
                  <div className="sm:w-44 shrink-0">
                    <select
                      data-testid={`bundle-variant-select-${idx + 1}`}
                      value={item.variant?.id || ''}
                      onChange={(e) =>
                        setSelectedVariants((prev) => ({
                          ...prev,
                          [item.product.id]: e.target.value,
                        }))
                      }
                      aria-label={`Select bundle option for ${item.product.name}`}
                      className="w-full text-xs bg-white border border-[#CFE0D6] rounded-xl px-3 py-2 font-medium text-neutral-800 focus:outline-hidden focus:border-[#113225] cursor-pointer"
                    >
                      {item.product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Bundle Total & Deep Emerald "Add All To Cart" Pill Button */}
            <motion.div variants={staggerItemVariants} className="pt-2 space-y-3">
              <div className="flex items-baseline justify-center sm:justify-start gap-2 text-sm">
                <span className="text-neutral-600 font-medium">Total:</span>
                <span
                  data-testid="bundle-total-price"
                  className="text-base sm:text-lg font-extrabold font-mono-numbers text-neutral-950"
                >
                  from {formatMinorUnits(bundleTotalMinor, currentCurrency)}
                </span>
                {bundleCompareTotalMinor > bundleTotalMinor && (
                  <span className="text-xs sm:text-sm font-mono-numbers text-neutral-400 line-through">
                    {formatMinorUnits(bundleCompareTotalMinor, currentCurrency)}
                  </span>
                )}
              </div>

              <button
                type="button"
                data-testid="bundle-add-all-btn"
                onClick={handleAddAllClick}
                className={`w-full py-4 px-6 rounded-full font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                  bundleAdded
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#113225] hover:bg-[#0B2219] text-white'
                }`}
              >
                {bundleAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>All 3 Bundle Items Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add All To Cart</span>
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 5. "HONEST ANSWERS ABOUT OUR CRAFT" 3-COLUMN BLOG / GUIDES SECTION
// ============================================================================
interface MavenoHonestAnswersBlogProps {
  posts: BlogPost[];
  onOpenBlog: () => void;
}

export const MavenoHonestAnswersBlog: React.FC<MavenoHonestAnswersBlogProps> = ({
  posts,
  onOpenBlog,
}) => {
  const cardImages = [
    '/src/assets/images/product_billet_box_device_1794234138404.jpg',
    '/src/assets/images/product_artisan_atomizer_1794234139169.jpg',
    '/src/assets/images/product_craft_eliquid_1794234137051.jpg',
  ];

  const fallbackArticles = [
    {
      id: 'guide_1',
      date: 'November 10, 2026',
      title: 'First Hardware Setup? Everything You Need to Know About Grade 5 Titanium & DNA60C',
      excerpt:
        'Getting your first regulated billet platform can bring up plenty of technical questions. Here is our complete engineering walkthrough.',
    },
    {
      id: 'guide_2',
      date: 'October 28, 2026',
      title: 'Understanding Rebuildable Airflow Pins: MTL vs. RDL Precision Tuning',
      excerpt:
        'How surgical 316L chamber geometry and gold-plated positive airflow pins shape vapor density and botanical flavor clarity.',
    },
    {
      id: 'guide_3',
      date: 'October 14, 2026',
      title: 'Why 90-Day Charred Oak Barrel Maceration Matters for Pure Botanicals',
      excerpt:
        'Explore why eliminating synthetic sucralose sweeteners preserves coil longevity and delivers a clean, unmistakable finish.',
    },
  ];

  const displayItems = [0, 1, 2].map((idx) => {
    const post = posts[idx];
    const fb = fallbackArticles[idx];
    return {
      id: post?.id || fb.id,
      date: post?.publishedDate || fb.date,
      title: post?.title || fb.title,
      excerpt: post?.excerpt || fb.excerpt,
      image: cardImages[idx],
    };
  });

  return (
    <section
      data-testid="maveno-blog-guides-section"
      className="bg-[#FDFCF9] py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-[#CFE0D6]/60"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="max-w-7xl mx-auto"
      >
        <motion.h2
          variants={staggerItemVariants}
          className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mb-8 sm:mb-10"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Honest answers about our craft
        </motion.h2>

        <motion.div
          variants={staggerContainerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
        >
          {displayItems.map((article) => (
            <motion.article
              key={article.id}
              variants={staggerCardVariants}
              whileHover={{ y: -4 }}
              onClick={onOpenBlog}
              className="group cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3.5">
                <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-[#E5EFE9] border border-[#CFE0D6]">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#113225]/40 via-transparent to-transparent" />
                </div>

                <div className="text-[11px] text-neutral-400 font-medium">
                  {article.date}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-neutral-950 group-hover:text-[#113225] transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                  {article.excerpt}
                </p>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 group-hover:text-[#113225] underline underline-offset-4">
                  <span>Learn More</span>
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 6. DARK LUXURY FEATURE BANNER ("Indulge in precision.") + 4-PILL SERVICE BAR
// ============================================================================
interface MavenoIndulgeDarkBannerProps {
  products: Product[];
  currentCountry: Country;
  currentCurrency: Currency;
  onViewProduct: (product: Product) => void;
}

export const MavenoIndulgeDarkBanner: React.FC<MavenoIndulgeDarkBannerProps> = ({
  products,
  currentCountry,
  currentCurrency,
  onViewProduct,
}) => {
  const spotlight =
    products.find((p) => p.id === 'prod_architek_titan_mod') || products[0];

  const formattedPrice = spotlight
    ? formatMinorUnits(
        resolveProductPrice(spotlight, currentCountry.code, currentCurrency),
        currentCurrency
      )
    : null;

  return (
    <section
      id="visual-break"
      data-testid="maveno-visual-break-section"
      className="bg-[#F1F6F3] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-[#CFE0D6]"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.16 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Rounded-3xl Deep Forest/Bronze Banner */}
        <motion.div
          variants={staggerCardVariants}
          className="relative rounded-[28px] sm:rounded-[34px] overflow-hidden text-white min-h-[360px] sm:min-h-[420px] flex items-center p-8 sm:p-12 lg:p-16 shadow-lg"
          style={{
            background:
              'radial-gradient(circle at 75% 50%, #1c4734 0%, #0d261c 48%, #07140f 100%)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative z-10">
            {/* Left Copy & Antique Brass Pill CTA */}
            <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4b58c] font-semibold">
                ARCHITEK VAPOR · MONOLITH EDITION
              </div>

              <h2
                className="text-3xl sm:text-5xl font-serif italic font-semibold text-white tracking-tight leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Indulge in precision.
              </h2>

              <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto lg:mx-0 leading-relaxed">
                CNC-machined from a solid billet of Grade 5 Titanium with a hand-laid 3K twill carbon fiber inlay. Engineered for zero-latency performance.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                {spotlight && (
                  <button
                    type="button"
                    onClick={() => onViewProduct(spotlight)}
                    className="px-7 py-3 rounded-full bg-[#c8a97e] hover:bg-[#b89668] text-neutral-950 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Discover Titan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {formattedPrice && (
                  <span className="text-xs font-mono-numbers text-[#d4b58c]">
                    Edition Price: <strong>{formattedPrice}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Right Studio Hardware Image */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              <div
                onClick={() => spotlight && onViewProduct(spotlight)}
                className="relative w-full max-w-md aspect-16/10 rounded-2xl overflow-hidden border border-white/15 shadow-2xl cursor-pointer group"
              >
                <img
                  src="/src/assets/images/maveno_visual_break_panorama_1794341297298.jpg"
                  alt="Maveno Indulge in Precision Hardware Showcase"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4 White Pill Service Badges Row Immediately Below Dark Banner */}
        <motion.div
          variants={staggerContainerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2"
        >
          <motion.div
            variants={staggerItemVariants}
            className="bg-white rounded-full py-3.5 px-5 border border-[#CFE0D6] text-center text-xs font-semibold text-neutral-800 shadow-2xs"
          >
            Delivered in 1–2 working days
          </motion.div>
          <motion.div
            variants={staggerItemVariants}
            className="bg-white rounded-full py-3.5 px-5 border border-[#CFE0D6] text-center text-xs font-semibold text-neutral-800 shadow-2xs"
          >
            Cash on delivery across {currentCountry.name}
          </motion.div>
          <motion.div
            variants={staggerItemVariants}
            className="bg-white rounded-full py-3.5 px-5 border border-[#CFE0D6] text-center text-xs font-semibold text-neutral-800 shadow-2xs"
          >
            14-day returns on sealed items
          </motion.div>
          <motion.div
            variants={staggerItemVariants}
            className="bg-white rounded-full py-3.5 px-5 border border-[#CFE0D6] text-center text-xs font-semibold text-neutral-800 shadow-2xs"
          >
            12-month warranty on all devices
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 7. "TRUSTED PARTNERS / AVAILABLE ON" LOGO STRIP
// ============================================================================
export const MavenoTrustedPartners: React.FC = () => {
  const partners = [
    { name: 'PEARL CONCIERGE+', style: 'font-extrabold tracking-tight text-lg sm:text-xl' },
    { name: 'LUSAIL DUTY FREE', style: 'font-serif italic font-bold text-lg sm:text-xl' },
    { name: 'QATAR EXPRESS', style: 'font-black tracking-widest text-base sm:text-lg' },
    { name: 'DOHA GALLERIA', style: 'font-bold tracking-wide text-lg sm:text-xl' },
    { name: 'AL RAYYAN HUB', style: 'font-extrabold tracking-tighter text-lg sm:text-xl' },
  ];

  return (
    <section
      id="trusted-partners"
      data-testid="maveno-trusted-partners"
      className="bg-[#FDFCF9] py-14 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-[#CFE0D6]/60 text-center"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="max-w-6xl mx-auto space-y-3"
      >
        <motion.div
          variants={staggerItemVariants}
          className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400"
        >
          TRUSTED PARTNERS
        </motion.div>
        <motion.h2
          variants={staggerItemVariants}
          className="text-2xl sm:text-3xl font-serif italic text-neutral-900"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Available on
        </motion.h2>
        <motion.p
          variants={staggerItemVariants}
          className="text-xs text-neutral-500 max-w-md mx-auto"
        >
          Shop authentic Maveno releases on Qatar&rsquo;s premier luxury retail &amp; express courier networks
        </motion.p>

        <motion.div
          variants={staggerContainerVariants}
          className="pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-center justify-items-center"
        >
          {partners.map((p) => (
            <motion.div
              key={p.name}
              variants={staggerItemVariants}
              className={`${p.style} text-[#113225]/80 hover:text-[#113225] transition-colors select-none`}
            >
              {p.name}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 8. "BORN FROM A VISION, BUILT FOR EVERY CONNOISSEUR" 2-COLUMN BRAND STORY
// ============================================================================
interface MavenoBrandStoryProps {
  settings: StoreSettings;
  currentCountry: Country;
  onExploreShop: () => void;
  onOpenCompliance: () => void;
}

export const MavenoBrandStory: React.FC<MavenoBrandStoryProps> = ({
  settings,
  currentCountry,
  onExploreShop,
  onOpenCompliance,
}) => {
  return (
    <section
      id="brand-story"
      data-testid="maveno-brand-story-section"
      className="bg-[#FDFCF9] py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (6 Cols): Centered Editorial Narrative */}
          <motion.div
            variants={staggerItemVariants}
            className="lg:col-span-6 text-center px-2 sm:px-8 space-y-4"
          >
            <div className="text-xs sm:text-sm font-medium text-neutral-600">
              Born From A Vision,
            </div>

            <h2
              data-testid="brand-story-heading"
              className="text-2xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight leading-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Built for Every Connoisseur
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
              What started as an independent engineering studio in Doha has grown into a sovereign collective redefining precision hardware and botanical craft. Every {settings.storeName} piece is serialized, batch-certified, and fulfilled with mandatory {currentCountry.minimumAge}+ adult verification.
            </p>

            <div className="pt-2 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={onExploreShop}
                className="text-xs sm:text-sm font-bold text-neutral-950 hover:text-[#113225] underline underline-offset-4 cursor-pointer"
              >
                Explore Our Story
              </button>

              <button
                type="button"
                onClick={onOpenCompliance}
                className="text-xs sm:text-sm font-semibold text-neutral-500 hover:text-[#113225] underline underline-offset-4 cursor-pointer"
              >
                Compliance Charter ({currentCountry.minimumAge}+)
              </button>
            </div>
          </motion.div>

          {/* Right Column (6 Cols): Soft Botanical Sage Rounded-3xl Image Card */}
          <motion.div variants={staggerCardVariants} className="lg:col-span-6">
            <div className="relative rounded-[28px] overflow-hidden bg-[#D0E6D9] border border-[#CFE0D6] p-4 sm:p-6 aspect-4/3 shadow-xs">
              <img
                src="/src/assets/images/maveno_brand_story_atelier_1794341297553.jpg"
                alt="Maveno Engineering Atelier and Precision Craftsmanship"
                className="w-full h-full object-cover object-center rounded-2xl"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// 9. "YOUR QUESTIONS, ANSWERED" INTERACTIVE FAQ SECTION + EMERALD SUPPORT CARD
// ============================================================================
interface MavenoFaqSectionProps {
  settings: StoreSettings;
  currentCountry: Country;
  onOpenCompliance: () => void;
}

export const MavenoFaqSection: React.FC<MavenoFaqSectionProps> = ({
  settings,
  currentCountry,
  onOpenCompliance,
}) => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [
    {
      num: '01',
      question: 'Are Maveno hardware platforms and botanical extracts 100% authentic?',
      answer: `Yes. Every device and botanical formulation is sourced directly from our specialist houses in Stuttgart, Basel, Somerset, and Oregon. All items carry serialized batch authentication and are inspected at our Pearl-Qatar hub prior to dispatch.`,
    },
    {
      num: '02',
      question: `How fast is delivery across ${currentCountry.name} and how does age verification work?`,
      answer: `Orders placed before 4:00 PM AST qualify for same-day courier dispatch across Doha, Lusail, and Al Rayyan via ${settings.defaultShippingCarrier}. In accordance with ${currentCountry.name} regulations, our courier verifies valid ${currentCountry.minimumAge}+ government ID upon handover.`,
    },
    {
      num: '03',
      question: 'Which rebuildable atomizers fit the Monolith Boro and Architek Titan mods?',
      answer:
        'The Architek Titan DNA60C accepts all standard 510 rebuildable atomizers up to 25mm in diameter without overhang (including the Aeterna Solo RTA). The Monolith Boro Box is compatible with all standard Boro tanks and integrated RBA bridges.',
    },
    {
      num: '04',
      question: 'What is your return policy and 12-month hardware warranty coverage?',
      answer:
        settings.refundPolicyText ||
        'Unopened, factory-sealed hardware may be returned within 14 days of delivery. All regulated CNC mods include a 12-month manufacturer warranty covering chipset and machining defects.',
    },
  ];

  return (
    <section
      id="faq-section"
      data-testid="maveno-faq-section"
      className="bg-[#FDFCF9] py-12 sm:py-20 px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.16 }}
        className="max-w-7xl mx-auto rounded-[28px] sm:rounded-[34px] bg-[#F1F6F3] border border-[#CFE0D6] p-6 sm:p-10 lg:p-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column (5 Cols): "• FAQ" Pill, Heading & Deep Emerald Support Card */}
          <motion.div variants={staggerItemVariants} className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#CFE0D6] text-[11px] font-bold text-[#113225]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#113225]" />
                <span>FAQ</span>
              </span>

              <h2
                className="text-2xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight leading-tight"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Your questions,
                <br />
                answered
              </h2>

              <p className="text-xs sm:text-sm text-neutral-600">
                Here you can find detailed information about our hardware, shipping, and regulatory standards.
              </p>
            </div>

            {/* Deep Emerald Support Card ("Still have a question?") */}
            <div className="rounded-2xl bg-[#113225] text-white p-6 space-y-4 shadow-md">
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Still have a question?
                </h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  Our Doha concierge team is here for you! Reach out on WhatsApp or view our compliance guides anytime.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onOpenCompliance}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-[#E5EFE9] text-[#113225] text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat with Concierge →</span>
                </button>
                <span className="text-[11px] font-mono-numbers text-white/75">
                  {settings.contactPhone}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column (7 Cols): Numbered 01–04 Expandable FAQ Accordions */}
          <motion.div
            variants={staggerContainerVariants}
            className="lg:col-span-7 space-y-3.5"
          >
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <motion.div
                  key={faq.num}
                  variants={staggerItemVariants}
                  data-testid={`faq-item-${faq.num}`}
                  className="rounded-2xl bg-white border border-[#CFE0D6] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#113225] text-white font-bold text-xs font-mono-numbers flex items-center justify-center shrink-0">
                        {faq.num}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-neutral-950 leading-snug">
                        {faq.question}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#113225]' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 pl-16 text-xs text-neutral-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// LEGACY COMPATIBILITY EXPORTS
// ============================================================================
export const MavenoVisualBreak = MavenoIndulgeDarkBanner;
export const MavenoProductDiscovery: React.FC<any> = () => null;
export const MavenoTrustInformation: React.FC<any> = () => null;
export const MavenoNewsletterSection: React.FC<{
  settings: StoreSettings;
  currentCountry: Country;
  onSubscribed?: () => void;
}> = ({ settings, currentCountry, onSubscribed }) => {
  const [emailInput, setEmailInput] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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
    <section
      id="newsletter"
      data-testid="maveno-newsletter-section"
      className="bg-[#F1F6F3] py-12 px-4 sm:px-6 lg:px-8 border-t border-[#CFE0D6]"
    >
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h2
          data-testid="newsletter-heading"
          className="text-2xl sm:text-3xl font-extrabold text-neutral-950"
        >
          Subscribe to our emails
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600">
          Receive early access to serialized {settings.storeName} releases and private dispatches ({currentCountry.minimumAge}+).
        </p>
        <form onSubmit={handleSubmit} noValidate className="max-w-md mx-auto space-y-2.5">
          <div className="flex items-center bg-white rounded-full border border-[#CFE0D6] p-1.5 shadow-2xs">
            <input
              type="email"
              data-testid="newsletter-email-input"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (feedback) setFeedback(null);
              }}
              placeholder="Enter your email..."
              className="grow px-4 py-2 text-xs sm:text-sm bg-transparent text-neutral-900 focus:outline-hidden"
            />
            <button
              type="submit"
              data-testid="newsletter-submit-btn"
              className="px-5 py-2 rounded-full bg-[#113225] hover:bg-[#0B2219] text-white text-xs font-bold cursor-pointer"
            >
              Subscribe
            </button>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] text-neutral-500 cursor-pointer">
            <input
              type="checkbox"
              data-testid="newsletter-consent-checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="accent-[#113225] rounded"
            />
            <span>I confirm I am {currentCountry.minimumAge}+ and agree to the Privacy Policy.</span>
          </label>
          {feedback && (
            <div
              data-testid="newsletter-feedback"
              role="status"
              className={`p-2.5 rounded-xl text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
};
