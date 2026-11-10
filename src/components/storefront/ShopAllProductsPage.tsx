import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  Category,
  ProductCollection,
  Country,
  Currency,
} from '../../types/ecommerce';
import {
  resolveProductPrice,
  evaluateAutomatedCollection,
} from '../../utils/commerce-engine';
import { ProductCard } from './ProductCard';

export type ShopSortOption =
  | 'featured'
  | 'newest'
  | 'best_selling'
  | 'price_asc'
  | 'price_desc';

interface ShopAllProductsPageProps {
  products: Product[];
  categories: Category[];
  collections: ProductCollection[];
  currentCountry: Country;
  currentCurrency: Currency;
  defaultProductsPerPage?: number;
  initialCategory?: string;
  initialSearchQuery?: string;
  onBackToHome: () => void;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

// Helper to extract sizes from product fields, attributes, and variants
export function extractProductSizes(product: Product): string[] {
  const set = new Set<string>();
  if (Array.isArray(product.sizes)) {
    product.sizes.forEach(s => s && set.add(s.trim()));
  }
  product.attributes?.forEach(attr => {
    if (/size|diameter|volume|capacity|format|deck/i.test(attr.name)) {
      attr.values.forEach(v => v && set.add(v.trim()));
    }
  });
  product.variants?.forEach(v => {
    Object.entries(v.attributes || {}).forEach(([k, val]) => {
      if (/size|diameter|volume|capacity|format|deck/i.test(k) && val) {
        set.add(val.trim());
      }
    });
  });
  return Array.from(set);
}

// Helper to extract colors/finishes from product fields, attributes, and variants
export function extractProductColors(product: Product): string[] {
  const set = new Set<string>();
  if (Array.isArray(product.colors)) {
    product.colors.forEach(c => c && set.add(c.trim()));
  }
  product.attributes?.forEach(attr => {
    if (/color|colour|finish|tint|anodized|chassis/i.test(attr.name)) {
      attr.values.forEach(v => v && set.add(v.trim()));
    }
  });
  product.variants?.forEach(v => {
    Object.entries(v.attributes || {}).forEach(([k, val]) => {
      if (/color|colour|finish|tint|anodized|chassis/i.test(k) && val) {
        set.add(val.trim());
      }
    });
  });
  return Array.from(set);
}

export const ShopAllProductsPage: React.FC<ShopAllProductsPageProps> = ({
  products,
  categories,
  collections,
  currentCountry,
  currentCurrency,
  defaultProductsPerPage = 8,
  initialCategory = 'all',
  initialSearchQuery = '',
  onBackToHome,
  onViewProduct,
  onAddToCart,
}) => {
  // Only active/published products appear on the customer-facing Shop page
  const publishedProducts = useMemo(
    () => products.filter(p => p.status === 'published'),
    [products]
  );

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<ShopSortOption>('newest');

  // Pagination & Load More States
  const [itemsPerPage, setItemsPerPage] = useState<number>(defaultProductsPerPage || 8);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadedPagesCount, setLoadedPagesCount] = useState<number>(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Sync initial props if they change from header navigation
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Reset pagination to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
    setLoadedPagesCount(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedCollectionId,
    availabilityFilter,
    minPriceInput,
    maxPriceInput,
    selectedSizes,
    selectedColors,
    sortBy,
    itemsPerPage,
  ]);

  // All available sizes & colors across published catalog
  const allAvailableSizes = useMemo(() => {
    const s = new Set<string>();
    publishedProducts.forEach(p => extractProductSizes(p).forEach(sz => s.add(sz)));
    return Array.from(s);
  }, [publishedProducts]);

  const allAvailableColors = useMemo(() => {
    const c = new Set<string>();
    publishedProducts.forEach(p => extractProductColors(p).forEach(cl => c.add(cl)));
    return Array.from(c);
  }, [publishedProducts]);

  // Match helper for a collection
  const doesProductMatchCollection = (product: Product, collection: ProductCollection): boolean => {
    if (collection.type === 'automated') {
      return evaluateAutomatedCollection(product, collection.conditions);
    }
    return (
      collection.productIds.includes(product.id) ||
      Boolean(product.collectionIds?.includes(collection.id))
    );
  };

