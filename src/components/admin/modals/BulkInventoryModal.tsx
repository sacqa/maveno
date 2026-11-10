import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Layers,
  Plus,
  Minus,
  Hash,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  Search,
  MapPin,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Check,
} from 'lucide-react';
import {
  Product,
  InventoryLocation,
  BulkInventoryUpdateItem,
  StockHistoryEntry,
} from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';

interface BulkInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  locations: InventoryLocation[];
  initialSelectedProductIds?: string[];
  initialSelectedVariantIds?: string[];
  onCompleted: () => void;
  showToast: (message: string) => void;
}

type UpdateMode = 'delta' | 'fixed' | 'csv';

interface VariantRow {
  productId: string;
  productName: string;
  categoryId: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  currentStock: number;
}

export const BulkInventoryModal: React.FC<BulkInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  locations,
  initialSelectedProductIds = [],
  initialSelectedVariantIds = [],
  onCompleted,
  showToast,
}) => {
  const defaultLocId = useMemo(() => {
    const def = locations.find(l => l.priority === 1) || locations[0];
    return def?.id || 'loc_doha_pearl';
  }, [locations]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(defaultLocId);
  const [updateMode, setUpdateMode] = useState<UpdateMode>('delta');
  const [deltaDirection, setDeltaDirection] = useState<'increase' | 'decrease'>('increase');
  const [quantityValue, setQuantityValue] = useState<number>(25);
  const [reason, setReason] = useState<StockHistoryEntry['reason']>('received');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Flatten all variants across products for the selected location
  const allVariantRows = useMemo<VariantRow[]>(() => {
    return products.flatMap(p =>
      p.variants.map(v => {
        const locStock = v.locationStock?.[selectedLocationId] ?? v.stockQuantity ?? 0;
        return {
          productId: p.id,
          productName: p.name,
          categoryId: p.categoryId,
          variantId: v.id,
          variantTitle: v.title,
          sku: v.sku,
          currentStock: locStock,
        };
      })
    );
  }, [products, selectedLocationId]);

  // Initialize selected variant IDs
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(() => {
    if (initialSelectedVariantIds.length > 0) {
      return initialSelectedVariantIds;
    }
    if (initialSelectedProductIds.length > 0) {
      return products
        .filter(p => initialSelectedProductIds.includes(p.id))
        .flatMap(p => p.variants.map(v => v.id));
    }
    return products.slice(0, 4).flatMap(p => p.variants.map(v => v.id));
  });

  // Per-variant custom override for new stock if admin tweaks individual rows
  const [customRowOverrides, setCustomRowOverrides] = useState<Record<string, number>>({});

  // CSV state
  const [csvText, setCsvText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvMatchedOverrides, setCsvMatchedOverrides] = useState<
    Record<string, { newStock: number; mode: 'delta' | 'fixed'; rawVal: number }>
  >({});
  const [csvUnmatchedSkus, setCsvUnmatchedSkus] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation step & summary state
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [completedSummary, setCompletedSummary] = useState<{
    updatedCount: number;
    totalUnitsDelta: number;
    locationName: string;
  } | null>(null);

  if (!isOpen) return null;

  const filteredVariantRows = allVariantRows.filter(row => {
    const matchesSearch =
      !searchQuery.trim() ||
      row.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.variantTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock =
      stockFilter === 'all'
        ? true
        : stockFilter === 'out'
        ? row.currentStock <= 0
        : row.currentStock > 0 && row.currentStock <= 10;
    return matchesSearch && matchesStock;
  });

  // Calculate computed new stock for each variant
  const getComputedNewStock = (row: VariantRow): number => {
    if (customRowOverrides[row.variantId] !== undefined) {
      return Math.max(0, customRowOverrides[row.variantId]);
    }
    if (updateMode === 'csv') {
      const csvEntry = csvMatchedOverrides[row.variantId];
      if (!csvEntry) return row.currentStock;
      return Math.max(0, csvEntry.newStock);
    }
    if (updateMode === 'fixed') {
      return Math.max(0, Math.round(Number(quantityValue) || 0));
    }
    // delta mode
    const signedDelta =
      deltaDirection === 'increase'
        ? Math.abs(Math.round(Number(quantityValue) || 0))
        : -Math.abs(Math.round(Number(quantityValue) || 0));
    return Math.max(0, row.currentStock + signedDelta);
  };

  // Build final list of updates for selected variants
  const pendingUpdates: BulkInventoryUpdateItem[] = allVariantRows
    .filter(row => selectedVariantIds.includes(row.variantId))
    .map(row => {
      const newStock = getComputedNewStock(row);
      const delta = newStock - row.currentStock;
      return {
        productId: row.productId,
        variantId: row.variantId,
        productName: row.productName,
        variantTitle: row.variantTitle,
        sku: row.sku,
        locationId: selectedLocationId,
        currentStock: row.currentStock,
        newStock,
        delta,
        reason,
      };
    });

  const netDeltaUnits = pendingUpdates.reduce((sum, u) => sum + u.delta, 0);

  const handleToggleVariant = (variantId: string) => {
    setSelectedVariantIds(prev =>
      prev.includes(variantId) ? prev.filter(id => id !== variantId) : [...prev, variantId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredVariantRows.map(r => r.variantId);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every(id => selectedVariantIds.includes(id));
    if (allSelected) {
      setSelectedVariantIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedVariantIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Parse CSV text for bulk inventory
  const parseInventoryCsv = (raw: string) => {
    setCsvText(raw);
    const lines = raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setCsvMatchedOverrides({});
      setCsvUnmatchedSkus([]);
      return;
    }

    const matched: Record<
      string,
      { newStock: number; mode: 'delta' | 'fixed'; rawVal: number }
    > = {};
    const unmatched: string[] = [];
    const matchedIds: string[] = [];

    const firstRowCols = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const hasHeader =
      firstRowCols.some(c => /sku|handle|variant/i.test(c)) ||
      isNaN(Number(firstRowCols[1]?.replace(/^\+/, '')));

    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Detect column indices
    let skuCol = 0;
    let qtyCol = 1;
    let modeCol = 2;

    if (hasHeader) {
      const lowerCols = firstRowCols.map(c => c.toLowerCase());
      const foundSku = lowerCols.findIndex(c => c.includes('sku'));
      const foundQty = lowerCols.findIndex(
        c =>
          c.includes('qty') ||
          c.includes('quantity') ||
          c.includes('stock') ||
          c.includes('available') ||
          c.includes('delta') ||
          c.includes('adjustment')
      );
      const foundMode = lowerCols.findIndex(c => c.includes('mode') || c.includes('type'));
      if (foundSku !== -1) skuCol = foundSku;
      if (foundQty !== -1) qtyCol = foundQty;
      if (foundMode !== -1) modeCol = foundMode;
    }

    for (const line of dataLines) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const skuRaw = cols[skuCol] || '';
      const qtyRaw = cols[qtyCol] || '';
      const modeRaw = (cols[modeCol] || '').toLowerCase();
      if (!skuRaw || !qtyRaw) continue;

      const rowMatch = allVariantRows.find(
        r => r.sku.toLowerCase() === skuRaw.toLowerCase()
      );
      if (!rowMatch) {
        unmatched.push(skuRaw);
        continue;
      }

      const isExplicitDelta =
        qtyRaw.startsWith('+') ||
        qtyRaw.startsWith('-') ||
        modeRaw === 'delta' ||
        modeRaw === 'add' ||
        modeRaw === 'adjust';

      const parsedNum = Number(qtyRaw.replace(/^\+/, ''));
      if (isNaN(parsedNum)) continue;

      const newStock = isExplicitDelta
        ? Math.max(0, rowMatch.currentStock + Math.round(parsedNum))
        : Math.max(0, Math.round(parsedNum));

      matched[rowMatch.variantId] = {
        newStock,
        mode: isExplicitDelta ? 'delta' : 'fixed',
        rawVal: Math.round(parsedNum),
      };
      matchedIds.push(rowMatch.variantId);
    }

    setCsvMatchedOverrides(matched);
    setCsvUnmatchedSkus(unmatched);
    if (matchedIds.length > 0) {
      setSelectedVariantIds(Array.from(new Set(matchedIds)));
    }
  };

  const handleCsvFileUpload = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = String(e.target?.result || '');
      parseInventoryCsv(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadCsvTemplate = () => {
    const sampleRows = allVariantRows.slice(0, 6);
    const lines = [
      'SKU,Product Name,Variant,Current Stock,Quantity Adjustment,Mode',
      ...sampleRows.map(
        r =>
          `"${r.sku}","${r.productName.replace(/"/g, '""')}","${r.variantTitle.replace(
            /"/g,
            '""'
          )}",${r.currentStock},+25,delta`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify_bulk_inventory_template_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded Bulk Inventory CSV template');
  };

  const handleExecuteBulkUpdate = () => {
    if (pendingUpdates.length === 0) {
      showToast('Please select at least one product variant to update.');
      return;
    }

    const result = storeDb.bulkUpdateVariantInventory(
      pendingUpdates,
      'Admin (Bulk Inventory Manager)'
    );
    const locObj = locations.find(l => l.id === selectedLocationId);

    setShowConfirmDialog(false);
    setCompletedSummary({
      updatedCount: result.updatedVariantsCount || pendingUpdates.length,
      totalUnitsDelta: netDeltaUnits,
      locationName: locObj?.name || selectedLocationId,
    });
    onCompleted();
    showToast(
      `Bulk updated inventory for ${pendingUpdates.length} variant(s) successfully!`
    );
  };

  const selectedLocationObj = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Bulk Inventory Update &amp; Stock Replenishment
              </h2>
              <p className="text-xs text-slate-300">
                Select multiple products or variants, adjust stock by +/- delta, fixed count, or CSV upload, and preview changes before saving.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {completedSummary ? (
          <div className="p-8 text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">
                Bulk Inventory Update Complete
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                All stock adjustments have been saved to the database and recorded in the immutable Inventory Adjustment History log.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Variants Updated
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {completedSummary.updatedCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Net Stock Change
                </p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${
                    completedSummary.totalUnitsDelta >= 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {completedSummary.totalUnitsDelta >= 0
                    ? `+${completedSummary.totalUnitsDelta}`
                    : completedSummary.totalUnitsDelta}{' '}
                  units
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Warehouse Location
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                  {completedSummary.locationName}
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  setCompletedSummary(null);
                  setCustomRowOverrides({});
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Perform Another Bulk Update
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
              >
                Done &amp; Return to Inventory
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Step 1: Mode & Location Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Update Mode Tabs */}
              <div className="lg:col-span-5 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  1. Choose Bulk Update Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUpdateMode('delta')}
                    className={`px-2.5 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      updateMode === 'delta'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> +/- Quantity
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('fixed')}
                    className={`px-2.5 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      updateMode === 'fixed'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" /> Fixed Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('csv')}
                    className={`px-2.5 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      updateMode === 'csv'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV Upload
                  </button>
                </div>
              </div>

              {/* Warehouse Location */}
              <div className="lg:col-span-4 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  2. Target Warehouse Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedLocationId}
                    onChange={e => setSelectedLocationId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audit Reason */}
              <div className="lg:col-span-3 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  3. History Audit Reason
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value as StockHistoryEntry['reason'])}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  <option value="received">Restock Shipment Received</option>
                  <option value="correction">Inventory Count Correction</option>
                  <option value="return_restock">Customer Return Restock</option>
                  <option value="damaged">Damaged / QA Hold</option>
                  <option value="transfer">Warehouse Transfer</option>
                </select>
              </div>
            </div>

            {/* Step 2: Quantity Controls OR CSV Uploader */}
            {updateMode !== 'csv' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {updateMode === 'delta' && (
                    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setDeltaDirection('increase')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          deltaDirection === 'increase'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" /> Increase Stock (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeltaDirection('decrease')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          deltaDirection === 'decrease'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" /> Decrease Stock (-)
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      {updateMode === 'delta'
                        ? deltaDirection === 'increase'
                          ? 'Add Quantity to Existing Stock:'
                          : 'Subtract Quantity from Existing Stock:'
                        : 'Set Fixed Stock Quantity to:'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      data-testid="bulk-inventory-quantity-input"
                      value={quantityValue}
                      onChange={e => {
                        setQuantityValue(Math.max(0, parseInt(e.target.value, 10) || 0));
                        setCustomRowOverrides({});
                      }}
                      className="w-28 px-3 py-1.5 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                    <span className="text-xs text-slate-500">units</span>
                  </div>

                  {/* Quick presets */}
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50, 100].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setQuantityValue(preset);
                          setCustomRowOverrides({});
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                          quantityValue === preset
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {updateMode === 'delta'
                          ? `${deltaDirection === 'increase' ? '+' : '-'}${preset}`
                          : `=${preset}`}
                      </button>
                    ))}
                  </div>
                </div>

                {Object.keys(customRowOverrides).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomRowOverrides({})}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset {Object.keys(customRowOverrides).length} row override(s)
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      CSV Bulk Inventory Update
                    </h4>
                    <p className="text-xs text-slate-500">
                      Upload a CSV file or paste rows with <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">SKU,Quantity,Mode</code> (e.g. <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ARC-TITAN-BLK,+30,delta</code> or <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ARC-TITAN-BLK,75,fixed</code>).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Template
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload CSV File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleCsvFileUpload(file);
                      }}
                    />
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={csvText}
                  onChange={e => parseInventoryCsv(e.target.value)}
                  placeholder={`SKU,Quantity,Mode\nARC-TITAN-BLK,+25,delta\nAET-RTA-24-SLV,80,fixed`}
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    {csvFileName && (
                      <span className="font-semibold text-slate-700">
                        File: {csvFileName}
                      </span>
                    )}
                    <span className="text-emerald-700 font-semibold">
                      Matched SKUs: {Object.keys(csvMatchedOverrides).length}
                    </span>
                    {csvUnmatchedSkus.length > 0 && (
                      <span className="text-amber-700 font-semibold">
                        Unmatched SKUs: {csvUnmatchedSkus.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Variant Selection & Preview Table (Current Stock -> Updated Stock) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              {/* Filter Bar */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filter by product, variant, or SKU..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                    {(['all', 'low', 'out'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setStockFilter(f)}
                        className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                          stockFilter === f
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f === 'all' ? 'All Variants' : f === 'low' ? 'Low Stock (≤10)' : 'Out of Stock (0)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    Selected:{' '}
                    <span className="text-slate-900 font-bold">
                      {selectedVariantIds.length}
                    </span>{' '}
                    of {allVariantRows.length} variants
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariantIds(allVariantRows.map(r => r.variantId))}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVariantIds([])}
                    className="text-slate-500 hover:underline font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredVariantRows.length > 0 &&
                            filteredVariantRows.every(r =>
                              selectedVariantIds.includes(r.variantId)
                            )
                          }
                          onChange={handleToggleSelectAllVisible}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Product &amp; Variant</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Change</th>
                      <th className="py-2.5 px-3 text-right">Updated Stock (Preview)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredVariantRows.map(row => {
                      const isSelected = selectedVariantIds.includes(row.variantId);
                      const newStock = getComputedNewStock(row);
                      const delta = newStock - row.currentStock;

                      return (
                        <tr
                          key={row.variantId}
                          className={`transition-colors ${
                            isSelected ? 'bg-emerald-50/35' : 'hover:bg-slate-50/80 opacity-65'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleVariant(row.variantId)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900">{row.productName}</p>
                            <p className="text-[11px] text-slate-500">{row.variantTitle}</p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {row.sku}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                            {row.currentStock}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isSelected ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                                  delta > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : delta < 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isSelected ? (
                              <div className="inline-flex items-center justify-end gap-2">
                                <span className="text-slate-400 text-[11px]">
                                  {row.currentStock}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <input
                                  type="number"
                                  min={0}
                                  value={newStock}
                                  onChange={e => {
                                    const val = Math.max(
                                      0,
                                      parseInt(e.target.value, 10) || 0
                                    );
                                    setCustomRowOverrides(prev => ({
                                      ...prev,
                                      [row.variantId]: val,
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 text-right font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-slate-400">
                                {row.currentStock} (Unchanged)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog Overlay before saving */}
        {showConfirmDialog && !completedSummary && (
          <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Confirm Bulk Inventory Changes Before Saving
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  You are about to update stock levels for{' '}
                  <strong className="font-bold">{pendingUpdates.length} variant(s)</strong> at{' '}
                  <strong className="font-bold">
                    {selectedLocationObj?.name || selectedLocationId}
                  </strong>{' '}
                  (Net change:{' '}
                  <strong className="font-bold">
                    {netDeltaUnits >= 0 ? `+${netDeltaUnits}` : netDeltaUnits} units
                  </strong>
                  ). This action will update storefront availability and write to the Inventory History log.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                data-testid="confirm-bulk-inventory-apply-btn"
                onClick={handleExecuteBulkUpdate}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirm &amp; Save Bulk Update
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!completedSummary && !showConfirmDialog && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span>
                Selected Variants:{' '}
                <strong className="font-bold text-slate-900">
                  {pendingUpdates.length}
                </strong>
              </span>
              <span>
                Net Stock Adjustment:{' '}
                <strong
                  className={`font-bold font-mono ${
                    netDeltaUnits >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {netDeltaUnits >= 0 ? `+${netDeltaUnits}` : netDeltaUnits} units
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="review-bulk-inventory-btn"
                disabled={pendingUpdates.length === 0}
                onClick={() => setShowConfirmDialog(true)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                Review &amp; Confirm Update ({pendingUpdates.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
