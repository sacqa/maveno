import React, { useState } from 'react';
import { ShoppingBag, Lock, Eye, Check, Plus, Minus, Star } from 'lucide-react';
import { Product, ProductVariant, Country, Currency } from '../../types/ecommerce';
import {
  resolveProductPrice,
  formatMinorUnits,
  validateCountryEligibility,
} from '../../utils/commerce-engine';

interface ProductCardProps {
  product: Product;
  currentCountry: Country;
  currentCurrency: Currency;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currentCountry,
  currentCurrency,
  onViewProduct,
  onAddToCart,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const unitPriceMinor = resolveProductPrice(
    product,
    currentCountry.code,
    currentCurrency,
    1.0,
    selectedVariant
  );
  const formattedPrice = formatMinorUnits(unitPriceMinor, currentCurrency);

  // Calculate compare-at price and discount percentage badge
  const rawCompareMinor =
    selectedVariant?.compareAtPriceMinorUnits ||
    product.compareAtPriceMinorUnits ||
    Math.round((selectedVariant?.priceMinorUnits || product.basePriceMinorUnits) * 1.18);

  const comparePriceMinor = Math.round(
    rawCompareMinor * currentCurrency.exchangeRateToBase
  );
  const hasDiscount = comparePriceMinor > unitPriceMinor;
  const discountPercent = hasDiscount
    ? Math.max(
        5,
        Math.min(
          50,
          Math.round(((comparePriceMinor - unitPriceMinor) / comparePriceMinor) * 100)
        )
      )
    : 15;
  const formattedComparePrice = formatMinorUnits(comparePriceMinor, currentCurrency);

  const eligibility = validateCountryEligibility(currentCountry);
  const isProductRestrictedInCountry = (product.restrictedCountries || []).includes(
    currentCountry.code
  );
  const canPurchase = eligibility.isEligible && !isProductRestrictedInCountry;

  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
  const variantStock = selectedVariant ? selectedVariant.stockQuantity : totalStock;
  const isVariantAvailable =
    product.continueSellingWhenOutOfStock || variantStock > 0;

  const reviewCount = Math.max(24, (product.salesCount || 42) * 2);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPurchase || !isVariantAvailable) return;
    onAddToCart(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group bg-white rounded-2xl flex flex-col justify-between transition-all duration-200"
    >
      {/* Top Soft Botanical Celadon Square Image Frame */}
      <div>
        <div
          onClick={() => onViewProduct(product)}
          className="relative aspect-square w-full rounded-2xl bg-[#E5EFE9] overflow-hidden cursor-pointer border border-[#CFE0D6]"
        >
          <img
            src={selectedVariant?.image || product.galleryImages[0]}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Top-Left Deep Emerald Discount Pill Badge (-15%) */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#113225] text-white text-[11px] font-bold tracking-tight shadow-xs">
              -{discountPercent}%
            </span>
          </div>

          {/* Quick View Hover Overlay */}
          <div className="absolute inset-0 bg-[#113225]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="px-4 py-2 rounded-full bg-white/95 text-[#113225] text-xs font-semibold shadow-sm flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </span>
          </div>
        </div>

        {/* Clean Product Details Below Image */}
        <div className="pt-3.5 px-1">
          <h3
            onClick={() => onViewProduct(product)}
            className="text-sm sm:text-[15px] font-bold text-neutral-950 group-hover:text-[#113225] transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>

          <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
            {product.shortDescription}
          </p>

          {/* Star Rating Row (★ 4.8 (98)) */}
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1 text-neutral-800 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>4.8</span>
              <span className="text-neutral-400 font-normal">({reviewCount})</span>
            </div>
            <span className="text-neutral-300">·</span>
            <span className="text-[11px] text-neutral-500 truncate">
              {product.variants.length}{' '}
              {product.variants.length === 1 ? 'edition' : 'options'}
            </span>
          </div>

          {/* Price Row: "From QAR ... + Strikethrough Compare Price" */}
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span
              data-testid={`card-price-${product.id}`}
              className="text-sm sm:text-[15px] font-extrabold font-mono-numbers text-neutral-950"
            >
              From {formattedPrice}
            </span>
            {hasDiscount && (
              <span className="text-xs font-mono-numbers text-neutral-400 line-through">
                {formattedComparePrice}
              </span>
            )}
          </div>

          {/* Compact Variant & Quantity Selector */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 space-y-2">
            {product.variants.length > 1 ? (
              <select
                data-testid={`card-variant-select-${product.id}`}
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedVariantId(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select variant for ${product.name}`}
                className="w-full text-xs bg-[#F1F6F3] border border-[#CFE0D6] rounded-lg px-2.5 py-1.5 font-medium text-neutral-800 focus:outline-hidden focus:border-[#113225] cursor-pointer"
              >
                {product.variants.map((v) => {
                  const vPrice = formatMinorUnits(
                    resolveProductPrice(
                      product,
                      currentCountry.code,
                      currentCurrency,
                      1.0,
                      v
                    ),
                    currentCurrency
                  );
                  const outOfStock =
                    !product.continueSellingWhenOutOfStock && v.stockQuantity <= 0;
                  return (
                    <option key={v.id} value={v.id} disabled={outOfStock}>
                      {v.title} — {vPrice}{' '}
                      {outOfStock ? '(Out of Stock)' : `(${v.stockQuantity} in stock)`}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="truncate">
                  {selectedVariant?.title || 'Standard Edition'}
                </span>
                <span className="text-neutral-600 font-medium shrink-0">
                  {variantStock > 0 ? `${variantStock} in stock` : 'Backorder'}
                </span>
              </div>
            )}

            {/* Quantity & Add to Cart Row */}
            <div className="flex items-center gap-2 pt-0.5">
              <div
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center border border-[#CFE0D6] rounded-full bg-[#F1F6F3] shrink-0"
              >
                <button
                  type="button"
                  data-testid={`card-qty-dec-${product.id}`}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 text-neutral-600 hover:text-neutral-950 disabled:opacity-40 cursor-pointer"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span
                  data-testid={`card-qty-val-${product.id}`}
                  className="px-2 text-xs font-mono-numbers font-semibold text-neutral-900"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  data-testid={`card-qty-inc-${product.id}`}
                  onClick={() =>
                    setQuantity((q) =>
                      product.continueSellingWhenOutOfStock
                        ? q + 1
                        : Math.min(Math.max(1, variantStock), q + 1)
                    )
                  }
                  className="p-1.5 text-neutral-600 hover:text-neutral-950 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {canPurchase ? (
                <button
                  type="button"
                  data-testid={`add-to-cart-btn-${product.id}`}
                  onClick={handleAddClick}
                  disabled={!isVariantAvailable}
                  className={`grow py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                    justAdded
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#113225] hover:bg-[#0B2219] text-white'
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        {isVariantAvailable
                          ? quantity > 1
                            ? `Add (${quantity})`
                            : 'Add to Cart'
                          : 'Out of Stock'}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="grow py-2 px-2.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-500 text-[11px] flex items-center justify-center gap-1 text-center">
                  <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span className="truncate">Restricted ({currentCountry.code})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