  // Filtered and Sorted Products
  const filteredAndSortedProducts = useMemo(() => {
    const minPriceMajor = minPriceInput.trim() !== '' ? parseFloat(minPriceInput) : null;
    const maxPriceMajor = maxPriceInput.trim() !== '' ? parseFloat(maxPriceInput) : null;

    const list = publishedProducts.filter(product => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          product.name.toLowerCase().includes(q) ||
          product.brand.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          product.shortDescription.toLowerCase().includes(q) ||
          (product.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (product.seoKeywords || []).some(k => k.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }

      // 3. Collection
      if (selectedCollectionId !== 'all') {
        const col = collections.find(c => c.id === selectedCollectionId);
        if (col && !doesProductMatchCollection(product, col)) {
          return false;
        }
      }

      // 4. Availability
      const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      if (availabilityFilter === 'in_stock' && totalStock <= 0) return false;
      if (availabilityFilter === 'out_of_stock' && totalStock > 0) return false;

      // 5. Price Range (in currentCurrency major units)
      const priceMinor = resolveProductPrice(product, currentCountry.code, currentCurrency);
      const priceMajor = priceMinor / Math.pow(10, currentCurrency.decimalPrecision || 2);
      if (minPriceMajor !== null && !isNaN(minPriceMajor) && priceMajor < minPriceMajor) {
        return false;
      }
      if (maxPriceMajor !== null && !isNaN(maxPriceMajor) && priceMajor > maxPriceMajor) {
        return false;
      }

      // 6. Size filter
      if (selectedSizes.length > 0) {
        const prodSizes = extractProductSizes(product).map(s => s.toLowerCase());
        const hasMatchingSize = selectedSizes.some(sel =>
          prodSizes.includes(sel.toLowerCase())
        );
        if (!hasMatchingSize) return false;
      }

      // 7. Color filter
      if (selectedColors.length > 0) {
        const prodColors = extractProductColors(product).map(c => c.toLowerCase());
        const hasMatchingColor = selectedColors.some(sel =>
          prodColors.includes(sel.toLowerCase())
        );
        if (!hasMatchingColor) return false;
      }

      return true;
    });

    // Sorting
    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort(
        (a, b) =>
          resolveProductPrice(a, currentCountry.code, currentCurrency) -
          resolveProductPrice(b, currentCountry.code, currentCurrency)
      );
    } else if (sortBy === 'price_desc') {
      sorted.sort(
        (a, b) =>
          resolveProductPrice(b, currentCountry.code, currentCurrency) -
          resolveProductPrice(a, currentCountry.code, currentCurrency)
      );
    } else if (sortBy === 'best_selling') {
      sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    } else if (sortBy === 'featured') {
      sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }

    return sorted;
  }, [
    publishedProducts,
    searchQuery,
    selectedCategory,
    selectedCollectionId,
    collections,
    availabilityFilter,
    minPriceInput,
    maxPriceInput,
    selectedSizes,
    selectedColors,
    sortBy,
    currentCountry.code,
    currentCurrency,
  ]);

  // Pagination slice calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // If customer clicked "Load More", we show from start of currentPage through loadedPagesCount
  const sliceStart = (safeCurrentPage - 1) * itemsPerPage;
  const sliceEnd = sliceStart + loadedPagesCount * itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(sliceStart, sliceEnd);
  const hasMoreToLoad = sliceEnd < filteredAndSortedProducts.length;

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCollectionId('all');
    setAvailabilityFilter('all');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSelectedSizes([]);
    setSelectedColors([]);
    setSortBy('newest');
  };

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedCollectionId !== 'all' ? 1 : 0) +
    (availabilityFilter !== 'all' ? 1 : 0) +
    (minPriceInput.trim() || maxPriceInput.trim() ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length;

  const renderFilterSidebarContent = () => (
    <div className="space-y-6 text-xs">
      {/* Filter Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2 font-bold text-neutral-900 uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-[#8a1538]" />
          <span>Catalog Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#8a1538] text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            data-testid="shop-clear-all-filters-btn"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-[#8a1538] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      <div className="space-y-2">
        <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
          Category
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <span>All Categories</span>
            <span className="text-[11px] opacity-75 font-mono">{publishedProducts.length}</span>
          </button>
          {categories.map(cat => {
            const count = publishedProducts.filter(p => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`shop-filter-category-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-[11px] opacity-75 font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Collection Filter */}
      <div className="space-y-2 border-t border-neutral-200 pt-4">
        <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
          Curated Collection
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedCollectionId('all')}
            className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
              selectedCollectionId === 'all'
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <span>All Collections</span>
          </button>
          {collections
            .filter(c => c.status === 'active')
            .map(col => {
              const count = publishedProducts.filter(p =>
                doesProductMatchCollection(p, col)
              ).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  data-testid={`shop-filter-collection-${col.handle}`}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCollectionId === col.id
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate">{col.title}</span>
                  <span className="text-[11px] opacity-75 font-mono">{count}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* 3. Availability Filter */}
      <div className="space-y-2 border-t border-neutral-200 pt-4">
        <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
          Stock Availability
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'in_stock', label: 'In Stock' },
            { id: 'out_of_stock', label: 'Backorder' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              data-testid={`shop-filter-availability-${opt.id}`}
              onClick={() => setAvailabilityFilter(opt.id as typeof availabilityFilter)}
              className={`px-2.5 py-2 rounded-lg text-center font-semibold border transition-colors cursor-pointer ${
                availabilityFilter === opt.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Price Range Filter */}
      <div className="space-y-2.5 border-t border-neutral-200 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
            Price Range ({currentCurrency.code})
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">
              Min ({currentCurrency.code})
            </label>
            <input
              type="number"
              min={0}
              data-testid="shop-filter-min-price"
              value={minPriceInput}
              onChange={e => setMinPriceInput(e.target.value)}
              placeholder="0"
              className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">
              Max ({currentCurrency.code})
            </label>
            <input
              type="number"
              min={0}
              data-testid="shop-filter-max-price"
              value={maxPriceInput}
              onChange={e => setMaxPriceInput(e.target.value)}
              placeholder="2500"
              className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: 'Under 200', min: '', max: '200' },
            { label: '200 – 600', min: '200', max: '600' },
            { label: '600+', min: '600', max: '' },
          ].map(range => (
            <button
              key={range.label}
              type="button"
              onClick={() => {
                setMinPriceInput(range.min);
                setMaxPriceInput(range.max);
              }}
              className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-medium cursor-pointer"
            >
              {range.label} {currentCurrency.code}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Size Filter */}
      {allAvailableSizes.length > 0 && (
        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
            Size / Capacity / Format
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {allAvailableSizes.map(size => {
              const active = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  data-testid={`shop-filter-size-${size}`}
                  onClick={() => toggleSize(size)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {active && <Check className="w-3 h-3" />}
                  <span>{size}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Color / Finish Filter */}
      {allAvailableColors.length > 0 && (
        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
            Color &amp; Chassis Finish
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
            {allAvailableColors.map(color => {
              const active = selectedColors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  data-testid={`shop-filter-color-${color}`}
                  onClick={() => toggleColor(color)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-neutral-400 shrink-0"
                    style={{
                      backgroundColor: /black|obsidian|carbon|onyx/i.test(color)
                        ? '#171717'
                        : /gold|amber|bronze|ultras|ultem/i.test(color)
                        ? '#d97706'
                        : /ruby|red|crimson/i.test(color)
                        ? '#991b1b'
                        : /emerald|green/i.test(color)
                        ? '#065f46'
                        : /blue|cobalt/i.test(color)
                        ? '#1e40af'
                        : '#cbd5e1',
                    }}
                  />
                  <span>{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-neutral-50 min-h-screen pb-20">
      {/* Top Banner Header for All Products Shop */}
      <div className="bg-neutral-900 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={onBackToHome}
                data-testid="back-to-homepage-btn"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Storefront Homepage</span>
              </button>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                All Products &amp; Complete Catalogue
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
                Browse our complete active collection of CNC-milled hardware mods, rebuildable atomizers, cold-macerated botanical reserves, and billet accessories.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto bg-neutral-950/80 border border-neutral-800 px-4 py-3 rounded-xl">
              <Layers className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                  Active Published Catalogue
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {publishedProducts.length} Active Products
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Search, Mobile Filter Trigger & Sort Controls */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="shop-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU, brand, finish, or keyword..."
              className="w-full pl-10 pr-9 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Mobile Filters Button, Sort By, Per Page */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden px-3.5 py-2 bg-neutral-900 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">Sort by:</span>
              <select
                data-testid="shop-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as ShopSortOption)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="best_selling">Best-Selling</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="featured">Featured First</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium hidden sm:inline">Per page:</span>
              <select
                data-testid="shop-per-page-select"
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value) || 8)}
                className="px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value={4}>4 / page</option>
                <option value={8}>8 / page</option>
                <option value={12}>12 / page</option>
                <option value={16}>16 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
            <span className="text-neutral-500 font-medium">Active Filters:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium">
                Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCollectionId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium">
                Collection:{' '}
                {collections.find(c => c.id === selectedCollectionId)?.title || selectedCollectionId}
                <button onClick={() => setSelectedCollectionId('all')} className="hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {availabilityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium">
                Availability: {availabilityFilter === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                <button onClick={() => setAvailabilityFilter('all')} className="hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(minPriceInput || maxPriceInput) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium">
                Price: {minPriceInput || '0'} – {maxPriceInput || '∞'} {currentCurrency.code}
                <button
                  onClick={() => {
                    setMinPriceInput('');
                    setMaxPriceInput('');
                  }}
                  className="hover:text-amber-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSizes.map(sz => (
              <span
                key={sz}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium"
              >
                Size: {sz}
                <button onClick={() => toggleSize(sz)} className="hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedColors.map(cl => (
              <span
                key={cl}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white font-medium"
              >
                Color: {cl}
                <button onClick={() => toggleColor(cl)} className="hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#8a1538] hover:underline ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Mobile Filters Collapsible Panel */}
        {mobileFiltersOpen && (
          <div className="lg:hidden bg-white p-5 rounded-xl border border-neutral-200 mb-6">
            {renderFilterSidebarContent()}
          </div>
        )}

        {/* 2-Column Layout: Filter Sidebar + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-3 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs sticky top-24">
            {renderFilterSidebarContent()}
          </aside>

          {/* Product Results Grid + Pagination */}
          <div className="lg:col-span-9 space-y-6">
            {/* Results Count Bar */}
            <div className="flex items-center justify-between text-xs text-neutral-600 px-1">
              <span>
                Showing{' '}
                <strong className="text-neutral-900">
                  {filteredAndSortedProducts.length === 0 ? 0 : sliceStart + 1}–
                  {Math.min(sliceEnd, filteredAndSortedProducts.length)}
                </strong>{' '}
                of <strong className="text-neutral-900">{filteredAndSortedProducts.length}</strong>{' '}
                matching products
              </span>
              <span className="font-mono text-[11px] text-neutral-500">
                Page {safeCurrentPage} of {totalPages}
              </span>
            </div>

            {paginatedProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-16 text-center space-y-3">
                <Search className="w-10 h-10 text-neutral-300 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">
                  No Products Match Your Active Filters
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Try broadening your price range, selecting another category or collection, or clearing active size and color filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  data-testid="shop-products-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {paginatedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currentCountry={currentCountry}
                      currentCurrency={currentCurrency}
                      onViewProduct={onViewProduct}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>

                {/* Pagination & Load More Controls */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Load More Button */}
                  <div>
                    {hasMoreToLoad ? (
                      <button
                        type="button"
                        data-testid="shop-load-more-btn"
                        onClick={() => setLoadedPagesCount(prev => prev + 1)}
                        className="px-5 py-2.5 bg-[#8a1538] hover:bg-[#72112d] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          Load More Products ({filteredAndSortedProducts.length - sliceEnd} remaining)
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500 font-medium">
                        Showing all {filteredAndSortedProducts.length} matching products
                      </span>
                    )}
                  </div>

                  {/* Numbered Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => {
                          setCurrentPage(p => Math.max(1, p - 1));
                          setLoadedPagesCount(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          type="button"
                          data-testid={`shop-page-btn-${pageNum}`}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            setLoadedPagesCount(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            safeCurrentPage === pageNum
                              ? 'bg-neutral-900 text-white'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => {
                          setCurrentPage(p => Math.min(totalPages, p + 1));
                          setLoadedPagesCount(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
