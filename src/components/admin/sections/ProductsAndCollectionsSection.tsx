import React, { useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit3,
  Trash2,
  Copy,
  Archive,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Layers,
  Package,
  Gift,
  AlertTriangle,
  Truck,
  History,
  Tag,
  Save,
  Bold,
  Italic,
  List,
  Heading2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  ProductMetafield,
  ProductCollection,
  CollectionCondition,
  InventoryLocation,
  InventoryTransfer,
  StockHistoryEntry,
  GiftCard,
  Currency,
} from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';
import {
  formatMinorUnits,
  calculateProfitAndMargin,
  evaluateAutomatedCollection,
} from '../../../utils/commerce-engine';
import {
  ProductCsvImportModal,
  ProductCsvExportModal,
} from '../modals/ProductCsvImportExportModals';
import { BulkInventoryModal } from '../modals/BulkInventoryModal';

interface ProductsAndCollectionsProps {
  subView: 'products' | 'collections' | 'inventory' | 'gift_cards';
  setSubView: (v: 'products' | 'collections' | 'inventory' | 'gift_cards') => void;
  products: Product[];
  baseCurrency: Currency;
  onRefreshData: () => void;
  triggerToast: (msg: string) => void;
}

const PRESET_IMAGES = [
  { label: 'Titanium Box Mod', url: '/src/assets/images/hero_luxury_vape_mod_1794234135797.jpg' },
  { label: 'Precision RTA Atomizer', url: '/src/assets/images/product_artisan_atomizer_1794234139169.jpg' },
  { label: 'Botanical E-Liquid Bottle', url: '/src/assets/images/product_craft_eliquid_1794234137051.jpg' },
  { label: 'Carbon Boro Box Device', url: '/src/assets/images/product_billet_box_device_1794234138404.jpg' },
];

