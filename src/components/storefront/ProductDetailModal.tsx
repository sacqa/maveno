import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Check,
  Truck,
  Info,
  Zap,
} from 'lucide-react';
import { Product, ProductVariant, Country, Currency } from '../../types/ecommerce';
import {
  resolveProductPrice,
  formatMinorUnits,
  validateCountryEligibility,
} from '../../utils/commerce-engine';

interface ProductDetailModalProps {
  product: Product | null;
  currentCountry: Country;
  currentCurrency: Currency;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  onBuyNow?: (product: Product, variant: ProductVariant, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currentCountry,
  currentCurrency,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0] || null);
      setQuantity(1);
      setActiveImage(product.variants[0]?.image || product.galleryImages[0] || '');
    }
  }, [product]);

  if (!product) return null;

  const activeVar = selectedVariant || product.variants[0];
  const unitPriceMinor = resolveProductPrice(
    product,
    currentCountry.code,
    currentCurrency,
    1.0,
    activeVar
  );
  const formattedUnitPrice = formatMinorUnits(unitPriceMinor, currentCurrency);
  const formattedTotalPrice = formatMinorUnits(unitPriceMinor * quantity, currentCurrency);

  const eligibility = validateCountryEligibility(currentCountry);
  const isProductRestrictedInCountry = (product.restrictedCountries || []).includes(
    currentCountry.code
  );
  const canPurchase = eligibility.isEligible && !isProductRestrictedInCountry;
  const isVariantAvailable =
    product.continueSellingWhenOutOfStock || (activeVar?.stockQuantity || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-neutral-100 text-neutral-700 shadow-md transition-colors cursor-pointer"
          aria-label="Close product detail view"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Gallery */}
          <div className="bg-neutral-100 p-6 flex flex-col justify-between">
            <div className="aspect-square rounded-xl overflow-hidden bg-white shadow-inner border border-neutral-200/60">
              <img
                src={activeImage || product.galleryImages[0]}
                alt={product.name}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </div>

            {product.galleryImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {product.galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImage === imgUrl
                        ? 'border-amber-700 scale-105 shadow-xs'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Compliance Declaration Box */}
            <div className="mt-6 p-3.5 rounded-xl bg-neutral-900 text-neutral-300 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Regulatory &amp; Age Compliance</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {product.complianceWarning}
              </p>
              <div className="pt-1 text-[10px] text-neutral-400 font-mono-numbers flex items-center justify-between border-t border-neutral-800">
                <span>Jurisdiction: {currentCountry.name}</span>
                <span>Required Age: {currentCountry.minimumAge}+ Verified</span>
              </div>
            </div>
          </div>

          {/* Right: Specifications, Variant Selection & Purchase */}
          <div className="p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-800">
                  <span>{product.brand}</span>
                  <span>•</span>
                  <span className="font-mono-numbers text-neutral-500">
                    SKU: {activeVar?.sku || product.sku}
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-bold font-display text-neutral-900 leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Price Display */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-neutral-500 block">
                    Unit Price ({currentCountry.name} / {currentCurrency.code})
                  </span>
                  <span
                    data-testid="modal-unit-price"
                    className="text-2xl font-bold font-mono-numbers text-neutral-900"
                  >
                    {formattedUnitPrice}
                  </span>
                </div>
                <div className="text-right text-[11px] text-neutral-500">
                  <div>Excl. {Math.round(currentCountry.standardTaxRate * 100)}% Tax</div>
                  {currentCountry.customsDutyRate > 0 && (
                    <div>+{Math.round(currentCountry.customsDutyRate * 100)}% Import Duty</div>
                  )}
                </div>
              </div>

              {/* Full Description */}
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {product.fullDescription}
              </p>

              {/* Variant Selector */}
              {product.variants.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Select Configuration / Variant ({product.variants.length})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = activeVar?.id === variant.id;
                      const varPrice = formatMinorUnits(
                        resolveProductPrice(
                          product,
                          currentCountry.code,
                          currentCurrency,
                          1.0,
                          variant
                        ),
                        currentCurrency
                      );
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          data-testid={`modal-variant-btn-${variant.id}`}
                          onClick={() => {
                            setSelectedVariant(variant);
                            if (variant.image) setActiveImage(variant.image);
                          }}
                          className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate">{variant.title}</div>
                            <div
                              className={`text-[10px] font-mono-numbers ${
                                isSelected ? 'text-amber-300' : 'text-neutral-500'
                              }`}
                            >
                              {varPrice} · {variant.stockQuantity} avail
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Technical Specifications Table */}
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2 rounded-md bg-neutral-50 border border-neutral-100"
                    >
                      <span className="text-neutral-400 block text-[10px] uppercase">{key}</span>
                      <span className="font-medium text-neutral-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Purchase Action */}
            <div className="mt-6 pt-5 border-t border-neutral-200 space-y-3">
              {canPurchase ? (
                <>
                  <div className="flex items-center gap-3">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-neutral-300 rounded-lg">
                      <button
                        type="button"
                        data-testid="modal-qty-dec"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span
                        data-testid="modal-qty-val"
                        className="px-3 py-2.5 text-xs font-mono-numbers font-semibold"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        data-testid="modal-qty-inc"
                        onClick={() =>
                          setQuantity(
                            product.continueSellingWhenOutOfStock
                              ? quantity + 1
                              : Math.min(activeVar?.stockQuantity || 10, quantity + 1)
                          )
                        }
                        className="px-3 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      data-testid="modal-add-to-cart-btn"
                      disabled={!isVariantAvailable}
                      onClick={() => {
                        if (activeVar) {
                          onAddToCart(product, activeVar, quantity);
                        }
                      }}
                      className="grow py-3 px-5 rounded-lg bg-neutral-900 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart • {formattedTotalPrice}</span>
                    </button>
                  </div>

                  {/* Direct Buy It Now Button (Shopify Express Checkout) */}
                  {onBuyNow && isVariantAvailable && (
                    <button
                      type="button"
                      data-testid="modal-buy-now-btn"
                      onClick={() => {
                        if (activeVar) {
                          onBuyNow(product, activeVar, quantity);
                        }
                      }}
                      className="w-full py-2.5 px-5 rounded-lg bg-[#8a1538] hover:bg-[#70112d] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Buy It Now — Instant Express Checkout</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ships to {currentCountry.name} (Adult Signature Required)</span>
                    </span>
                    <span className="font-mono-numbers">
                      {activeVar?.stockQuantity} units available
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Lock className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Purchase Disabled for {currentCountry.name}</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    {isProductRestrictedInCountry
                      ? `This specific item (${product.name}) is restricted from importation or sale in ${currentCountry.name} under national regulations.`
                      : eligibility.reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
