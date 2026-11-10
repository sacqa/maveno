import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  Compass,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Palette,
  Layout,
  Globe,
  CreditCard,
  Truck,
  Shield,
  Users,
  Bell,
  Key,
  MapPin,
  Coins,
  Languages,
  Save,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  StorePage,
  BlogPost,
  NavigationMenu,
  MediaAsset,
  StoreSettings,
  Currency,
  Country,
  InventoryLocation,
  StaffAccount,
  UserRole,
} from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';

interface ContentOnlineStoreSettingsProps {
  mode: 'content' | 'online_store' | 'settings';
  pages: StorePage[];
  blogPosts: BlogPost[];
  menus: NavigationMenu[];
  mediaAssets: MediaAsset[];
  settings: StoreSettings;
  currencies: Currency[];
  countries: Country[];
  locations: InventoryLocation[];
  staffAccounts: StaffAccount[];
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onRefresh: () => void;
  onStoreUpdated?: () => void;
  notify: (msg: string) => void;
}

export const ContentOnlineStoreSettingsSection: React.FC<ContentOnlineStoreSettingsProps> = ({
  mode,
  pages,
  blogPosts,
  menus,
  mediaAssets,
  settings,
  currencies,
  countries,
  locations,
  staffAccounts,
  currentRole,
  onRoleChange,
  onRefresh,
  onStoreUpdated,
  notify,
}) => {
  // --- Content Sub-tabs ---
  const [contentTab, setContentTab] = useState<'pages' | 'blogs' | 'menus' | 'media'>('pages');

  // Page Modal
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  const [showPageModal, setShowPageModal] = useState(false);
  const [pageForm, setPageForm] = useState({
    title: '',
    slug: '',
    content: '',
    template: 'default' as StorePage['template'],
    status: 'published' as StorePage['status'],
    seoTitle: '',
    seoDescription: '',
  });

  // Blog Modal
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'Dr. Tariq Al-Mansoor (Doha Compliance Lead)',
    category: 'Hardware Engineering',
    tags: 'Qatar, High-End, Boro',
    status: 'published' as 'published' | 'draft',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    seoTitle: '',
    seoDescription: '',
  });

  // Menu Item Form
  const [selectedMenuId, setSelectedMenuId] = useState<string>(menus[0]?.id || 'menu_main');
  const [newMenuLabel, setNewMenuLabel] = useState('');
  const [newMenuUrl, setNewMenuUrl] = useState('/');
  const [newMenuType, setNewMenuType] = useState<'collection' | 'page' | 'product' | 'external'>('collection');

  // Media Upload Form
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    name: '',
    url: '',
    fileType: 'image/jpeg' as MediaAsset['fileType'],
    dimensions: '1600x1200',
    altText: '',
  });

  // --- Online Store & Settings State ---
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);
  const [settingsCategory, setSettingsCategory] = useState<
    | 'store_info'
    | 'currencies'
    | 'languages'
    | 'payments'
    | 'checkout'
    | 'shipping'
    | 'taxes'
    | 'locations'
    | 'domains'
    | 'customer_accounts'
    | 'notifications'
    | 'staff'
    | 'roles'
    | 'policies'
    | 'integrations'
  >('store_info');

  // New Staff Invite State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('order_manager');

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const saveStoreSettings = (updates?: Partial<StoreSettings>, message = 'Storefront & Admin settings saved.') => {
    const merged = { ...localSettings, ...updates };
    storeDb.updateSettings(merged);
    setLocalSettings(merged);
    onRefresh();
    if (onStoreUpdated) onStoreUpdated();
    notify(message);
  };

  // ============================================================================
  // 1. CONTENT MANAGEMENT VIEW
  // ============================================================================
  if (mode === 'content') {
    const activeMenu = menus.find((m) => m.id === selectedMenuId) || menus[0];

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Content Management & Media Library</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage website pages, editorial blog posts, storefront navigation menus, and centralized media files with SEO controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {contentTab === 'pages' && (
              <button
                onClick={() => {
                  setEditingPage(null);
                  setPageForm({
                    title: '',
                    slug: '',
                    content: '',
                    template: 'default',
                    status: 'published',
                    seoTitle: '',
                    seoDescription: '',
                  });
                  setShowPageModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Page
              </button>
            )}
            {contentTab === 'blogs' && (
              <button
                onClick={() => {
                  setEditingBlog(null);
                  setBlogForm({
                    title: '',
                    slug: '',
                    excerpt: '',
                    content: '',
                    author: 'Dr. Tariq Al-Mansoor',
                    category: 'Qatar Compliance & Culture',
                    tags: 'Qatar, Doha, Hardware',
                    status: 'published',
                    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
                    seoTitle: '',
                    seoDescription: '',
                  });
                  setShowBlogModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Write Blog Post
              </button>
            )}
            {contentTab === 'media' && (
              <button
                onClick={() => setShowMediaModal(true)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Upload Asset
              </button>
            )}
          </div>
        </div>

        {/* Content Sub-Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'pages', label: `Website Pages (${pages.length})` },
              { id: 'blogs', label: `Editorial Blog Posts (${blogPosts.length})` },
              { id: 'menus', label: `Navigation Menus (${menus.length})` },
              { id: 'media', label: `Files & Media Library (${mediaAssets.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setContentTab(tab.id as typeof contentTab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                  contentTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Sub-tab 1: Website Pages */}
            {contentTab === 'pages' && (
              <div className="divide-y divide-slate-200">
                {pages.map((p) => (
                  <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                          /{p.slug}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.seoDescription || p.content}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPage(p);
                          setPageForm({
                            title: p.title,
                            slug: p.slug,
                            content: p.content,
                            template: p.template,
                            status: p.status,
                            seoTitle: p.seoTitle,
                            seoDescription: p.seoDescription,
                          });
                          setShowPageModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit Page & SEO
                      </button>
                      <button
                        onClick={() => {
                          storeDb.deletePage(p.id);
                          onRefresh();
                          notify(`Deleted page "${p.title}".`);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-tab 2: Blog Posts */}
            {contentTab === 'blogs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blogPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl border border-slate-200 flex gap-4">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-24 h-24 rounded-lg object-cover shrink-0 bg-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                          {post.status || 'published'}
                        </span>
                        <span className="text-[11px] text-slate-400">{post.category}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1 truncate">{post.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{post.excerpt}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingBlog(post);
                            setBlogForm({
                              title: post.title,
                              slug: post.slug,
                              excerpt: post.excerpt,
                              content: post.content,
                              author: post.author,
                              category: post.category,
                              tags: post.tags.join(', '),
                              status: post.status || 'published',
                              image: post.image,
                              seoTitle: post.seoTitle,
                              seoDescription: post.seoDescription,
                            });
                            setShowBlogModal(true);
                          }}
                          className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit Post
                        </button>
                        <button
                          onClick={() => {
                            storeDb.deleteBlogPost(post.id);
                            onRefresh();
                            notify(`Deleted blog post "${post.title}".`);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-tab 3: Navigation Menus */}
            {contentTab === 'menus' && activeMenu && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {menus.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMenuId(m.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                        activeMenu.id === m.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.title} ({m.handle})
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                  {activeMenu.items.map((item, idx) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{item.label}</span>
                        <span className="ml-2 font-mono text-slate-500">{item.url}</span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] uppercase">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const items = [...activeMenu.items];
                            [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                            storeDb.saveMenu({ ...activeMenu, items });
                            onRefresh();
                          }}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === activeMenu.items.length - 1}
                          onClick={() => {
                            const items = [...activeMenu.items];
                            [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                            storeDb.saveMenu({ ...activeMenu, items });
                            onRefresh();
                          }}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const items = activeMenu.items.filter((i) => i.id !== item.id);
                            storeDb.saveMenu({ ...activeMenu, items });
                            onRefresh();
                            notify(`Removed "${item.label}" from ${activeMenu.title}.`);
                          }}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Menu Link */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <input
                    type="text"
                    value={newMenuLabel}
                    onChange={(e) => setNewMenuLabel(e.target.value)}
                    placeholder="Menu Label (e.g. Limited Drops)"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newMenuUrl}
                    onChange={(e) => setNewMenuUrl(e.target.value)}
                    placeholder="URL / Handle"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                  <select
                    value={newMenuType}
                    onChange={(e) => setNewMenuType(e.target.value as typeof newMenuType)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="collection">Collection</option>
                    <option value="page">Page</option>
                    <option value="product">Product</option>
                    <option value="external">External Link</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newMenuLabel.trim()) return;
                      const updatedMenu: NavigationMenu = {
                        ...activeMenu,
                        items: [
                          ...activeMenu.items,
                          {
                            id: 'mi_' + Date.now(),
                            label: newMenuLabel.trim(),
                            url: newMenuUrl.trim() || '/',
                            type: newMenuType,
                          },
                        ],
                      };
                      storeDb.saveMenu(updatedMenu);
                      setNewMenuLabel('');
                      onRefresh();
                      notify(`Added link "${newMenuLabel}" to ${activeMenu.title}.`);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                  >
                    + Add Menu Item
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tab 4: File & Media Library */}
            {contentTab === 'media' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white flex flex-col justify-between">
                    <div>
                      <div className="h-36 bg-slate-100 relative overflow-hidden">
                        <img src={asset.url} alt={asset.altText} className="w-full h-full object-cover" />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-mono">
                          {asset.dimensions || 'HD'}
                        </span>
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="font-bold text-slate-900 text-xs truncate">{asset.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">Alt: {asset.altText}</div>
                      </div>
                    </div>
                    <div className="p-3 pt-0 flex items-center justify-between">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(asset.url);
                          notify(`Copied URL for ${asset.name}.`);
                        }}
                        className="text-xs font-semibold text-slate-700 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy CDN Link
                      </button>
                      <button
                        onClick={() => {
                          storeDb.deleteMediaAsset(asset.id);
                          onRefresh();
                          notify(`Deleted media asset ${asset.name}.`);
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Page Editor Modal */}
        {showPageModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingPage ? `Edit Page: ${editingPage.title}` : 'Create Storefront Page'}
                </h3>
                <button onClick={() => setShowPageModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Page Title</label>
                    <input
                      type="text"
                      value={pageForm.title}
                      onChange={(e) =>
                        setPageForm({
                          ...pageForm,
                          title: e.target.value,
                          slug: pageForm.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Slug</label>
                    <input
                      type="text"
                      value={pageForm.slug}
                      onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Visibility Status</label>
                    <select
                      value={pageForm.status}
                      onChange={(e) => setPageForm({ ...pageForm, status: e.target.value as StorePage['status'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Template</label>
                    <select
                      value={pageForm.template}
                      onChange={(e) => setPageForm({ ...pageForm, template: e.target.value as StorePage['template'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="default">Standard Page</option>
                      <option value="compliance">Qatar MOPH Compliance</option>
                      <option value="contact">Concierge Contact</option>
                      <option value="faq">FAQ Accordion</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Page Content</label>
                  <textarea
                    rows={4}
                    value={pageForm.content}
                    onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={pageForm.seoTitle}
                    onChange={(e) => setPageForm({ ...pageForm, seoTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SEO Meta Description</label>
                  <input
                    type="text"
                    value={pageForm.seoDescription}
                    onChange={(e) => setPageForm({ ...pageForm, seoDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowPageModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!pageForm.title.trim()) return;
                      storeDb.savePage({
                        id: editingPage?.id || 'page_' + Date.now(),
                        title: pageForm.title.trim(),
                        slug: pageForm.slug.trim(),
                        content: pageForm.content,
                        template: pageForm.template,
                        status: pageForm.status,
                        seoTitle: pageForm.seoTitle || pageForm.title,
                        seoDescription: pageForm.seoDescription || pageForm.content.slice(0, 140),
                        updatedAt: new Date().toISOString().split('T')[0],
                      });
                      setShowPageModal(false);
                      onRefresh();
                      notify(`Saved page "${pageForm.title}".`);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                  >
                    Save Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Editor Modal */}
        {showBlogModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingBlog ? 'Edit Editorial Post' : 'Publish Editorial Post'}
                </h3>
                <button onClick={() => setShowBlogModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Article Title</label>
                  <input
                    type="text"
                    value={blogForm.title}
                    onChange={(e) =>
                      setBlogForm({
                        ...blogForm,
                        title: e.target.value,
                        slug: blogForm.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Author</label>
                    <input
                      type="text"
                      value={blogForm.author}
                      onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={blogForm.status}
                      onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value as 'published' | 'draft' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Excerpt</label>
                  <input
                    type="text"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Article Body</label>
                  <textarea
                    rows={4}
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowBlogModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!blogForm.title.trim()) return;
                      storeDb.saveBlogPost({
                        id: editingBlog?.id || 'blog_' + Date.now(),
                        title: blogForm.title.trim(),
                        slug: blogForm.slug || 'editorial-' + Date.now(),
                        excerpt: blogForm.excerpt || blogForm.content.slice(0, 100),
                        content: blogForm.content,
                        author: blogForm.author,
                        publishedDate: new Date().toISOString().split('T')[0],
                        status: blogForm.status,
                        category: blogForm.category,
                        tags: blogForm.tags.split(',').map((t) => t.trim()),
                        readTime: '5 min read',
                        image: blogForm.image,
                        seoTitle: blogForm.seoTitle || blogForm.title,
                        seoDescription: blogForm.seoDescription || blogForm.excerpt,
                      });
                      setShowBlogModal(false);
                      onRefresh();
                      notify(`Saved blog post "${blogForm.title}".`);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                  >
                    Publish Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Upload Modal */}
        {showMediaModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Upload Media Asset</h3>
                <button onClick={() => setShowMediaModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">File Name</label>
                  <input
                    type="text"
                    value={mediaForm.name}
                    onChange={(e) => setMediaForm({ ...mediaForm, name: e.target.value })}
                    placeholder="doha-flagship-banner.jpg"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Media URL</label>
                  <input
                    type="url"
                    value={mediaForm.url}
                    onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alt Text (SEO Accessibility)</label>
                  <input
                    type="text"
                    value={mediaForm.altText}
                    onChange={(e) => setMediaForm({ ...mediaForm, altText: e.target.value })}
                    placeholder="Luxury Boro Mod in Doha"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowMediaModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!mediaForm.name.trim() || !mediaForm.url.trim()) return;
                      storeDb.saveMediaAsset({
                        id: 'media_' + Date.now(),
                        name: mediaForm.name.trim(),
                        url: mediaForm.url.trim(),
                        fileType: mediaForm.fileType,
                        sizeBytes: 380400,
                        dimensions: mediaForm.dimensions,
                        altText: mediaForm.altText || mediaForm.name,
                        uploadedAt: new Date().toISOString().split('T')[0],
                        usedIn: ['Storefront Media Library'],
                      });
                      setShowMediaModal(false);
                      onRefresh();
                      notify(`Uploaded asset "${mediaForm.name}" to library.`);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                  >
                    Save to Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. ONLINE STORE (THEME, HOMEPAGE HERO, BRANDING & PREFERENCES)
  // ============================================================================
  if (mode === 'online_store') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Online Store Theme, Homepage & Branding</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize live storefront hero banners, dynamic brand colors, announcement bar, and age verification gate copy.
            </p>
          </div>
          <button
            onClick={() => saveStoreSettings(undefined, 'Published Online Store theme & homepage changes live!')}
            className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" /> Publish Storefront Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Homepage Hero Customizer */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layout className="w-4 h-4 text-slate-600" /> Storefront Homepage Hero Editor
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hero Top Badge</label>
                <input
                  type="text"
                  value={localSettings.heroBadge || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroBadge: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Featured Tag Pill</label>
                <input
                  type="text"
                  value={localSettings.heroFeaturedTag || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroFeaturedTag: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Primary Hero Headline</label>
                <input
                  type="text"
                  value={localSettings.heroHeadline || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroHeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Hero Subheadline Description</label>
                <textarea
                  rows={2}
                  value={localSettings.heroDescription || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary CTA Button Label</label>
                <input
                  type="text"
                  value={localSettings.heroPrimaryButtonText || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroPrimaryButtonText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Secondary CTA Button Label</label>
                <input
                  type="text"
                  value={localSettings.heroSecondaryButtonText || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroSecondaryButtonText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Announcement Bar & Age Gate */}
            <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Top Announcement Bar</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.announcementBarEnabled}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, announcementBarEnabled: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Enabled on Storefront</span>
                </label>
              </div>
              <input
                type="text"
                value={localSettings.announcementBarText}
                onChange={(e) => setLocalSettings({ ...localSettings, announcementBarText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            {/* Homepage Product Display Control */}
            <div className="border-t border-slate-200 pt-5 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Homepage Product Display Control
                  </h4>
                  <p className="text-slate-500 mt-0.5">
                    Control how many active products appear on the storefront homepage before customers click &ldquo;View All Products&rdquo; to open the full Shop catalog.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] shrink-0">
                  Showing {localSettings.homepageProductLimit || 4} Products on Homepage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">
                    Quick Select Homepage Product Count
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[4, 8, 12, 16].map((presetCount) => {
                      const isCurrent = (localSettings.homepageProductLimit || 4) === presetCount;
                      return (
                        <button
                          key={presetCount}
                          type="button"
                          data-testid={`homepage-limit-preset-${presetCount}`}
                          onClick={() => {
                            saveStoreSettings(
                              { homepageProductLimit: presetCount },
                              `Homepage product display updated to ${presetCount} products.`
                            );
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {presetCount} Products
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">
                    Or Enter Custom Number of Products
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      data-testid="homepage-product-limit-input"
                      value={localSettings.homepageProductLimit ?? 4}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setLocalSettings({
                          ...localSettings,
                          homepageProductLimit: val,
                        });
                      }}
                      className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      data-testid="save-homepage-limit-btn"
                      onClick={() =>
                        saveStoreSettings(
                          { homepageProductLimit: Math.max(1, Number(localSettings.homepageProductLimit) || 4) },
                          `Saved Homepage Product Display Limit (${localSettings.homepageProductLimit || 4} products).`
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                    >
                      Apply Limit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Brand Identity & Color Tokens */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-600" /> Brand Identity & Colors
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                value={localSettings.storeName}
                onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand Tagline</label>
              <input
                type="text"
                value={localSettings.tagline}
                onChange={(e) => setLocalSettings({ ...localSettings, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary</label>
                <input
                  type="color"
                  value={localSettings.primaryColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Secondary</label>
                <input
                  type="color"
                  value={localSettings.secondaryColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, secondaryColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Accent</label>
                <input
                  type="color"
                  value={localSettings.accentColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, accentColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer border border-slate-200"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">Typography System</div>
              <div className="text-slate-500 mt-0.5">Global Font: Poppins (Locked per Qatar Brand Guide)</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. COMPLETE 15-CATEGORY SHOPIFY SETTINGS VIEW
  // ============================================================================
  const settingsNav = [
    { id: 'store_info', label: '1. Store Information', icon: Globe },
    { id: 'currencies', label: '2. Currency & Multi-Currency', icon: Coins },
    { id: 'languages', label: '3. Languages & Locales', icon: Languages },
    { id: 'payments', label: '4. Payment Providers', icon: CreditCard },
    { id: 'checkout', label: '5. Checkout Configuration', icon: Check },
    { id: 'shipping', label: '6. Shipping & Delivery', icon: Truck },
    { id: 'taxes', label: '7. Taxes & Excise Duties', icon: FileText },
    { id: 'locations', label: '8. Store Locations', icon: MapPin },
    { id: 'domains', label: '9. Domains & Routing', icon: Globe },
    { id: 'customer_accounts', label: '10. Customer Accounts', icon: Users },
    { id: 'notifications', label: '11. Notifications', icon: Bell },
    { id: 'staff', label: '12. Staff Accounts', icon: Users },
    { id: 'roles', label: '13. Roles & Permissions', icon: Shield },
    { id: 'policies', label: '14. Privacy & Legal Terms', icon: FileText },
    { id: 'integrations', label: '15. Integrations & APIs', icon: Key },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Settings Category List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-1 h-fit">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Shopify Admin Settings (15)
        </div>
        {settingsNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSettingsCategory(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                settingsCategory === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Active Settings Panel */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
        {settingsCategory === 'store_info' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Store Information & Qatar Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Legal Store Name</label>
                <input
                  type="text"
                  value={localSettings.storeName}
                  onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Concierge Support Email</label>
                <input
                  type="email"
                  value={localSettings.contactEmail}
                  onChange={(e) => setLocalSettings({ ...localSettings, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qatar Support Phone</label>
                <input
                  type="text"
                  value={localSettings.contactPhone}
                  onChange={(e) => setLocalSettings({ ...localSettings, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Headquarters Address (Doha)</label>
                <input
                  type="text"
                  value={localSettings.supportAddress}
                  onChange={(e) => setLocalSettings({ ...localSettings, supportAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Homepage Featured Products Limit (4, 8, 12, 16 or Custom)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={localSettings.homepageProductLimit ?? 4}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      homepageProductLimit: Math.max(1, parseInt(e.target.value, 10) || 4),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Shop Page Products Per Page (Pagination Size)
                </label>
                <input
                  type="number"
                  min={4}
                  max={48}
                  value={localSettings.shopProductsPerPage ?? 8}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      shopProductsPerPage: Math.max(4, parseInt(e.target.value, 10) || 8),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
            <button
              onClick={() => saveStoreSettings()}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold cursor-pointer"
            >
              Save Store Information
            </button>
          </div>
        )}

        {settingsCategory === 'currencies' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Currency & Multi-Currency Exchange Rates (Base: QAR)
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
              {currencies.map((curr) => (
                <div key={curr.code} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{curr.code}</span> · {curr.name} ({curr.symbol})
                    {curr.isBaseCurrency && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        BASE CURRENCY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Rate to QAR:</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={curr.isBaseCurrency}
                      value={curr.exchangeRateToBase}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > 0) {
                          storeDb.updateExchangeRate(curr.code, val);
                          onRefresh();
                          notify(`Updated ${curr.code} exchange rate.`);
                        }
                      }}
                      className="w-24 px-2 py-1 border border-slate-200 rounded font-mono text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {settingsCategory === 'languages' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Storefront Languages & Regional Locales
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">English (International / Qatar Default)</div>
                <div className="text-slate-500">Locale code: en-QA · Primary crawlable SEO language</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                DEFAULT
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(localSettings.multiLanguageEnabled)}
                onChange={(e) =>
                  saveStoreSettings(
                    { multiLanguageEnabled: e.target.checked },
                    `Arabic (ar-QA) secondary locale ${e.target.checked ? 'enabled' : 'disabled'}.`
                  )
                }
                className="rounded border-slate-300"
              />
              <span className="font-semibold text-slate-800">
                Enable Arabic (ar-QA) RTL Secondary Language Pack
              </span>
            </label>
          </div>
        )}

        {settingsCategory === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Payment Providers & Qatar Gateways
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">QPay / NAPS & High-Risk Approved Card Gateway</div>
                  <div className="text-slate-500">3D-Secure 2.0 QAR Settlement · Instant Capture</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Doha Cash on Delivery (Adult 21+ QID Verification)</div>
                  <div className="text-slate-500">Available for Doha, Lusail, Al Rayyan & Al Wakrah</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  ACTIVE
                </span>
              </div>
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableSandboxPayment}
                  onChange={(e) =>
                    saveStoreSettings({ enableSandboxPayment: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span className="font-semibold text-slate-800">
                  Enable Sandbox Testing Terminal on Checkout
                </span>
              </label>
            </div>
          </div>
        )}

        {settingsCategory === 'checkout' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Checkout & Qatar MOPH Verification Rules
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.checkoutRequireQid ?? true}
                  onChange={(e) =>
                    saveStoreSettings({ checkoutRequireQid: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span className="font-semibold text-slate-800">
                  Require 11-Digit Qatar National ID (QID) or Passport at Checkout (21+ Mandate)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.checkoutRequirePhone ?? true}
                  onChange={(e) =>
                    saveStoreSettings({ checkoutRequirePhone: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span className="font-semibold text-slate-800">
                  Require +974 Mobile Number for Doha Courier Dispatch
                </span>
              </label>
            </div>
          </div>
        )}

        {settingsCategory === 'shipping' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Shipping & Doha Same-Day Delivery Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Free Shipping Threshold (QAR)</label>
                <input
                  type="number"
                  value={(localSettings.freeShippingThresholdMinorUnits || 35000) / 100}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      freeShippingThresholdMinorUnits: Math.round((parseFloat(e.target.value) || 0) * 100),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Doha Delivery Fee (QAR)</label>
                <input
                  type="number"
                  value={(localSettings.standardShippingFeeMinorUnits ?? 2500) / 100}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      standardShippingFeeMinorUnits: Math.round((parseFloat(e.target.value) || 0) * 100),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Courier Partner</label>
                <input
                  type="text"
                  value={localSettings.defaultShippingCarrier || 'Doha City Express'}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, defaultShippingCarrier: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={() => saveStoreSettings(undefined, 'Updated Qatar shipping & courier rates.')}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
            >
              Save Shipping Settings
            </button>
          </div>
        )}

        {settingsCategory === 'taxes' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Taxes & Jurisdiction Excise Duty Matrix
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
              {countries.map((c) => (
                <div key={c.code} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">
                      {c.flagEmoji} {c.name} ({c.code})
                    </span>
                    <span className="ml-2 text-slate-500">Status: {c.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>VAT: {(c.standardTaxRate * 100).toFixed(0)}%</span>
                    <span>Excise: {(c.customsDutyRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {settingsCategory === 'locations' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Qatar Fulfillment Hubs & Retail Locations ({locations.length})
            </h3>
            <div className="space-y-3">
              {locations.map((loc) => (
                <div key={loc.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">
                      {loc.name} <span className="font-mono text-slate-400">({loc.code})</span>
                    </div>
                    <div className="text-slate-500">{loc.address}, {loc.city}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    {loc.fulfillsOnlineOrders ? 'FULFILLS ONLINE' : 'STORAGE VAULT'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {settingsCategory === 'domains' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Domains & SSL Routing
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Qatar Domain</label>
              <input
                type="text"
                value={localSettings.primaryDomain || 'aura-qatar.qa'}
                onChange={(e) => setLocalSettings({ ...localSettings, primaryDomain: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <button
              onClick={() => saveStoreSettings(undefined, 'Updated primary domain configuration.')}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
            >
              Save Domain
            </button>
          </div>
        )}

        {settingsCategory === 'customer_accounts' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Customer Accounts & Self-Serve Portal
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.customerSelfServeReturns ?? true}
                onChange={(e) =>
                  saveStoreSettings({ customerSelfServeReturns: e.target.checked })
                }
                className="rounded border-slate-300"
              />
              <span className="font-semibold text-slate-800">
                Allow verified customers to request returns directly from their order lookup page
              </span>
            </label>
          </div>
        )}

        {settingsCategory === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Transactional Email & SMS Notification Triggers
            </h3>
            <div className="space-y-2">
              {[
                'Order Confirmation & Commercial Invoice (QAR)',
                'Doha Courier Out-for-Delivery SMS (+974)',
                'Low Stock Warehouse Alert (Threshold ≤ 5 units)',
                'Qatar QID 21+ Verification Audit Log Alert',
              ].map((trigger) => (
                <div key={trigger} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{trigger}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {settingsCategory === 'staff' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Staff Accounts & Two-Factor Security ({staffAccounts.length})
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
              {staffAccounts.map((s) => (
                <div key={s.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{s.fullName}</div>
                    <div className="text-slate-500">
                      {s.email} · Role: <strong className="uppercase">{s.role}</strong>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    2FA ENABLED
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Staff Full Name"
                className="px-3 py-2 border border-slate-200 rounded-lg"
              />
              <input
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="staff@aura-qatar.qa"
                className="px-3 py-2 border border-slate-200 rounded-lg"
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                className="px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="administrator">Administrator</option>
                <option value="product_manager">Product Manager</option>
                <option value="order_manager">Order Manager</option>
                <option value="compliance_manager">Compliance Manager</option>
              </select>
              <button
                onClick={() => {
                  if (!newStaffName.trim() || !newStaffEmail.trim()) return;
                  storeDb.saveStaffAccount({
                    id: 'staff_' + Date.now(),
                    fullName: newStaffName.trim(),
                    email: newStaffEmail.trim(),
                    role: newStaffRole,
                    permissions: ['Role-Scoped Access'],
                    status: 'active',
                    lastActive: 'Just now',
                    twoFactorEnabled: true,
                  });
                  setNewStaffName('');
                  setNewStaffEmail('');
                  onRefresh();
                  notify(`Invited staff member ${newStaffName}.`);
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
              >
                + Add Staff
              </button>
            </div>
          </div>
        )}

        {settingsCategory === 'roles' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Role-Based Access Control (RBAC) & Simulator
            </h3>
            <p className="text-slate-600">
              Switch your active session role to test permission boundaries across the Shopify Admin replica:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  'super_admin',
                  'administrator',
                  'product_manager',
                  'order_manager',
                  'content_manager',
                  'compliance_manager',
                ] as UserRole[]
              ).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onRoleChange(r);
                    notify(`Switched active admin role to ${r.toUpperCase()}.`);
                  }}
                  className={`p-3 rounded-xl border text-left font-bold uppercase ${
                    currentRole === r
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {settingsCategory === 'policies' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Legal Policies, Refund Terms & MOPH Disclaimers
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Privacy Policy</label>
              <textarea
                rows={2}
                value={localSettings.privacyPolicyText || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, privacyPolicyText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Refund & Hygiene Policy</label>
              <textarea
                rows={2}
                value={localSettings.refundPolicyText || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, refundPolicyText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Terms of Service (Qatar 21+)</label>
              <textarea
                rows={2}
                value={localSettings.termsOfServiceText || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, termsOfServiceText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <button
              onClick={() => saveStoreSettings(undefined, 'Updated legal & compliance policies.')}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
            >
              Save Legal Policies
            </button>
          </div>
        )}

        {settingsCategory === 'integrations' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Storefront API Tokens & Webhook Endpoints
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Webhook Destination URL</label>
              <input
                type="url"
                value={localSettings.webhookEndpointUrl || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, webhookEndpointUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Headless Storefront API Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={localSettings.storefrontApiToken || 'shpat_qa_994810481049104910'}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(localSettings.storefrontApiToken || '');
                    notify('Copied Storefront API token.');
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => saveStoreSettings(undefined, 'Saved API & Webhook configuration.')}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
            >
              Save API Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