export const ProductsAndCollectionsSection: React.FC<ProductsAndCollectionsProps> = ({
  subView,
  setSubView,
  products,
  baseCurrency,
  onRefreshData,
  triggerToast,
}) => {
  // --- Products State ---
  const [prodStatusFilter, setProdStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('all');
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showCsvExportModal, setShowCsvExportModal] = useState(false);
  const [showBulkInventoryModal, setShowBulkInventoryModal] = useState(false);
  const [selectedInvVariantIds, setSelectedInvVariantIds] = useState<string[]>([]);

  // Product Editor Modal State
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formStatus, setFormStatus] = useState<Product['status']>('published');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formFullDesc, setFormFullDesc] = useState('');
  const [formBrand, setFormBrand] = useState('Architek Titan');
  const [formVendor, setFormVendor] = useState('Architek Titan Stuttgart GmbH');
  const [formCategory, setFormCategory] = useState('regulated-mods');
  const [formProductType, setFormProductType] = useState<Product['productType']>('hardware_mod');
  const [formTags, setFormTags] = useState('Titanium, DNA60C, Doha-Exclusive');
  const [formImages, setFormImages] = useState<string[]>([PRESET_IMAGES[0].url]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formPriceQar, setFormPriceQar] = useState('850.00');
  const [formComparePriceQar, setFormComparePriceQar] = useState('980.00');
  const [formCostQar, setFormCostQar] = useState('420.00');
  const [formSku, setFormSku] = useState('QA-MOD-101');
  const [formBarcode, setFormBarcode] = useState('6291041500812');
  const [formTrackQty, setFormTrackQty] = useState(true);
  const [formContinueOut, setFormContinueOut] = useState(false);
  const [formIsPhysical, setFormIsPhysical] = useState(true);
  const [formWeightGrams, setFormWeightGrams] = useState('220');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDesc, setFormSeoDesc] = useState('');
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);
  const [formMetafields, setFormMetafields] = useState<ProductMetafield[]>([]);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // --- Collections State ---
  const collections = storeDb.getCollections();
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ProductCollection | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [colHandle, setColHandle] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colType, setColType] = useState<'manual' | 'automated'>('automated');
  const [colSort, setColSort] = useState<ProductCollection['sortOrder']>('best_selling');
  const [colImage, setColImage] = useState(PRESET_IMAGES[0].url);
  const [colConditions, setColConditions] = useState<CollectionCondition[]>([
    { id: 'c1', field: 'price', operator: 'greater_than', value: '300' },
  ]);
  const [colManualProductIds, setColManualProductIds] = useState<string[]>([]);
  const [colSeoTitle, setColSeoTitle] = useState('');
  const [colSeoDesc, setColSeoDesc] = useState('');

  // --- Inventory State ---
  const locations = storeDb.getLocations();
  const transfers = storeDb.getTransfers();
  const stockHistory = storeDb.getStockHistory();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [invLowStockOnly, setInvLowStockOnly] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [invTab, setInvTab] = useState<'levels' | 'transfers' | 'history'>('levels');
  const [adjustDeltaMap, setAdjustDeltaMap] = useState<Record<string, string>>({});
  const [adjustReasonMap, setAdjustReasonMap] = useState<Record<string, StockHistoryEntry['reason']>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [trfOrigin, setTrfOrigin] = useState(locations[2]?.id || 'loc_industrial_hub');
  const [trfDest, setTrfDest] = useState(locations[0]?.id || 'loc_doha_pearl');
  const [trfProductId, setTrfProductId] = useState(products[0]?.id || '');
  const [trfQty, setTrfQty] = useState('15');
  const [trfArrival, setTrfArrival] = useState('2026-11-15');

  // --- Gift Cards State ---
  const giftCards = storeDb.getGiftCards();
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [gcCode, setGcCode] = useState('');
  const [gcAmountQar, setGcAmountQar] = useState('500.00');
  const [gcCustomerName, setGcCustomerName] = useState('Tariq Al-Mansoori');
  const [gcCustomerEmail, setGcCustomerEmail] = useState('tariq.almansoori@qatar-holdings.qa');
  const [gcNote, setGcNote] = useState('VIP Concierge Credit');
  const [gcExpires, setGcExpires] = useState('2027-12-31');
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);

  // --- Open Add/Edit Product ---
  const handleOpenAddProduct = () => {
    setEditingProdId(null);
    setFormTitle('');
    setFormSlug('');
    setFormStatus('published');
    setFormShortDesc('Precision CNC milled Grade 5 titanium vapor platform compliant with Qatar MOPH 21+.');
    setFormFullDesc('Engineered with aerospace tolerances and certified for domestic Qatar fulfillment.');
    setFormBrand('Architek Titan');
    setFormVendor('Architek Titan Stuttgart GmbH');
    setFormCategory('regulated-mods');
    setFormProductType('hardware_mod');
    setFormTags('Titanium, DNA60C, Doha-Exclusive');
    setFormImages([PRESET_IMAGES[0].url]);
    setFormPriceQar('850.00');
    setFormComparePriceQar('980.00');
    setFormCostQar('420.00');
    const randSku = `QA-MOD-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormSku(randSku);
    setFormBarcode('6291041500921');
    setFormTrackQty(true);
    setFormContinueOut(false);
    setFormIsPhysical(true);
    setFormWeightGrams('220');
    setFormSeoTitle('');
    setFormSeoDesc('');
    setFormVariants([
      {
        id: `var_${Date.now()}_1`,
        sku: `${randSku}-BLK`,
        barcode: '6291041500921',
        title: 'Matte Black Anodized',
        attributes: { Finish: 'Matte Black Anodized' },
        priceMinorUnits: 85000,
        compareAtPriceMinorUnits: 98000,
        costPerItemMinorUnits: 42000,
        stockQuantity: 20,
        committedQuantity: 0,
        incomingQuantity: 5,
        weightGrams: 220,
        image: PRESET_IMAGES[0].url,
      },
    ]);
    setFormMetafields([
      {
        id: `mf_${Date.now()}`,
        namespace: 'compliance',
        key: 'moph_certificate_id',
        value: 'QA-MOPH-2026-99102',
        type: 'single_line_text',
      },
    ]);
    setShowProductEditor(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProdId(p.id);
    setFormTitle(p.name);
    setFormSlug(p.slug);
    setFormStatus(p.status);
    setFormShortDesc(p.shortDescription);
    setFormFullDesc(p.fullDescription);
    setFormBrand(p.brand);
    setFormVendor(p.vendor || p.brand);
    setFormCategory(p.categoryId);
    setFormProductType(p.productType);
    setFormTags((p.tags || p.seoKeywords || []).join(', '));
    setFormImages(p.galleryImages.length > 0 ? [...p.galleryImages] : [PRESET_IMAGES[0].url]);
    setFormPriceQar((p.basePriceMinorUnits / 100).toFixed(2));
    setFormComparePriceQar(((p.compareAtPriceMinorUnits || Math.round(p.basePriceMinorUnits * 1.15)) / 100).toFixed(2));
    setFormCostQar(((p.costPerItemMinorUnits || Math.round(p.basePriceMinorUnits * 0.5)) / 100).toFixed(2));
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '6291041500214');
    setFormTrackQty(p.trackQuantity ?? true);
    setFormContinueOut(p.continueSellingWhenOutOfStock ?? false);
    setFormIsPhysical(p.isPhysicalProduct ?? true);
    setFormWeightGrams((p.shippingWeightGrams || p.variants[0]?.weightGrams || 200).toString());
    setFormSeoTitle(p.seoTitle);
    setFormSeoDesc(p.seoDescription);
    setFormVariants(JSON.parse(JSON.stringify(p.variants)));
    setFormMetafields(JSON.parse(JSON.stringify(p.metafields || [])));
    setShowProductEditor(true);
  };

  const handleSaveProduct = () => {
    if (!formTitle.trim()) return;
    const priceMinor = Math.round((parseFloat(formPriceQar) || 100) * 100);
    const compareMinor = Math.round((parseFloat(formComparePriceQar) || 0) * 100);
    const costMinor = Math.round((parseFloat(formCostQar) || 0) * 100);
    const weightG = parseInt(formWeightGrams, 10) || 200;
    const prodId = editingProdId || `prod_${Date.now()}`;
    const cleanSlug =
      formSlug.trim() ||
      formTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const existing = editingProdId ? storeDb.getProductById(editingProdId) : null;
    const finalVariants: ProductVariant[] =
      formVariants.length > 0
        ? formVariants.map((v) => ({
            ...v,
            priceMinorUnits: v.priceMinorUnits || priceMinor,
            weightGrams: v.weightGrams || weightG,
          }))
        : [
            {
              id: `var_${Date.now()}`,
              sku: formSku.trim() || 'SKU-QA-01',
              barcode: formBarcode.trim(),
              title: 'Standard Edition',
              attributes: { Edition: 'Standard' },
              priceMinorUnits: priceMinor,
              compareAtPriceMinorUnits: compareMinor,
              costPerItemMinorUnits: costMinor,
              stockQuantity: 20,
              weightGrams: weightG,
              image: formImages[0],
            },
          ];

    const savedProd: Product = {
      id: prodId,
      name: formTitle.trim(),
      slug: cleanSlug,
      sku: formSku.trim() || 'SKU-QA-01',
      barcode: formBarcode.trim(),
      brand: formBrand.trim() || 'AURA Precision',
      vendor: formVendor.trim() || formBrand.trim(),
      categoryId: formCategory,
      productType: formProductType,
      tags: parsedTags,
      shortDescription: formShortDesc.trim(),
      fullDescription: formFullDesc.trim() || formShortDesc.trim(),
      galleryImages: formImages.length > 0 ? formImages : [PRESET_IMAGES[0].url],
      specs: existing?.specs || { Origin: 'Qatar Exclusive Hub', Standard: 'MOPH 21+ Certified' },
      attributes: existing?.attributes || [{ id: 'finish', name: 'Finish', values: ['Standard'] }],
      variants: finalVariants,
      status: formStatus,
      basePriceMinorUnits: priceMinor,
      compareAtPriceMinorUnits: compareMinor,
      costPerItemMinorUnits: costMinor,
      trackQuantity: formTrackQty,
      continueSellingWhenOutOfStock: formContinueOut,
      isPhysicalProduct: formIsPhysical,
      shippingWeightGrams: weightG,
      countrySpecificPrices: {
        ...(existing?.countrySpecificPrices || {}),
        QA: priceMinor,
      },
      currencySpecificPrices: {
        ...(existing?.currencySpecificPrices || {}),
        QAR: priceMinor,
      },
      isAgeRestricted: true,
      complianceWarning: 'Qatar 21+ MOPH Verification Mandatory',
      featured: true,
      seoTitle: formSeoTitle.trim() || `${formTitle.trim()} | AURA Qatar`,
      seoDescription: formSeoDesc.trim() || formShortDesc.trim(),
      seoKeywords: parsedTags.length > 0 ? parsedTags : ['vape qatar', 'doha luxury'],
      metafields: formMetafields,
    };

    storeDb.saveProduct(savedProd);
    setShowProductEditor(false);
    onRefreshData();
    triggerToast(editingProdId ? `Updated "${savedProd.name}"` : `Added "${savedProd.name}" to catalog`);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (prodStatusFilter !== 'all' && p.status !== prodStatusFilter) return false;
    if (prodCategoryFilter !== 'all' && p.categoryId !== prodCategoryFilter) return false;
    if (prodSearch.trim()) {
      const q = prodSearch.toLowerCase().trim();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.vendor || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleToggleSelectAllProducts = () => {
    if (selectedProdIds.length === filteredProducts.length) {
      setSelectedProdIds([]);
    } else {
      setSelectedProdIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleExportProductsCsv = () => {
    setShowCsvExportModal(true);
  };

  // --- Collections Handlers ---
  const handleOpenCreateCollection = () => {
    setEditingCollection(null);
    setColTitle('');
    setColHandle('');
    setColDesc('');
    setColType('automated');
    setColSort('best_selling');
    setColImage(PRESET_IMAGES[0].url);
    setColConditions([{ id: `c_${Date.now()}`, field: 'price', operator: 'greater_than', value: '300' }]);
    setColManualProductIds([products[0]?.id || '']);
    setColSeoTitle('');
    setColSeoDesc('');
    setShowCollectionModal(true);
  };

  const handleOpenEditCollection = (col: ProductCollection) => {
    setEditingCollection(col);
    setColTitle(col.title);
    setColHandle(col.handle);
    setColDesc(col.description);
    setColType(col.type);
    setColSort(col.sortOrder);
    setColImage(col.image);
    setColConditions(col.conditions.length > 0 ? [...col.conditions] : [{ id: 'c1', field: 'tag', operator: 'contains', value: 'titanium' }]);
    setColManualProductIds([...col.productIds]);
    setColSeoTitle(col.seoTitle);
    setColSeoDesc(col.seoDescription);
    setShowCollectionModal(true);
  };

  const handleSaveCollection = () => {
    if (!colTitle.trim()) return;
    const handle =
      colHandle.trim() ||
      colTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const saved: ProductCollection = {
      id: editingCollection?.id || `col_${Date.now()}`,
      title: colTitle.trim(),
      handle,
      description: colDesc.trim(),
      image: colImage,
      type: colType,
      conditions: colType === 'automated' ? colConditions : [],
      productIds: colType === 'manual' ? colManualProductIds : [],
      sortOrder: colSort,
      seoTitle: colSeoTitle.trim() || `${colTitle.trim()} | AURA Qatar`,
      seoDescription: colSeoDesc.trim() || colDesc.trim(),
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    storeDb.saveCollection(saved);
    setShowCollectionModal(false);
    onRefreshData();
    triggerToast(`Saved collection "${saved.title}"`);
  };

  // --- Create Transfer Handler ---
  const handleCreateTransfer = () => {
    const prod = products.find((p) => p.id === trfProductId) || products[0];
    if (!prod) return;
    const variant = prod.variants[0];
    const qty = Math.max(1, parseInt(trfQty, 10) || 10);
    const newTransfer: InventoryTransfer = {
      id: `trf_${Date.now()}`,
      referenceNumber: `#T0${Math.floor(105 + Math.random() * 890)}`,
      originLocationId: trfOrigin,
      destinationLocationId: trfDest,
      status: 'in_transit',
      items: [
        {
          productId: prod.id,
          variantId: variant.id,
          productName: prod.name,
          sku: variant.sku,
          quantity: qty,
        },
      ],
      expectedArrival: trfArrival,
      createdAt: new Date().toISOString(),
      notes: 'Created via Shopify Admin Inventory Transfer console',
    };
    storeDb.saveTransfer(newTransfer);
    setShowTransferModal(false);
    onRefreshData();
    triggerToast(`Created inventory transfer ${newTransfer.referenceNumber}`);
  };

  // --- Issue Gift Card Handler ---
  const handleIssueGiftCard = () => {
    const valMinor = Math.round((parseFloat(gcAmountQar) || 500) * 100);
    const code =
      gcCode.trim().toUpperCase() ||
      `AURA-QA${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}-VIP`;
    const newCard: GiftCard = {
      id: `gc_${Date.now()}`,
      code,
      initialValueMinorUnits: valMinor,
      balanceMinorUnits: valMinor,
      currencyCode: 'QAR',
      customerName: gcCustomerName.trim(),
      customerEmail: gcCustomerEmail.trim(),
      recipientNote: gcNote.trim(),
      expiresAt: gcExpires,
      status: 'active',
      createdAt: new Date().toISOString(),
      transactions: [
        {
          id: `gct_${Date.now()}`,
          date: new Date().toISOString(),
          amountMinorUnits: valMinor,
          type: 'issue',
          note: `Issued ${(valMinor / 100).toFixed(2)} QAR gift card to ${gcCustomerName}`,
        },
      ],
    };
    storeDb.saveGiftCard(newCard);
    setShowGiftCardModal(false);
    onRefreshData();
    triggerToast(`Issued Gift Card ${code} (${(valMinor / 100).toFixed(2)} QAR)`);
  };

  // Calculate live Profit & Margin in Product Editor
  const editorPriceMinor = Math.round((parseFloat(formPriceQar) || 0) * 100);
  const editorCostMinor = Math.round((parseFloat(formCostQar) || 0) * 100);
  const { profitMinorUnits, marginPercent } = calculateProfitAndMargin(editorPriceMinor, editorCostMinor);

  return (
    <div className="space-y-5">
      {/* Sub-navigation Switcher Bar (Products | Collections | Inventory | Gift Cards) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubView('products')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'products'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>All Products ({products.length})</span>
          </button>
          <button
            onClick={() => setSubView('collections')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'collections'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Collections ({collections.length})</span>
          </button>
          <button
            onClick={() => setSubView('inventory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'inventory'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Inventory &amp; Transfers</span>
          </button>
          <button
            onClick={() => setSubView('gift_cards')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subView === 'gift_cards'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Gift Cards ({giftCards.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subView === 'products' && (
            <>
              <button
                onClick={() => setShowBulkInventoryModal(true)}
                data-testid="open-bulk-inventory-btn"
                className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bulk Inventory Update</span>
              </button>
              <button
                onClick={() => setShowCsvImportModal(true)}
                className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Products</span>
              </button>
              <button
                onClick={handleExportProductsCsv}
                className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Products</span>
              </button>
              <button
                onClick={handleOpenAddProduct}
                className="px-3.5 py-1.5 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </>
          )}
          {subView === 'collections' && (
            <button
              onClick={handleOpenCreateCollection}
              className="px-3.5 py-1.5 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Collection</span>
            </button>
          )}
          {subView === 'inventory' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkInventoryModal(true)}
                data-testid="open-bulk-inventory-inv-btn"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Bulk Inventory Update
                  {selectedInvVariantIds.length > 0 ? ` (${selectedInvVariantIds.length})` : ''}
                </span>
              </button>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-3.5 py-1.5 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Inventory Transfer</span>
              </button>
            </div>
          )}
          {subView === 'gift_cards' && (
            <button
              onClick={() => {
                setGcCode(`AURA-QA${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}-VIP`);
                setShowGiftCardModal(true);
              }}
              className="px-3.5 py-1.5 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Gift Card</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-VIEW 1: PRODUCTS LIST & BULK EDITOR */}
      {/* ===================================================================== */}
      {subView === 'products' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
          {/* Filter Tabs & Search Bar */}
          <div className="p-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60">
            <div className="flex items-center gap-1">
              {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setProdStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                    prodStatusFilter === st
                      ? 'bg-neutral-200/80 text-neutral-900 font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {st === 'published' ? 'Active' : st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={prodCategoryFilter}
                onChange={(e) => setProdCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-700"
              >
                <option value="all">All Categories</option>
                <option value="regulated-mods">Precision Box Mods</option>
                <option value="atomizers-tanks">Rebuildable Atomizers</option>
                <option value="botanical-eliquids">Botanical Extracts</option>
                <option value="billet-accessories">Billet Accessories</option>
              </select>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Search title, SKU, tag, vendor..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Bar when items selected */}
          {selectedProdIds.length > 0 && (
            <div className="px-4 py-2.5 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold">{selectedProdIds.length} selected</span>
                <button
                  onClick={() => {
                    storeDb.bulkUpdateProducts(selectedProdIds, { status: 'published' });
                    onRefreshData();
                    triggerToast(`Set ${selectedProdIds.length} products to Active`);
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md cursor-pointer"
                >
                  Set Active
                </button>
                <button
                  onClick={() => {
                    storeDb.bulkUpdateProducts(selectedProdIds, { status: 'draft' });
                    onRefreshData();
                    triggerToast(`Set ${selectedProdIds.length} products to Draft`);
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md cursor-pointer"
                >
                  Set Draft
                </button>
                <button
                  onClick={() => {
                    storeDb.bulkUpdateProducts(selectedProdIds, { status: 'archived' });
                    onRefreshData();
                    triggerToast(`Archived ${selectedProdIds.length} products`);
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md cursor-pointer"
                >
                  Archive
                </button>
                <button
                  onClick={() => {
                    storeDb.bulkUpdateProducts(selectedProdIds, { priceAdjustmentPercent: 5 });
                    onRefreshData();
                    triggerToast(`Increased price by +5% on ${selectedProdIds.length} products`);
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md cursor-pointer"
                >
                  +5% Price
                </button>
                <button
                  onClick={() => {
                    storeDb.bulkUpdateProducts(selectedProdIds, { priceAdjustmentPercent: -5 });
                    onRefreshData();
                    triggerToast(`Reduced price by -5% on ${selectedProdIds.length} products`);
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md cursor-pointer"
                >
                  -5% Price
                </button>
                <button
                  onClick={() => setShowBulkInventoryModal(true)}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>Bulk Update Inventory ({selectedProdIds.length})</span>
                </button>
                <button
                  onClick={() => setShowCsvExportModal(true)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Selected ({selectedProdIds.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="Tag to add..."
                  className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-md text-xs text-white w-28"
                />
                <button
                  onClick={() => {
                    if (!bulkTagInput.trim()) return;
                    storeDb.bulkUpdateProducts(selectedProdIds, { addTag: bulkTagInput.trim() });
                    setBulkTagInput('');
                    onRefreshData();
                    triggerToast(`Added tag "${bulkTagInput}" to ${selectedProdIds.length} products`);
                  }}
                  className="px-2.5 py-1 bg-[#8a1538] hover:bg-[#72112d] rounded-md font-medium cursor-pointer"
                >
                  Apply Tag
                </button>
                <button
                  onClick={() => setSelectedProdIds([])}
                  className="text-neutral-400 hover:text-white ml-2 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Products Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedProdIds.length === filteredProducts.length}
                      onChange={handleToggleSelectAllProducts}
                      className="rounded border-neutral-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Inventory</th>
                  <th className="py-3 px-3">Price &amp; Compare</th>
                  <th className="py-3 px-3">Cost &amp; Margin</th>
                  <th className="py-3 px-3">Vendor &amp; Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {filteredProducts.map((product) => {
                  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
                  const costMinor = product.costPerItemMinorUnits || Math.round(product.basePriceMinorUnits * 0.5);
                  const { marginPercent } = calculateProfitAndMargin(product.basePriceMinorUnits, costMinor);
                  const isSelected = selectedProdIds.includes(product.id);

                  return (
                    <tr key={product.id} className={`hover:bg-neutral-50/80 transition-colors ${isSelected ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedProdIds((prev) =>
                              prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]
                            )
                          }
                          className="rounded border-neutral-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.galleryImages[0]}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div
                              onClick={() => handleOpenEditProduct(product)}
                              className="font-semibold text-neutral-900 hover:text-[#8a1538] cursor-pointer"
                            >
                              {product.name}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                              SKU: {product.sku} · {product.variants.length} variant(s)
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-semibold capitalize ${
                            product.status === 'published'
                              ? 'text-emerald-700'
                              : product.status === 'draft'
                              ? 'text-amber-700'
                              : 'text-neutral-500'
                          }`}
                        >
                          {product.status === 'published' ? 'Active' : product.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <span className={totalStock <= 5 ? 'text-red-600 font-bold' : 'text-neutral-800 font-semibold'}>
                          {totalStock} in stock
                        </span>
                        {totalStock <= 5 && (
                          <div className="text-[10px] text-red-600">Low stock alert</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <div className="font-bold text-neutral-900">
                          {formatMinorUnits(product.basePriceMinorUnits, baseCurrency)}
                        </div>
                        {product.compareAtPriceMinorUnits && product.compareAtPriceMinorUnits > product.basePriceMinorUnits && (
                          <div className="text-[10px] text-neutral-400 line-through">
                            {formatMinorUnits(product.compareAtPriceMinorUnits, baseCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <div className="text-neutral-700">{(costMinor / 100).toFixed(2)} QAR cost</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{marginPercent}% margin</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-neutral-800 font-medium">{product.vendor || product.brand}</div>
                        <div className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                          {(product.tags || []).join(' · ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const copy = storeDb.duplicateProduct(product.id);
                              onRefreshData();
                              if (copy) triggerToast(`Duplicated "${copy.name}"`);
                            }}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg cursor-pointer"
                            title="Duplicate Product"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              storeDb.saveProduct({
                                ...product,
                                status: product.status === 'archived' ? 'published' : 'archived',
                              });
                              onRefreshData();
                              triggerToast(
                                product.status === 'archived'
                                  ? `Unarchived "${product.name}"`
                                  : `Archived "${product.name}"`
                              );
                            }}
                            className="p-1.5 text-neutral-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Archive / Unarchive Product"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 2: COLLECTIONS (MANUAL & AUTOMATED) */}
      {/* ===================================================================== */}
      {subView === 'collections' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {collections.map((col) => {
            const matchedProducts =
              col.type === 'automated'
                ? products.filter((p) => evaluateAutomatedCollection(p, col.conditions))
                : products.filter((p) => col.productIds.includes(p.id));

            return (
              <div
                key={col.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 bg-neutral-100 relative overflow-hidden border-b border-neutral-200">
                    <img
                      src={col.image}
                      alt={col.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-neutral-900/85 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize">
                      {col.type} Collection
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">{col.title}</h3>
                      <span className="text-xs font-mono font-semibold text-[#8a1538] shrink-0">
                        {matchedProducts.length} items
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-2">{col.description}</p>
                    {col.type === 'automated' && col.conditions.length > 0 && (
                      <div className="pt-1 text-[11px] text-neutral-500 font-mono">
                        Rule: {col.conditions.map((c) => `${c.field} ${c.operator} "${c.value}"`).join(' AND ')}
                      </div>
                    )}
                    <div className="pt-2 flex flex-wrap gap-1">
                      {matchedProducts.slice(0, 3).map((mp) => (
                        <span key={mp.id} className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                          {mp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-mono">/{col.handle}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCollection(col)}
                      className="px-2.5 py-1 border border-neutral-300 hover:bg-white rounded-md font-medium text-neutral-700 cursor-pointer"
                    >
                      Edit Rules
                    </button>
                    <button
                      onClick={() => {
                        storeDb.deleteCollection(col.id);
                        onRefreshData();
                        triggerToast(`Deleted collection "${col.title}"`);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 3: INVENTORY, LOCATIONS, TRANSFERS & STOCK HISTORY */}
      {/* ===================================================================== */}
      {subView === 'inventory' && (
        <div className="space-y-4">
          {/* Sub-tabs for Inventory */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInvTab('levels')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  invTab === 'levels' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Location Stock Levels
              </button>
              <button
                onClick={() => setInvTab('transfers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  invTab === 'transfers' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Inventory Transfers ({transfers.length})
              </button>
              <button
                onClick={() => setInvTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  invTab === 'history' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Stock Adjustment History ({stockHistory.length})
              </button>
            </div>

            {invTab === 'levels' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800"
                >
                  <option value="all">All Qatar Locations ({locations.length})</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer px-2.5 py-1.5 border border-neutral-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={invLowStockOnly}
                    onChange={(e) => setInvLowStockOnly(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span>Low Stock Only (&le; 10)</span>
                </label>
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Filter SKU or item..."
                  className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs w-44"
                />
              </div>
            )}
          </div>

          {invTab === 'levels' && (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
              {selectedInvVariantIds.length > 0 && (
                <div className="px-4 py-2.5 bg-neutral-900 text-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {selectedInvVariantIds.length} variant(s) selected for bulk stock update
                    </span>
                    <button
                      onClick={() => setShowBulkInventoryModal(true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Open Bulk Inventory Updater</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedInvVariantIds([])}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                      <th className="py-3 px-4 w-8">
                        <input
                          type="checkbox"
                          checked={
                            products.flatMap((p) => p.variants).length > 0 &&
                            selectedInvVariantIds.length === products.flatMap((p) => p.variants).length
                          }
                          onChange={() => {
                            const allVarIds = products.flatMap((p) => p.variants.map((v) => v.id));
                            if (selectedInvVariantIds.length === allVarIds.length) {
                              setSelectedInvVariantIds([]);
                            } else {
                              setSelectedInvVariantIds(allVarIds);
                            }
                          }}
                          className="rounded border-neutral-300 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">Product &amp; Variant</th>
                      <th className="py-3 px-3">SKU / Barcode</th>
                      <th className="py-3 px-3 text-right">Incoming</th>
                      <th className="py-3 px-3 text-right">Committed</th>
                      <th className="py-3 px-3 text-right">Available</th>
                      <th className="py-3 px-4 text-right">Adjust Stock Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {products.flatMap((p) =>
                      p.variants
                        .filter((v) => {
                          if (invLowStockOnly && v.stockQuantity > 10) return false;
                          if (invSearch.trim()) {
                            const q = invSearch.toLowerCase();
                            return p.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q);
                          }
                          return true;
                        })
                        .map((v) => {
                          const key = `${p.id}_${v.id}`;
                          const locAvailable =
                            selectedLocationId === 'all'
                              ? v.stockQuantity
                              : v.locationStock?.[selectedLocationId] ?? v.stockQuantity;
                          const targetLocId =
                            selectedLocationId === 'all' ? 'loc_doha_pearl' : selectedLocationId;
                          const isVarSelected = selectedInvVariantIds.includes(v.id);

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-neutral-50/80 ${
                                isVarSelected ? 'bg-emerald-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={isVarSelected}
                                  onChange={() =>
                                    setSelectedInvVariantIds((prev) =>
                                      prev.includes(v.id)
                                        ? prev.filter((id) => id !== v.id)
                                        : [...prev, v.id]
                                    )
                                  }
                                  className="rounded border-neutral-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-neutral-900">{p.name}</div>
                                <div className="text-[11px] text-neutral-500">{v.title}</div>
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-neutral-600 tabular-nums">
                                <div>{v.sku}</div>
                                <div className="text-neutral-400">{v.barcode || p.barcode || '—'}</div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-700">
                                +{v.incomingQuantity || 0}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700">
                                {v.committedQuantity || 0}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums">
                                <span
                                  className={`font-bold text-sm ${
                                    locAvailable <= 5 ? 'text-red-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {locAvailable}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={adjustReasonMap[key] || 'correction'}
                                    onChange={(e) =>
                                      setAdjustReasonMap({
                                        ...adjustReasonMap,
                                        [key]: e.target.value as StockHistoryEntry['reason'],
                                      })
                                    }
                                    className="px-2 py-1 border border-neutral-300 rounded-md text-[11px] bg-white"
                                  >
                                    <option value="correction">Inventory count correction</option>
                                    <option value="received">Restock received</option>
                                    <option value="damaged">Damaged / QA hold</option>
                                    <option value="return_restock">Customer return restock</option>
                                  </select>
                                  <input
                                    type="number"
                                    value={adjustDeltaMap[key] || ''}
                                    onChange={(e) =>
                                      setAdjustDeltaMap({ ...adjustDeltaMap, [key]: e.target.value })
                                    }
                                    placeholder="+/- qty"
                                    className="w-20 px-2 py-1 border border-neutral-300 rounded-md text-xs font-mono text-right"
                                  />
                                  <button
                                    onClick={() => {
                                      const delta = parseInt(adjustDeltaMap[key] || '0', 10);
                                      if (!delta) return;
                                      storeDb.adjustVariantStock(
                                        p.id,
                                        v.id,
                                        targetLocId,
                                        delta,
                                        adjustReasonMap[key] || 'correction'
                                      );
                                      setAdjustDeltaMap({ ...adjustDeltaMap, [key]: '' });
                                      onRefreshData();
                                      triggerToast(
                                        `Adjusted ${v.sku} stock by ${delta > 0 ? `+${delta}` : delta}`
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {invTab === 'transfers' && (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-3">Origin &rarr; Destination</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3">Expected Arrival</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {transfers.map((trf) => {
                    const origName = locations.find((l) => l.id === trf.originLocationId)?.name || trf.originLocationId;
                    const destName = locations.find((l) => l.id === trf.destinationLocationId)?.name || trf.destinationLocationId;
                    return (
                      <tr key={trf.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">{trf.referenceNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-neutral-800">{origName}</div>
                          <div className="text-[11px] text-neutral-500">&rarr; {destName}</div>
                        </td>
                        <td className="py-3 px-3">
                          {trf.items.map((it, idx) => (
                            <div key={idx} className="text-neutral-700 font-mono">
                              {it.quantity}x {it.productName} ({it.sku})
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-3 font-mono text-neutral-600">{trf.expectedArrival}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold capitalize ${
                              trf.status === 'received' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {trf.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {trf.status !== 'received' ? (
                            <button
                              onClick={() => {
                                storeDb.receiveTransfer(trf.id);
                                onRefreshData();
                                triggerToast(`Received transfer ${trf.referenceNumber} and incremented stock`);
                              }}
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Receive Inventory
                            </button>
                          ) : (
                            <span className="text-neutral-400">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {invTab === 'history' && (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-3">Product / SKU</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Delta</th>
                    <th className="py-3 px-4 text-right">New Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {stockHistory.map((sh) => (
                    <tr key={sh.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {new Date(sh.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">{sh.productName}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{sh.sku} · {sh.adjustedBy}</div>
                      </td>
                      <td className="py-3 px-3 text-neutral-700">{sh.locationName}</td>
                      <td className="py-3 px-3 capitalize text-neutral-600">{sh.reason.replace('_', ' ')}</td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold ${
                          sh.delta > 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {sh.delta > 0 ? `+${sh.delta}` : sh.delta}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                        {sh.newAvailable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 4: GIFT CARDS */}
      {/* ===================================================================== */}
      {subView === 'gift_cards' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Gift Card Code</th>
                <th className="py-3 px-3">Customer / Recipient</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Initial Value</th>
                <th className="py-3 px-3 text-right">Current Balance</th>
                <th className="py-3 px-3">Expires</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {giftCards.map((gc) => (
                <tr key={gc.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-900">{gc.code}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-neutral-900">{gc.customerName || 'Unassigned'}</div>
                    <div className="text-[11px] text-neutral-500">{gc.customerEmail}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold capitalize ${
                        gc.status === 'active' ? 'text-emerald-700' : 'text-neutral-500'
                      }`}
                    >
                      {gc.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-600">
                    {(gc.initialValueMinorUnits / 100).toFixed(2)} QAR
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                    {(gc.balanceMinorUnits / 100).toFixed(2)} QAR
                  </td>
                  <td className="py-3 px-3 font-mono text-neutral-600">{gc.expiresAt || 'Never'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedGiftCard(gc)}
                        className="px-2.5 py-1 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                      >
                        Ledger ({gc.transactions.length})
                      </button>
                      <button
                        onClick={() => {
                          storeDb.saveGiftCard({
                            ...gc,
                            status: gc.status === 'active' ? 'disabled' : 'active',
                          });
                          onRefreshData();
                          triggerToast(`Updated gift card ${gc.code}`);
                        }}
                        className="px-2.5 py-1 border border-neutral-300 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                      >
                        {gc.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: FULL SHOPIFY PRODUCT EDITOR */}
      {/* ===================================================================== */}
      {showProductEditor && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowProductEditor(false)}
        >
          <div
            className="w-full max-w-5xl bg-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">
                  {editingProdId ? `Edit Product: ${formTitle}` : 'Add New Product'}
                </h3>
                <p className="text-xs text-neutral-400">
                  Complete Shopify Product Management — Media, Variants, Pricing, Cost/Margin, SEO &amp; Metafields
                </p>
              </div>
              <button
                onClick={() => setShowProductEditor(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2-Column Shopify Product Layout */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns */}
              <div className="lg:col-span-2 space-y-5">
                {/* 1. Title & Rich Text Description */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Architek Titan 100W Limited Edition"
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Short Catalog Summary
                    </label>
                    <input
                      type="text"
                      value={formShortDesc}
                      onChange={(e) => setFormShortDesc(e.target.value)}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-neutral-700">
                        Rich Text Description
                      </label>
                      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md border border-neutral-200">
                        <button
                          type="button"
                          onClick={() => setFormFullDesc((d) => `${d} **Aerospace Grade 5 Titanium**`)}
                          className="p-1 hover:bg-white rounded text-neutral-700 cursor-pointer"
                          title="Bold text"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormFullDesc((d) => `${d} *MOPH 21+ Certified*`)}
                          className="p-1 hover:bg-white rounded text-neutral-700 cursor-pointer"
                          title="Italic text"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormFullDesc((d) => `${d}\n### Key Engineering Highlights\n`)}
                          className="p-1 hover:bg-white rounded text-neutral-700 cursor-pointer"
                          title="Add Heading"
                        >
                          <Heading2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormFullDesc(
                              (d) => `${d}\n• CNC Milled +/- 0.02mm tolerance\n• 24K Gold-plated spring 510 connection`
                            )
                          }
                          className="p-1 hover:bg-white rounded text-neutral-700 cursor-pointer"
                          title="Bullet List"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={formFullDesc}
                      onChange={(e) => setFormFullDesc(e.target.value)}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-sans"
                    />
                  </div>
                </div>

                {/* 2. Media Gallery & Reordering */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Media Gallery (Images &amp; Video Ordering)
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value && !formImages.includes(e.target.value)) {
                            setFormImages([...formImages, e.target.value]);
                          }
                        }}
                        className="px-2.5 py-1 border border-neutral-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">+ Add Studio Asset...</option>
                        {PRESET_IMAGES.map((img) => (
                          <option key={img.url} value={img.url}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {formImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="border border-neutral-200 rounded-xl p-2 bg-neutral-50 flex flex-col justify-between gap-2"
                      >
                        <img
                          src={imgUrl}
                          alt={`Media ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-neutral-600">
                            {idx === 0 ? 'Primary' : `#${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...formImages];
                                  const temp = copy[idx - 1];
                                  copy[idx - 1] = copy[idx];
                                  copy[idx] = temp;
                                  setFormImages(copy);
                                }}
                                className="p-1 hover:bg-neutral-200 rounded cursor-pointer"
                                title="Move earlier"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}
                            {idx < formImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...formImages];
                                  const temp = copy[idx + 1];
                                  copy[idx + 1] = copy[idx];
                                  copy[idx] = temp;
                                  setFormImages(copy);
                                }}
                                className="p-1 hover:bg-neutral-200 rounded cursor-pointer"
                                title="Move later"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}
                            {formImages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))}
                                className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste custom image or video URL..."
                      className="grow px-3 py-1.5 border border-neutral-300 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newImageUrl.trim()) return;
                        setFormImages([...formImages, newImageUrl.trim()]);
                        setNewImageUrl('');
                      }}
                      className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Add Media URL
                    </button>
                  </div>
                </div>

                {/* 3. Pricing, Compare-at, Cost per item & Profit Margin */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase">
                    Pricing, Cost per Item &amp; Profit Margin (QAR)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Price (QAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formPriceQar}
                        onChange={(e) => setFormPriceQar(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Compare-at Price (QAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formComparePriceQar}
                        onChange={(e) => setFormComparePriceQar(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Cost per Item (QAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostQar}
                        onChange={(e) => setFormCostQar(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-neutral-500">Unit Profit: </span>
                      <strong className="text-neutral-900">{(profitMinorUnits / 100).toFixed(2)} QAR</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Gross Margin: </span>
                      <strong className="text-emerald-700">{marginPercent}%</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Multi-Variant Matrix */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Product Variants (Size, Color, Finish, SKU &amp; Stock)
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setFormVariants([
                          ...formVariants,
                          {
                            id: `var_${Date.now()}`,
                            sku: `${formSku}-V${formVariants.length + 1}`,
                            title: `Edition ${formVariants.length + 1}`,
                            attributes: { Option: `Edition ${formVariants.length + 1}` },
                            priceMinorUnits: editorPriceMinor || 85000,
                            stockQuantity: 15,
                            weightGrams: parseInt(formWeightGrams, 10) || 200,
                          },
                        ])
                      }
                      className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formVariants.map((v, idx) => (
                      <div
                        key={v.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-neutral-500">Variant Title</label>
                          <input
                            type="text"
                            value={v.title}
                            onChange={(e) => {
                              const copy = [...formVariants];
                              copy[idx].title = e.target.value;
                              setFormVariants(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-neutral-500">Variant SKU</label>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => {
                              const copy = [...formVariants];
                              copy[idx].sku = e.target.value;
                              setFormVariants(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-neutral-500">Price (QAR)</label>
                          <input
                            type="number"
                            value={(v.priceMinorUnits / 100).toFixed(0)}
                            onChange={(e) => {
                              const copy = [...formVariants];
                              copy[idx].priceMinorUnits = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setFormVariants(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-neutral-500">Stock Qty</label>
                          <input
                            type="number"
                            value={v.stockQuantity}
                            onChange={(e) => {
                              const copy = [...formVariants];
                              copy[idx].stockQuantity = parseInt(e.target.value, 10) || 0;
                              setFormVariants(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-mono"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right pt-3">
                          {formVariants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormVariants(formVariants.filter((_, i) => i !== idx))}
                              className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Metafields & SEO */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Custom Product Metafields
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setFormMetafields([
                          ...formMetafields,
                          {
                            id: `mf_${Date.now()}`,
                            namespace: 'custom',
                            key: 'batch_code',
                            value: 'QA-2026-V1',
                            type: 'single_line_text',
                          },
                        ])
                      }
                      className="px-2.5 py-1 border border-neutral-300 rounded-md text-xs font-medium cursor-pointer"
                    >
                      + Add Metafield
                    </button>
                  </div>
                  {formMetafields.map((mf, i) => (
                    <div key={mf.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <input
                        type="text"
                        value={mf.namespace}
                        onChange={(e) => {
                          const copy = [...formMetafields];
                          copy[i].namespace = e.target.value;
                          setFormMetafields(copy);
                        }}
                        placeholder="Namespace"
                        className="col-span-3 px-2 py-1.5 border border-neutral-300 rounded font-mono"
                      />
                      <input
                        type="text"
                        value={mf.key}
                        onChange={(e) => {
                          const copy = [...formMetafields];
                          copy[i].key = e.target.value;
                          setFormMetafields(copy);
                        }}
                        placeholder="Key"
                        className="col-span-4 px-2 py-1.5 border border-neutral-300 rounded font-mono"
                      />
                      <input
                        type="text"
                        value={mf.value}
                        onChange={(e) => {
                          const copy = [...formMetafields];
                          copy[i].value = e.target.value;
                          setFormMetafields(copy);
                        }}
                        placeholder="Value"
                        className="col-span-4 px-2 py-1.5 border border-neutral-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setFormMetafields(formMetafields.filter((_, idx) => idx !== i))}
                        className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Status, Organization, Inventory & SEO */}
              <div className="space-y-5">
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
                  <label className="block text-xs font-bold text-neutral-900 uppercase">
                    Product Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Product['status'])}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="published">Active (Published on Storefront)</option>
                    <option value="draft">Draft (Hidden from Storefront)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase">
                    Product Organization
                  </h4>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
                    >
                      <option value="regulated-mods">Precision Box Mods</option>
                      <option value="atomizers-tanks">Rebuildable Atomizers &amp; Tanks</option>
                      <option value="botanical-eliquids">Artisanal Botanical Extracts</option>
                      <option value="billet-accessories">Billet Hardware &amp; Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Brand</label>
                    <input
                      type="text"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Vendor / Supplier</label>
                    <input
                      type="text"
                      value={formVendor}
                      onChange={(e) => setFormVendor(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase">
                    Inventory, Barcode &amp; Shipping
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Primary SKU</label>
                      <input
                        type="text"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Barcode (GTIN)</label>
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formTrackQty}
                      onChange={(e) => setFormTrackQty(e.target.checked)}
                    />
                    <span>Track inventory quantity</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPhysical}
                      onChange={(e) => setFormIsPhysical(e.target.checked)}
                    />
                    <span>This is a physical product ({formWeightGrams}g)</span>
                  </label>
                </div>

                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase">
                    Search Engine Listing (SEO)
                  </h4>
                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-0.5">
                    <div className="text-xs font-semibold text-blue-700 truncate">
                      {formSeoTitle || `${formTitle || 'Product'} | AURA Qatar`}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono">
                      https://aura.qa/products/{formSlug || 'product-handle'}
                    </div>
                    <div className="text-[11px] text-neutral-600 line-clamp-2">
                      {formSeoDesc || formShortDesc}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="URL handle"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-neutral-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowProductEditor(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-5 py-2 bg-[#8a1538] hover:bg-[#72112d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingProdId ? 'Update Product' : 'Save Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE PRODUCT */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 mb-2">Delete Product?</h3>
            <p className="text-xs text-neutral-600 mb-5">
              Permanently remove <strong>&ldquo;{productToDelete.name}&rdquo;</strong> from the catalog?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  storeDb.deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  onRefreshData();
                  triggerToast(`Deleted "${productToDelete.name}"`);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHOPIFY CSV PRODUCT IMPORT */}
      <ProductCsvImportModal
        isOpen={showCsvImportModal}
        onClose={() => setShowCsvImportModal(false)}
        existingProducts={products}
        baseCurrency={baseCurrency}
        onImportComplete={(summaryToast) => {
          onRefreshData();
          triggerToast(summaryToast);
        }}
      />

      {/* MODAL: SHOPIFY CSV PRODUCT EXPORT */}
      <ProductCsvExportModal
        isOpen={showCsvExportModal}
        onClose={() => setShowCsvExportModal(false)}
        allProducts={products}
        filteredProducts={filteredProducts}
        selectedProductIds={selectedProdIds}
        collections={collections}
        onExportComplete={(summaryToast) => {
          triggerToast(summaryToast);
        }}
      />

      {/* MODAL: BULK INVENTORY UPDATE */}
      <BulkInventoryModal
        isOpen={showBulkInventoryModal}
        onClose={() => setShowBulkInventoryModal(false)}
        products={products}
        locations={locations}
        initialSelectedProductIds={selectedProdIds}
        initialSelectedVariantIds={selectedInvVariantIds}
        onCompleted={() => {
          onRefreshData();
        }}
        showToast={(msg) => triggerToast(msg)}
      />

      {/* MODAL: CREATE / EDIT COLLECTION */}
      {showCollectionModal && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCollectionModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">
              {editingCollection ? `Edit Collection: ${colTitle}` : 'Create Collection'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Collection Title</label>
              <input
                type="text"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="e.g. Doha VIP Titanium Reserve"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={colDesc}
                onChange={(e) => setColDesc(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Collection Type</label>
                <select
                  value={colType}
                  onChange={(e) => setColType(e.target.value as 'manual' | 'automated')}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
                >
                  <option value="automated">Automated (Rule-based)</option>
                  <option value="manual">Manual Selection</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Sort Order</label>
                <select
                  value={colSort}
                  onChange={(e) => setColSort(e.target.value as ProductCollection['sortOrder'])}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
                >
                  <option value="best_selling">Best Selling</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="alpha_asc">Alphabetical A-Z</option>
                </select>
              </div>
            </div>

            {colType === 'automated' ? (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="text-xs font-semibold text-neutral-800">Automated Conditions</div>
                {colConditions.map((cond, idx) => (
                  <div key={cond.id} className="grid grid-cols-3 gap-2 text-xs">
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const copy = [...colConditions];
                        copy[idx].field = e.target.value as CollectionCondition['field'];
                        setColConditions(copy);
                      }}
                      className="px-2 py-1.5 border border-neutral-300 rounded bg-white"
                    >
                      <option value="price">Product Price (QAR)</option>
                      <option value="tag">Product Tag</option>
                      <option value="vendor">Vendor</option>
                      <option value="inventory">Total Inventory</option>
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const copy = [...colConditions];
                        copy[idx].operator = e.target.value as CollectionCondition['operator'];
                        setColConditions(copy);
                      }}
                      className="px-2 py-1.5 border border-neutral-300 rounded bg-white"
                    >
                      <option value="greater_than">is greater than</option>
                      <option value="less_than">is less than</option>
                      <option value="contains">contains</option>
                      <option value="equals">is equal to</option>
                    </select>
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => {
                        const copy = [...colConditions];
                        copy[idx].value = e.target.value;
                        setColConditions(copy);
                      }}
                      className="px-2 py-1.5 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold text-neutral-800 mb-1">Assign Products</div>
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colManualProductIds.includes(p.id)}
                      onChange={() =>
                        setColManualProductIds((prev) =>
                          prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        )
                      }
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCollection}
                className="px-4 py-2 bg-[#8a1538] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE INVENTORY TRANSFER */}
      {showTransferModal && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">Create Inventory Transfer</h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Origin Location</label>
              <select
                value={trfOrigin}
                onChange={(e) => setTrfOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Destination Location</label>
              <select
                value={trfDest}
                onChange={(e) => setTrfDest(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Product</label>
                <select
                  value={trfProductId}
                  onChange={(e) => setTrfProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={trfQty}
                  onChange={(e) => setTrfQty(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransfer}
                className="px-4 py-2 bg-[#8a1538] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Dispatch Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE GIFT CARD */}
      {showGiftCardModal && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowGiftCardModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">Issue New Gift Card (QAR)</h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Gift Card Code</label>
              <input
                type="text"
                value={gcCode}
                onChange={(e) => setGcCode(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Initial Amount (QAR)</label>
                <input
                  type="number"
                  value={gcAmountQar}
                  onChange={(e) => setGcAmountQar(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={gcExpires}
                  onChange={(e) => setGcExpires(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={gcCustomerName}
                onChange={(e) => setGcCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGiftCardModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueGiftCard}
                className="px-4 py-2 bg-[#8a1538] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Generate &amp; Issue Gift Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GIFT CARD TRANSACTION LEDGER */}
      {selectedGiftCard && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedGiftCard(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-neutral-900">{selectedGiftCard.code}</h3>
              <button onClick={() => setSelectedGiftCard(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between text-xs font-mono">
              <span>Current Balance:</span>
              <strong className="text-emerald-700">
                {(selectedGiftCard.balanceMinorUnits / 100).toFixed(2)} QAR
              </strong>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedGiftCard.transactions.map((t) => (
                <div key={t.id} className="p-2.5 border border-neutral-200 rounded-lg text-xs flex justify-between">
                  <div>
                    <div className="font-semibold text-neutral-800">{t.note}</div>
                    <div className="text-[10px] text-neutral-500">{new Date(t.date).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono font-bold ${t.amountMinorUnits >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {t.amountMinorUnits >= 0 ? '+' : ''}
                    {(t.amountMinorUnits / 100).toFixed(2)} QAR
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
