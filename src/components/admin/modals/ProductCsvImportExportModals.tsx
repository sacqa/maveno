import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  RefreshCw,
  ArrowRight,
  Sliders,
  Eye,
  Layers,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Product, ProductCollection, Currency } from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';
import { formatMinorUnits } from '../../../utils/commerce-engine';
import {
  ShopifyFieldKey,
  SHOPIFY_FIELD_LABELS,
  CsvColumnMapping,
  CsvImportExecutionReport,
  parseAndValidateShopifyCsv,
  generateShopifyCsvTemplate,
  exportProductsToShopifyCsv,
} from '../../../utils/shopify-csv';

interface ProductCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  baseCurrency: Currency;
  onImportComplete: (summaryToast: string) => void;
}

export const ProductCsvImportModal: React.FC<ProductCsvImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  baseCurrency,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('shopify-sample-batch.csv');
  const [csvText, setCsvText] = useState<string>(() => generateShopifyCsvTemplate());
  const [customMappings, setCustomMappings] = useState<CsvColumnMapping[] | undefined>(undefined);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [showRawCsvEditor, setShowRawCsvEditor] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'create' | 'update' | 'errors' | 'warnings'>('all');

  // Progress & Final Report state
  const [importPhase, setImportPhase] = useState<'configure_preview' | 'importing' | 'report'>('configure_preview');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStepLabel, setProgressStepLabel] = useState('');
  const [executionReport, setExecutionReport] = useState<CsvImportExecutionReport | null>(null);

  const parsedResult = useMemo(() => {
    return parseAndValidateShopifyCsv(csvText, existingProducts, customMappings);
  }, [csvText, existingProducts, customMappings]);

  if (!isOpen) return null;

  const handleFileLoaded = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCustomMappings(undefined);
        setCsvText(content);
        setImportPhase('configure_preview');
        setExecutionReport(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileLoaded(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateCsv = generateShopifyCsvTemplate();
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopify-products-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleTemplate = () => {
    setUploadedFileName('shopify-products-import-template.csv');
    setCustomMappings(undefined);
    setCsvText(generateShopifyCsvTemplate());
    setImportPhase('configure_preview');
    setExecutionReport(null);
  };

  const handleUpdateMapping = (headerIndex: number, newField: ShopifyFieldKey) => {
    const nextMappings = parsedResult.mappings.map((m) =>
      m.headerIndex === headerIndex ? { ...m, mappedField: newField } : m
    );
    setCustomMappings(nextMappings);
  };

  const handleRunImport = () => {
    if (parsedResult.products.length === 0) return;

    setImportPhase('importing');
    setProgressPercent(15);
    setProgressStepLabel('Validating CSV schema, handles, and SKU constraints...');

    setTimeout(() => {
      setProgressPercent(48);
      setProgressStepLabel(
        `Processing ${parsedResult.totalVariantsCount} product variants and ${parsedResult.totalImagesCount} gallery images...`
      );
    }, 180);

    setTimeout(() => {
      setProgressPercent(82);
      setProgressStepLabel('Syncing collections, pricing minor units, and Doha warehouse inventory ledger...');
    }, 360);

    setTimeout(() => {
      const report = storeDb.importShopifyCsvProducts(parsedResult.products, {
        overwriteExisting,
      });
      setProgressPercent(100);
      setProgressStepLabel('Import completed!');
      setExecutionReport(report);
      setImportPhase('report');
      onImportComplete(
        `CSV Import complete: ${report.createdCount} created, ${report.updatedCount} updated (${report.variantsProcessed} variants)`
      );
    }, 550);
  };

  const handleDownloadErrorReportCsv = () => {
    if (!executionReport || executionReport.failedItems.length === 0) return;
    const rows = [
      ['Handle', 'CSV Row Numbers', 'Error Messages'],
      ...executionReport.failedItems.map((item) => [
        `"${item.handle.replace(/"/g, '""')}"`,
        `"${item.rowNumbers.join(', ')}"`,
        `"${item.errors.join(' | ').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csv-import-errors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPreviewProducts = parsedResult.products.filter((item) => {
    if (previewFilter === 'create') return item.action === 'create';
    if (previewFilter === 'update') return item.action === 'update';
    if (previewFilter === 'errors') return !item.isValid;
    if (previewFilter === 'warnings') return item.warnings.length > 0;
    return true;
  });

  const actionableProductsCount = parsedResult.products.filter(
    (p) => p.isValid && (p.action === 'create' || overwriteExisting)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8a1538] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Import Products by CSV</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/15 rounded-md">
                  Shopify Compatible
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Supports multi-row variants, multiple product images, handles, SKUs, barcodes, pricing, collections &amp; SEO fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-neutral-50/60">
          {importPhase === 'configure_preview' && (
            <>
              {/* Top Row: Drag & Drop Upload Zone + Template & Options */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Drag & Drop File Upload */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`lg:col-span-2 border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center text-center bg-white ${
                    isDragging
                      ? 'border-[#8a1538] bg-[#8a1538]/5'
                      : 'border-neutral-300 hover:border-neutral-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileLoaded(file);
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2 text-neutral-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">
                    Drag and drop your Shopify CSV file here, or{' '}
                    <span className="text-[#8a1538] underline">browse file</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Active Source: <strong className="font-mono text-neutral-800">{uploadedFileName}</strong> (
                    {parsedResult.rawRows.length} data rows, {parsedResult.headers.length} columns)
                  </p>
                </div>

                {/* Template Download & Import Settings Card */}
                <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-bold text-neutral-900 mb-1">
                      CSV Templates &amp; Merge Behavior
                    </div>
                    <p className="text-[11px] text-neutral-500 mb-3">
                      Download a sample Shopify CSV template with multi-variant &amp; multi-image structure.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download CSV Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadSampleTemplate}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#8a1538]" />
                        <span>Load Sample Data</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-200 space-y-2">
                    <label className="flex items-start gap-2 text-xs text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overwriteExisting}
                        onChange={(e) => setOverwriteExisting(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-300 cursor-pointer"
                      />
                      <span>
                        <strong className="font-semibold">Overwrite existing products</strong> that have a matching{' '}
                        <code className="font-mono text-[11px] bg-neutral-100 px-1 rounded">Handle</code> or{' '}
                        <code className="font-mono text-[11px] bg-neutral-100 px-1 rounded">SKU</code>
                      </span>
                    </label>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowColumnMapper((prev) => !prev)}
                        className="px-2.5 py-1 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-[11px] font-semibold text-neutral-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{showColumnMapper ? 'Hide Column Mapping' : 'Column Mapping'} ({parsedResult.mappings.filter((m) => m.mappedField !== 'ignore').length}/{parsedResult.headers.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRawCsvEditor((prev) => !prev)}
                        className="px-2.5 py-1 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-[11px] font-semibold text-neutral-700 flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{showRawCsvEditor ? 'Hide Raw CSV' : 'Edit Raw CSV'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Raw CSV Editor */}
              {showRawCsvEditor && (
                <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-900">
                      Raw CSV Content Editor (Live Validation)
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      Edit CSV rows directly to test or fix validation errors on the fly
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => {
                      setCustomMappings(undefined);
                      setCsvText(e.target.value);
                    }}
                    className="w-full p-3 border border-neutral-300 rounded-lg text-[11px] font-mono bg-neutral-50 focus:bg-white focus:outline-hidden focus:border-neutral-900"
                    placeholder="Paste or edit Shopify CSV content..."
                  />
                </div>
              )}

              {/* Automatic Column Mapping Inspector */}
              {showColumnMapper && parsedResult.mappings.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Automatic CSV Column Mapping ({parsedResult.mappings.length} Columns Detected)
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Columns were automatically matched to Shopify product fields. Adjust any dropdown below to remap.
                      </p>
                    </div>
                    {customMappings && (
                      <button
                        type="button"
                        onClick={() => setCustomMappings(undefined)}
                        className="text-[11px] text-[#8a1538] font-semibold hover:underline cursor-pointer"
                      >
                        Reset to Auto-Mapping
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-1">
                    {parsedResult.mappings.map((mapping) => (
                      <div
                        key={mapping.headerIndex}
                        className={`p-2.5 rounded-lg border text-xs ${
                          mapping.mappedField !== 'ignore'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <div className="font-mono text-[11px] font-bold text-neutral-800 truncate mb-1" title={mapping.csvHeader}>
                          CSV: &ldquo;{mapping.csvHeader}&rdquo;
                        </div>
                        <select
                          value={mapping.mappedField}
                          onChange={(e) => handleUpdateMapping(mapping.headerIndex, e.target.value as ShopifyFieldKey)}
                          className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-[11px] text-neutral-800"
                        >
                          {(Object.keys(SHOPIFY_FIELD_LABELS) as ShopifyFieldKey[]).map((key) => (
                            <option key={key} value={key}>
                              {SHOPIFY_FIELD_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation & Summary KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500 font-medium">Detected Products</div>
                  <div className="text-lg font-bold text-neutral-900 font-mono tabular-nums mt-0.5">
                    {parsedResult.products.length}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    From {parsedResult.rawRows.length} CSV rows
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500 font-medium">New vs Updates</div>
                  <div className="text-sm font-bold text-neutral-900 font-mono tabular-nums mt-1 flex items-center gap-2">
                    <span className="text-emerald-700">+{parsedResult.newProductsCount} New</span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-blue-700">{parsedResult.updateProductsCount} Update</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">Matched by Handle / SKU</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500 font-medium">Variants &amp; Images</div>
                  <div className="text-sm font-bold text-neutral-900 font-mono tabular-nums mt-1">
                    {parsedResult.totalVariantsCount} Variants · {parsedResult.totalImagesCount} Images
                  </div>
                  <div className="text-[10px] text-neutral-500">Multi-row grouped</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500 font-medium">Ready to Import</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                    {actionableProductsCount}
                  </div>
                  <div className="text-[10px] text-emerald-700">Passed schema checks</div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    parsedResult.errorProductsCount > 0
                      ? 'bg-red-50 border-red-200'
                      : parsedResult.warningProductsCount > 0
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="text-[11px] text-neutral-600 font-medium">Validation Status</div>
                  <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
                    {parsedResult.errorProductsCount > 0 ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-700">{parsedResult.errorProductsCount} Error(s)</span>
                      </>
                    ) : parsedResult.warningProductsCount > 0 ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800">{parsedResult.warningProductsCount} Warning(s)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-800">All Rows Valid</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-600">
                    {parsedResult.allIssues.length} total diagnostic notice(s)
                  </div>
                </div>
              </div>

              {/* Global Validation Issues Banner if any */}
              {parsedResult.allIssues.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Validation Diagnostics ({parsedResult.allIssues.length})</span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      Products with blocking errors will be skipped automatically during import
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {parsedResult.allIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between ${
                          issue.severity === 'error'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/80">
                            Row {issue.rowNumber} · {issue.field}
                          </span>
                          <span>{issue.message}</span>
                        </div>
                        <span className="font-mono text-[10px] opacity-75">{issue.handle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CSV Preview Table Header & Filter Pills */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-neutral-700" />
                    <h4 className="text-xs font-bold text-neutral-900">
                      Pre-Import Product &amp; Multi-Variant Preview
                    </h4>
                  </div>

                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'all', label: `All (${parsedResult.products.length})` },
                        { id: 'create', label: `New (${parsedResult.newProductsCount})` },
                        { id: 'update', label: `Updates (${parsedResult.updateProductsCount})` },
                        { id: 'errors', label: `Errors (${parsedResult.errorProductsCount})` },
                        { id: 'warnings', label: `Warnings (${parsedResult.warningProductsCount})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPreviewFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          previewFilter === tab.id
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-600 hover:bg-neutral-200/70'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[10px] font-semibold text-neutral-500 uppercase">
                        <th className="py-2.5 px-3">Rows</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Product / Handle</th>
                        <th className="py-2.5 px-3">Variants &amp; SKUs</th>
                        <th className="py-2.5 px-3">Price / Compare / Cost</th>
                        <th className="py-2.5 px-3">Total Stock</th>
                        <th className="py-2.5 px-3">Images</th>
                        <th className="py-2.5 px-3">Vendor / Collections / Tags</th>
                        <th className="py-2.5 px-3">SEO &amp; Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {filteredPreviewProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-neutral-400 text-xs">
                            No preview products match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewProducts.map((item) => {
                          const p = item.product;
                          const totalStock = p.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
                          return (
                            <tr
                              key={item.handle}
                              className={
                                !item.isValid
                                  ? 'bg-red-50/50'
                                  : item.warnings.length > 0
                                  ? 'bg-amber-50/30'
                                  : 'hover:bg-neutral-50'
                              }
                            >
                              <td className="py-3 px-3 font-mono text-[11px] text-neutral-500">
                                #{item.sourceRowNumbers.join(', #')}
                              </td>
                              <td className="py-3 px-3">
                                {item.action === 'create' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    NEW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {overwriteExisting ? 'UPDATE' : 'SKIP'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={p.galleryImages[0]}
                                    alt={p.name}
                                    className="w-9 h-9 rounded-lg object-cover border border-neutral-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <div className="font-semibold text-neutral-900">{p.name}</div>
                                    <div className="text-[10px] font-mono text-neutral-500">
                                      /{p.slug} · <span className="uppercase">{p.status}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-neutral-800 flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-neutral-500" />
                                  <span>{p.variants.length} variant(s)</span>
                                </div>
                                <div className="space-y-0.5 mt-1 max-w-[210px]">
                                  {p.variants.slice(0, 3).map((v) => (
                                    <div
                                      key={v.id}
                                      className="text-[10px] font-mono text-neutral-600 truncate"
                                      title={`${v.title} — SKU: ${v.sku} — Barcode: ${v.barcode || 'N/A'}`}
                                    >
                                      • {v.title} ({v.sku})
                                    </div>
                                  ))}
                                  {p.variants.length > 3 && (
                                    <div className="text-[10px] text-neutral-400">
                                      +{p.variants.length - 3} more variants
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums">
                                <div className="font-bold text-neutral-900">
                                  {formatMinorUnits(p.basePriceMinorUnits, baseCurrency)}
                                </div>
                                {p.compareAtPriceMinorUnits && p.compareAtPriceMinorUnits > 0 ? (
                                  <div className="text-[10px] text-neutral-400 line-through">
                                    {formatMinorUnits(p.compareAtPriceMinorUnits, baseCurrency)}
                                  </div>
                                ) : null}
                                {p.costPerItemMinorUnits ? (
                                  <div className="text-[10px] text-emerald-700">
                                    Cost: {(p.costPerItemMinorUnits / 100).toFixed(2)} QAR
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums">
                                <span className="font-semibold text-neutral-900">{totalStock}</span>
                                <span className="text-[10px] text-neutral-500 block">units</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[11px] font-mono">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>{p.galleryImages.length}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 max-w-[180px]">
                                <div className="font-medium text-neutral-800 truncate">{p.vendor || p.brand}</div>
                                {item.collectionNames.length > 0 && (
                                  <div className="text-[10px] text-[#8a1538] font-medium truncate">
                                    Collections: {item.collectionNames.join(', ')}
                                  </div>
                                )}
                                <div className="text-[10px] text-neutral-500 truncate">
                                  {(p.tags || []).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 px-3 max-w-[220px]">
                                {item.errors.length > 0 ? (
                                  <div className="space-y-1">
                                    {item.errors.map((err, i) => (
                                      <div key={i} className="text-[10px] text-red-700 font-semibold flex items-start gap-1">
                                        <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                                        <span>{err.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : item.warnings.length > 0 ? (
                                  <div className="space-y-1">
                                    {item.warnings.map((warn, i) => (
                                      <div key={i} className="text-[10px] text-amber-800 flex items-start gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                        <span>{warn.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Valid</span>
                                    </div>
                                    <div className="text-[10px] text-neutral-500 truncate" title={p.seoTitle}>
                                      SEO: {p.seoTitle}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Phase 2: Importing Progress Bar */}
          {importPhase === 'importing' && (
            <div className="py-16 px-6 bg-white rounded-2xl border border-neutral-200 text-center space-y-4 max-w-xl mx-auto my-8">
              <RefreshCw className="w-10 h-10 text-[#8a1538] animate-spin mx-auto" />
              <h4 className="text-base font-bold text-neutral-900">Importing Products into Store Database...</h4>
              <p className="text-xs text-neutral-600">{progressStepLabel}</p>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                <div
                  className="h-full bg-[#8a1538] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs font-mono font-bold text-neutral-700">{progressPercent}% Complete</div>
            </div>
          )}

          {/* Phase 3: Final Success / Error Report */}
          {importPhase === 'report' && executionReport && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      CSV Product Import Completed
                    </h4>
                    <p className="text-xs text-emerald-800">
                      All imported products, variants, gallery images, and collections have been saved to the database and are now live in both the Admin Panel and Storefront.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-emerald-900">
                  <div>Completed: {new Date(executionReport.completedAt).toLocaleTimeString()}</div>
                  <div>Source: {uploadedFileName}</div>
                </div>
              </div>

              {/* Report KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500">Rows Processed</div>
                  <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
                    {executionReport.totalRowsProcessed}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-semibold">New Products Created</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    +{executionReport.createdCount}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-semibold">Existing Updated</div>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-1">
                    {executionReport.updatedCount}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500">Variants &amp; Images</div>
                  <div className="text-sm font-bold font-mono text-neutral-900 mt-1.5">
                    {executionReport.variantsProcessed} vars · {executionReport.imagesProcessed} imgs
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="text-[11px] text-neutral-500">Skipped / Errors</div>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {executionReport.skippedCount}
                  </div>
                </div>
              </div>

              {/* Created & Updated Products Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-neutral-900">
                    Newly Created Products ({executionReport.createdProducts.length})
                  </h5>
                  {executionReport.createdProducts.length === 0 ? (
                    <p className="text-xs text-neutral-400">No new products created in this batch.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {executionReport.createdProducts.map((cp) => (
                        <div
                          key={cp.id}
                          className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-neutral-900">{cp.name}</div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              Handle: /{cp.handle} · SKU: {cp.sku}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-semibold">
                            {cp.variantsCount} variant(s)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-neutral-900">
                    Updated Existing Products ({executionReport.updatedProducts.length})
                  </h5>
                  {executionReport.updatedProducts.length === 0 ? (
                    <p className="text-xs text-neutral-400">No existing products updated in this batch.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {executionReport.updatedProducts.map((up) => (
                        <div
                          key={up.id}
                          className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-neutral-900">{up.name}</div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              Handle: /{up.handle} · SKU: {up.sku}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-[10px] font-semibold">
                            {up.variantsCount} variant(s)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Failed / Skipped Items Report */}
              {executionReport.failedItems.length > 0 && (
                <div className="bg-red-50/70 rounded-xl border border-red-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-red-900">
                      Skipped / Error Items ({executionReport.failedItems.length})
                    </h5>
                    <button
                      type="button"
                      onClick={handleDownloadErrorReportCsv}
                      className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Error Report CSV</span>
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {executionReport.failedItems.map((fi, idx) => (
                      <div key={idx} className="text-xs text-red-800 bg-white/80 p-2 rounded border border-red-200">
                        <strong className="font-mono">{fi.handle}</strong> (Rows #{fi.rowNumbers.join(', ')}):{' '}
                        {fi.errors.join(' | ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
          {importPhase === 'configure_preview' ? (
            <>
              <div className="text-xs text-neutral-500">
                {actionableProductsCount > 0 ? (
                  <span>
                    Ready to import <strong className="text-neutral-900">{actionableProductsCount}</strong> valid product(s) with{' '}
                    <strong className="text-neutral-900">{parsedResult.totalVariantsCount}</strong> variant(s).
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    No valid products ready to import. Fix validation errors above or load sample template.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionableProductsCount === 0}
                  onClick={handleRunImport}
                  className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    actionableProductsCount > 0
                      ? 'bg-[#8a1538] hover:bg-[#72112d] text-white'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Import {actionableProductsCount} Product{actionableProductsCount === 1 ? '' : 's'} Now
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : importPhase === 'report' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setImportPhase('configure_preview');
                  setExecutionReport(null);
                }}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Import Another CSV File
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done &amp; View Catalog
              </button>
            </>
          ) : (
            <div className="text-xs text-neutral-500">Processing batch import...</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHOPIFY CSV PRODUCT EXPORT MODAL
// ============================================================================

interface ProductCsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  filteredProducts: Product[];
  selectedProductIds: string[];
  collections: ProductCollection[];
  onExportComplete: (summaryToast: string) => void;
}

export const ProductCsvExportModal: React.FC<ProductCsvExportModalProps> = ({
  isOpen,
  onClose,
  allProducts,
  filteredProducts,
  selectedProductIds,
  collections,
  onExportComplete,
}) => {
  const [exportScope, setExportScope] = useState<'selected' | 'filtered' | 'all'>(() =>
    selectedProductIds.length > 0 ? 'selected' : 'all'
  );
  const [csvFormat, setCsvFormat] = useState<'shopify_multirow' | 'summary_singlerow'>('shopify_multirow');
  const [copied, setCopied] = useState(false);

  // Sync default scope when modal opens with selected products
  React.useEffect(() => {
    if (isOpen) {
      if (selectedProductIds.length > 0) {
        setExportScope('selected');
      } else {
        setExportScope('all');
      }
    }
  }, [isOpen, selectedProductIds.length]);

  const targetProducts = useMemo(() => {
    if (exportScope === 'selected' && selectedProductIds.length > 0) {
      return allProducts.filter((p) => selectedProductIds.includes(p.id));
    }
    if (exportScope === 'filtered') {
      return filteredProducts;
    }
    return allProducts;
  }, [exportScope, allProducts, filteredProducts, selectedProductIds]);

  const generatedCsv = useMemo(() => {
    return exportProductsToShopifyCsv(targetProducts, collections, csvFormat);
  }, [targetProducts, collections, csvFormat]);

  if (!isOpen) return null;

  const totalVariantsCount = targetProducts.reduce((acc, p) => acc + p.variants.length, 0);
  const totalImagesCount = targetProducts.reduce((acc, p) => acc + p.galleryImages.length, 0);

  const handleDownloadCsv = () => {
    const blob = new Blob([generatedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const scopeSuffix =
      exportScope === 'selected'
        ? `selected-${targetProducts.length}`
        : exportScope === 'filtered'
        ? `filtered-${targetProducts.length}`
        : `all-${targetProducts.length}`;
    a.download = `aura-qatar-products-${scopeSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onExportComplete(`Exported ${targetProducts.length} product(s) (${totalVariantsCount} variants) to CSV`);
    onClose();
  };

  const handleCopyCsv = () => {
    navigator.clipboard?.writeText(generatedCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-[#8a1538]" />
            <h3 className="text-sm font-bold">Export Products to CSV</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Scope Selection */}
          <div className="space-y-2.5">
            <label className="block font-bold text-neutral-900">Export Scope</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                  exportScope === 'all'
                    ? 'border-[#8a1538] bg-[#8a1538]/5'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-neutral-900">All Products</div>
                  <div className="text-[11px] text-neutral-500">{allProducts.length} total in catalog</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                  exportScope === 'selected'
                    ? 'border-[#8a1538] bg-[#8a1538]/5'
                    : selectedProductIds.length === 0
                    ? 'border-neutral-200 opacity-50 cursor-not-allowed'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  disabled={selectedProductIds.length === 0}
                  checked={exportScope === 'selected'}
                  onChange={() => setExportScope('selected')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-neutral-900">Selected Products</div>
                  <div className="text-[11px] text-neutral-500">
                    {selectedProductIds.length > 0
                      ? `${selectedProductIds.length} product(s) checked`
                      : 'None selected in table'}
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                  exportScope === 'filtered'
                    ? 'border-[#8a1538] bg-[#8a1538]/5'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportScope === 'filtered'}
                  onChange={() => setExportScope('filtered')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-neutral-900">Current Filtered View</div>
                  <div className="text-[11px] text-neutral-500">{filteredProducts.length} matching filter</div>
                </div>
              </label>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2.5">
            <label className="block font-bold text-neutral-900">CSV Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                  csvFormat === 'shopify_multirow'
                    ? 'border-[#8a1538] bg-[#8a1538]/5'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="csvFormat"
                  checked={csvFormat === 'shopify_multirow'}
                  onChange={() => setCsvFormat('shopify_multirow')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-neutral-900">
                    Shopify Compatible CSV (Multi-Row Variants &amp; Images)
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Full fidelity: exports all variants, options, barcodes, images, collections, and SEO fields for re-importing into Shopify or AURA Admin.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                  csvFormat === 'summary_singlerow'
                    ? 'border-[#8a1538] bg-[#8a1538]/5'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="csvFormat"
                  checked={csvFormat === 'summary_singlerow'}
                  onChange={() => setCsvFormat('summary_singlerow')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-neutral-900">Plain Catalog Summary CSV (Single Row per Product)</div>
                  <div className="text-[11px] text-neutral-500">
                    Consolidated spreadsheet view with total stock and base QAR pricing for accounting or ERP review.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Export Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800">
                Live CSV Output Preview ({targetProducts.length} products · {totalVariantsCount} variants · {totalImagesCount} images)
              </span>
              <button
                type="button"
                onClick={handleCopyCsv}
                className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy CSV'}</span>
              </button>
            </div>
            <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed">
              {generatedCsv.split('\n').slice(0, 12).join('\n')}
              {generatedCsv.split('\n').length > 12 ? '\n...' : ''}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targetProducts.length === 0}
            onClick={handleDownloadCsv}
            className="px-5 py-2 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              Export {targetProducts.length} Product{targetProducts.length === 1 ? '' : 's'} (CSV)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
