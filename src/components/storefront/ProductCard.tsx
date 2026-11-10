import React, { useState } from 'react';
import { ShoppingBag, Lock, AlertCircle, CheckCircle2, Eye, Check, Plus, Minus } from 'lucide-react';
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

  const eligibility = validateCountryEligibility(currentCountry);
  const isProductRestrictedInCountry = (product.restrictedCountries || []).includes(
    currentCountry.code
  );
  const canPurchase = eligibility.isEligible && !isProductRestrictedInCountry;

  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
  const variantStock = selectedVariant ? selectedVariant.stockQuantity : totalStock;
  const isVariantAvailable =
    product.continueSellingWhenOutOfStock || variantStock > 0;

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
      className="group bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      {/* Top Image & Quick Badges */}
      <div>
        <div
          onClick={() => onViewProduct(product)}
          className="relative aspect-square w-full bg-neutral-100 overflow-hidden cursor-pointer"
        >
          <img
            src={selectedVariant?.image || product.galleryImages[0]}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Top Left Badges (Max 1 data point for clean card density) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.productType === 'botanical_eliquid' && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-900/90 text-white backdrop-blur-xs">
                Botanical Reserve
              </span>
            )}
            {product.productType === 'hardware_mod' && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-950/90 text-amber-200 backdrop-blur-xs">
                CNC Hardware
              </span>
            )}
          </div>

          {/* Quick View Trigger */}
          <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-3.5 py-2 rounded-lg bg-white/95 text-neutral-900 text-xs font-semibold shadow-md flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Quick Inspect</span>
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium uppercase tracking-wider mb-1">
            <span>{product.brand}</span>
            <span className="font-mono-numbers text-neutral-400">
              {selectedVariant?.sku || product.sku}
            </span>
          </div>

          <h3
            onClick={() => onViewProduct(product)}
            className="text-base font-bold text-neutral-900 group-hover:text-amber-800 transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>

          <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Inline Variant & Quantity Selection */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 space-y-2">
            {product.variants.length > 1 ? (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Option ({product.variants.length} Variants)
                </label>
                <select
                  data-testid={`card-variant-select-${product.id}`}
                  value={selectedVariant?.id || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedVariantId(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select variant for ${product.name}`}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-medium text-neutral-800 focus:outline-hidden focus:border-neutral-900 cursor-pointer"
                >
                  {product.variants.map((v) => {
                    const vPrice = formatMinorUnits(
                      resolveProductPrice(product, currentCountry.code, currentCurrency, 1.0, v),
                      currentCurrency
                    );
                    const outOfStock = !product.continueSellingWhenOutOfStock && v.stockQuantity <= 0;
                    return (
                      <option key={v.id} value={v.id} disabled={outOfStock}>
                        {v.title} — {vPrice} {outOfStock ? '(Out of Stock)' : `(${v.stockQuantity} in stock)`}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="truncate">{selectedVariant?.title || 'Standard Edition'}</span>
                <span className="text-emerald-700 font-medium shrink-0">
                  {variantStock > 0 ? `${variantStock} in stock` : 'Backorder'}
                </span>
              </div>
            )}

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Quantity
              </span>
              <div
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center border border-neutral-200 rounded-lg bg-neutral-50"
              >
                <button
                  type="button"
                  data-testid={`card-qty-dec-${product.id}`}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-40 cursor-pointer"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span
                  data-testid={`card-qty-val-${product.id}`}
                  className="px-2.5 text-xs font-mono-numbers font-bold text-neutral-900"
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
                  className="p-1 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Price & Action */}
      <div className="px-4 pb-4 pt-2 border-t border-neutral-100 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase block">
              {currentCountry.code} Price
            </span>
            <span
              data-testid={`card-price-${product.id}`}
              className="text-lg font-bold font-mono-numbers text-neutral-900"
            >
              {formattedPrice}
            </span>
          </div>

          <div className="text-right">
            {canPurchase && isVariantAvailable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                <span>In Stock ({variantStock})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>{!canPurchase ? 'Restricted' : 'Sold Out'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Purchase Button or Restriction Notice */}
        {canPurchase ? (
          <button
            type="button"
            data-testid={`add-to-cart-btn-${product.id}`}
            onClick={handleAddClick}
            disabled={!isVariantAvailable}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              justAdded
                ? 'bg-emerald-700 text-white'
                : 'bg-neutral-900 hover:bg-amber-800 text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>
                  {isVariantAvailable
                    ? quantity > 1
                      ? `Add ${quantity} to Cart`
                      : 'Add to Cart'
                    : 'Out of Stock'}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-2 px-3 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-500 text-[11px] flex items-center justify-center gap-1.5 text-center">
            <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">
              {isProductRestrictedInCountry
                ? `Prohibited in ${currentCountry.code}`
                : `Sales Disabled (${currentCountry.code})`}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};
