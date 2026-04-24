import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Tag, Loader2, ExternalLink, CheckCircle2, XCircle, Clock,
  Wand2, ChevronDown, ChevronUp, Plus, Camera, Truck, RefreshCw, Share2,
  RefreshCcw, Download, ShoppingBag, Package, AlertCircle
} from "lucide-react";

const PLATFORMS = [
  { id: "etsy", label: "Etsy", color: "oklch(0.72 0.14 30)", textColor: "white" },
  { id: "ebay", label: "eBay", color: "oklch(0.65 0.18 260)", textColor: "white" },
  { id: "facebook", label: "Facebook", color: "oklch(0.55 0.18 250)", textColor: "white" },
] as const;

type Platform = "etsy" | "ebay" | "facebook";

interface EbaySyncedListing {
  itemId: string;
  title: string;
  price: string;
  currency: string;
  status: "active" | "sold" | "ended";
  viewItemUrl: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
  quantitySold?: number;
  category?: string;
  condition?: string;
}

export default function Listings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const itemIdParam = params.get("itemId");

  const [showCreateForm, setShowCreateForm] = useState(!!itemIdParam);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(itemIdParam ? Number(itemIdParam) : null);
  const [showEbaySync, setShowEbaySync] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="container py-12 pb-24 md:pb-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="memphis-card p-8 text-center max-w-sm w-full">
          <Tag size={40} className="mx-auto mb-4 text-[oklch(0.45_0.02_55)]" />
          <h2 className="section-title text-lg mb-2">Sign In to View Listings</h2>
          <a href={getLoginUrl()} className="btn-memphis btn-memphis-black w-full justify-center">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title text-xl mb-1">My Listings</h1>
          <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">Manage and cross-post your items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEbaySync(v => !v)}
            className="btn-memphis text-xs"
            style={{ background: "oklch(0.65 0.18 260)", color: "white", borderColor: "oklch(0.45 0.18 260)" }}
          >
            <RefreshCcw size={12} />
            eBay Sync
          </button>
          <button
            onClick={() => navigate("/research")}
            className="btn-memphis btn-memphis-black text-xs"
          >
            <Camera size={12} />
            New Item
          </button>
        </div>
      </div>

      {showEbaySync && (
        <EbaySyncPanel onClose={() => setShowEbaySync(false)} />
      )}

      {showCreateForm && selectedItemId && (
        <CreateListingForm
          itemId={selectedItemId}
          onClose={() => { setShowCreateForm(false); setSelectedItemId(null); }}
          onCreated={() => { setShowCreateForm(false); setSelectedItemId(null); }}
        />
      )}

      <ListingsList />
    </div>
  );
}

// -- eBay Sync Panel --------------------------------------------------------

function EbaySyncPanel({ onClose }: { onClose: () => void }) {
  const { data: ebayStatus } = trpc.ebay.status.useQuery();
  const { data: ebayAuthData } = trpc.ebay.getAuthUrl.useQuery();
  const syncMutation = trpc.ebay.syncListings.useMutation();
  const importMutation = trpc.ebay.importListing.useMutation();
  const utils = trpc.useUtils();

  const [syncResult, setSyncResult] = useState<{
    active: EbaySyncedListing[];
    sold: EbaySyncedListing[];
    total: number;
    syncedAt: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "sold">("active");
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      setSyncResult(result as any);
      toast.success(`Synced ${result.total} listings from eBay`, {
        description: `${result.active.length} active · ${result.sold.length} sold/ended`,
      });
    } catch (err: any) {
      toast.error("eBay sync failed", { description: err.message ?? "Unknown error" });
    }
  };

  const handleImport = async (listing: EbaySyncedListing) => {
    setImporting(listing.itemId);
    try {
      const result = await importMutation.mutateAsync({
        ebayItemId: listing.itemId,
        title: listing.title,
        price: listing.price || "0",
        status: listing.status,
        viewItemUrl: listing.viewItemUrl,
        imageUrl: listing.imageUrl,
        category: listing.category,
        condition: listing.condition,
      });
      if (result.alreadyExists) {
        toast.info("Already imported", { description: listing.title });
      } else {
        toast.success("Imported!", { description: listing.title });
        utils.listings.list.invalidate();
        utils.items.list.invalidate();
      }
      setImported(prev => new Set(Array.from(prev).concat(listing.itemId)));
    } catch (err: any) {
      toast.error("Import failed", { description: err.message ?? "Unknown error" });
    } finally {
      setImporting(null);
    }
  };

  const handleImportAll = async (listingsToImport: EbaySyncedListing[]) => {
    const toImport = listingsToImport.filter(l => !imported.has(l.itemId));
    if (toImport.length === 0) {
      toast.info("All listings already imported");
      return;
    }
    let count = 0;
    for (const listing of toImport) {
      setImporting(listing.itemId);
      try {
        const result = await importMutation.mutateAsync({
          ebayItemId: listing.itemId,
          title: listing.title,
          price: listing.price || "0",
          status: listing.status,
          viewItemUrl: listing.viewItemUrl,
          imageUrl: listing.imageUrl,
          category: listing.category,
          condition: listing.condition,
        });
        if (!result.alreadyExists) count++;
        setImported(prev => new Set(Array.from(prev).concat(listing.itemId)));
      } catch {
        // continue on error
      }
    }
    setImporting(null);
    utils.listings.list.invalidate();
    utils.items.list.invalidate();
    toast.success(`Imported ${count} listings`);
  };

  const displayList = syncResult ? (activeTab === "active" ? syncResult.active : syncResult.sold) : [];

  return (
    <div className="memphis-card p-5 mb-6 border-2 border-[oklch(0.65_0.18_260)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-black"
            style={{ background: "oklch(0.65 0.18 260)", color: "white" }}
          >
            e
          </div>
          <h2 className="section-title text-sm">eBay Sync</h2>
        </div>
        <button onClick={onClose} className="text-[oklch(0.45_0.02_55)] hover:text-black">
          <XCircle size={18} />
        </button>
      </div>

      {!ebayStatus?.connected ? (
        <div className="text-center py-4">
          <AlertCircle size={28} className="mx-auto mb-2 text-[oklch(0.65_0.18_260)]" />
          <p className="font-bold text-sm mb-1">eBay Not Connected</p>
          <p className="text-xs text-[oklch(0.45_0.02_55)] mb-3">Connect your eBay account to sync listings</p>
          <a
            href={ebayAuthData?.url ?? "#"}
            className="btn-memphis text-xs"
            style={{ background: "oklch(0.65 0.18 260)", color: "white", borderColor: "oklch(0.45 0.18 260)" }}
          >
            Connect eBay
          </a>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="btn-memphis btn-memphis-black flex-1 justify-center disabled:opacity-50"
            >
              {syncMutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <RefreshCcw size={14} />}
              {syncMutation.isPending ? "Syncing from eBay..." : "Pull from eBay"}
            </button>
            {syncResult && displayList.length > 0 && (
              <button
                onClick={() => handleImportAll(displayList)}
                disabled={importMutation.isPending || !!importing}
                className="btn-memphis btn-memphis-mint text-xs disabled:opacity-50"
              >
                <Download size={12} />
                Import All
              </button>
            )}
          </div>

          {syncResult && (
            <>
              <div className="flex items-center gap-1 mb-3 text-xs text-[oklch(0.45_0.02_55)] font-medium">
                <CheckCircle2 size={12} className="text-[oklch(0.45_0.15_145)]" />
                Synced {syncResult.total} listings · {new Date(syncResult.syncedAt).toLocaleTimeString()}
              </div>

              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab("active")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    activeTab === "active"
                      ? "border-black bg-[oklch(0.85_0.08_165)] text-black"
                      : "border-black/20 bg-transparent text-[oklch(0.45_0.02_55)]"
                  }`}
                >
                  <ShoppingBag size={11} />
                  Active ({syncResult.active.length})
                </button>
                <button
                  onClick={() => setActiveTab("sold")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    activeTab === "sold"
                      ? "border-black bg-[oklch(0.85_0.08_165)] text-black"
                      : "border-black/20 bg-transparent text-[oklch(0.45_0.02_55)]"
                  }`}
                >
                  <Package size={11} />
                  Sold/Ended ({syncResult.sold.length})
                </button>
              </div>

              {displayList.length === 0 ? (
                <p className="text-center text-xs text-[oklch(0.55_0.02_55)] py-4 font-medium">
                  No {activeTab} listings found on eBay
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {displayList.map(listing => {
                    const isImporting = importing === listing.itemId;
                    const isImported = imported.has(listing.itemId);
                    return (
                      <div key={listing.itemId} className="flex items-center gap-3 p-3 bg-[oklch(0.95_0.02_55)] rounded-xl border border-black/10">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt={listing.title} className="w-10 h-10 object-cover rounded-lg border-2 border-black flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border-2 border-black bg-[oklch(0.88_0.04_55)] flex items-center justify-center flex-shrink-0">
                            <Tag size={14} className="text-[oklch(0.55_0.02_55)]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate">{listing.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-black">
                              ${parseFloat(listing.price || "0").toFixed(2)}
                            </span>
                            {listing.status === "sold" && listing.quantitySold != null && listing.quantitySold > 0 && (
                              <span className="memphis-badge text-[9px] bg-[oklch(0.85_0.08_165)]">
                                {listing.quantitySold} sold
                              </span>
                            )}
                            {listing.condition && (
                              <span className="text-[10px] text-[oklch(0.55_0.02_55)] font-medium">{listing.condition}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={listing.viewItemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-memphis text-[9px] px-2 py-1"
                            style={{ background: "oklch(0.65 0.18 260)", color: "white", borderColor: "oklch(0.45 0.18 260)" }}
                          >
                            <ExternalLink size={9} />
                          </a>
                          <button
                            onClick={() => handleImport(listing)}
                            disabled={isImporting || isImported}
                            className={`btn-memphis text-[9px] px-2 py-1 disabled:opacity-60 ${
                              isImported ? "btn-memphis-mint" : "btn-memphis-black"
                            }`}
                          >
                            {isImporting
                              ? <Loader2 size={9} className="animate-spin" />
                              : isImported
                              ? <CheckCircle2 size={9} />
                              : <Download size={9} />}
                            {isImported ? "Done" : "Import"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// -- Create Listing Form ----------------------------------------------------

function CreateListingForm({ itemId, onClose, onCreated }: { itemId: number; onClose: () => void; onCreated: () => void }) {
  const utils = trpc.useUtils();
  const { data: item } = trpc.items.get.useQuery({ id: itemId });
  const { data: templates } = trpc.templates.list.useQuery();
  const generateContent = trpc.listings.generateContent.useMutation();
  const createListing = trpc.listings.create.useMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [condition, setCondition] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | undefined>();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (item) {
      setPrice(item.suggestedPrice ?? "");
      setCondition(item.identifiedCondition ?? "");
      setTags(item.aiTags as string[] ?? []);
      setDescription(item.aiDescription ?? "");
    }
  }, [item]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const content = await generateContent.mutateAsync({ itemId, templateId: selectedTemplate });
      setTitle(content.title);
      setDescription(content.description);
      setTags(content.tags);
      toast.success("Listing content generated!");
    } catch {
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !price) {
      toast.error("Please fill in title, description, and price");
      return;
    }
    try {
      await createListing.mutateAsync({
        itemId,
        title,
        description,
        price,
        category: item?.identifiedCategory ?? undefined,
        tags,
        condition,
        imageUrl: item?.imageUrl ?? undefined,
      });
      utils.listings.list.invalidate();
      utils.items.list.invalidate();
      toast.success("Listing created!");
      onCreated();
    } catch {
      toast.error("Failed to create listing");
    }
  };

  return (
    <div className="memphis-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title text-sm">Create Listing</h2>
        <button onClick={onClose} className="text-[oklch(0.45_0.02_55)] hover:text-black">
          <XCircle size={18} />
        </button>
      </div>

      {item && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[oklch(0.88_0.04_55)] rounded-lg border border-black/10">
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.identifiedName ?? ""} className="w-12 h-12 object-cover rounded-lg border-2 border-black" />
          )}
          <div>
            <p className="font-bold text-sm">{item.identifiedName}</p>
            <p className="text-xs text-[oklch(0.45_0.02_55)]">{item.identifiedBrand} · {item.identifiedCategory}</p>
          </div>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Apply Template (Optional)</label>
          <select
            value={selectedTemplate ?? ""}
            onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none"
          >
            <option value="">No template</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="btn-memphis btn-memphis-mint w-full justify-center mb-4 disabled:opacity-50"
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        {generating ? "Generating..." : "AI Generate Content"}
      </button>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item title for listings..."
            className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Item description..."
            rows={4}
            className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm">$</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                className="w-full bg-white border-2 border-black rounded-lg pl-7 pr-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none"
            >
              <option value="">Select...</option>
              {["Excellent", "Very Good", "Good", "Fair", "Poor"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => setTags(tags.filter((_, j) => j !== i))}
                  className="memphis-badge bg-[oklch(0.85_0.08_165)] text-[10px] hover:bg-[oklch(0.72_0.14_30)] hover:text-white transition-colors"
                >
                  {tag} x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleCreate}
        disabled={createListing.isPending}
        className="btn-memphis btn-memphis-black w-full justify-center mt-4 py-3 disabled:opacity-50"
      >
        {createListing.isPending ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
        Create Listing
      </button>
    </div>
  );
}

// -- Listings List ----------------------------------------------------------

function ListingsList() {
  const { data: listings, isLoading } = trpc.listings.list.useQuery({ limit: 20 });
  const { data: ebayStatus } = trpc.ebay.status.useQuery();
  const { data: ebayAuthData } = trpc.ebay.getAuthUrl.useQuery();
  const postToPlatform = trpc.listings.postToPlatform.useMutation();
  const updateTracking = trpc.listings.updateTracking.useMutation();
  const refreshTracking = trpc.listings.refreshTracking.useMutation();
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [posting, setPosting] = useState<{ id: number; platform: Platform } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ebay_connected") === "1") {
      toast.success("eBay account connected!", { description: "You can now post listings directly to eBay." });
      utils.ebay.status.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("ebay_error")) {
      toast.error("eBay connection failed", { description: params.get("ebay_error") ?? "Unknown error" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const [trackingEdit, setTrackingEdit] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("USPS");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const handleSaveTracking = async (listingId: number) => {
    try {
      const result = await updateTracking.mutateAsync({
        id: listingId,
        trackingNumber,
        trackingCarrier,
        buyerName: buyerName || undefined,
        buyerEmail: buyerEmail || undefined,
      });
      utils.listings.list.invalidate();
      toast.success("Tracking info saved!");
      setTrackingEdit(null);
      if (result.shareToken) {
        const shareUrl = `${window.location.origin}/track/${result.shareToken}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success("Share link copied to clipboard!", { description: shareUrl });
        });
      }
    } catch {
      toast.error("Failed to save tracking info");
    }
  };

  const handleRefreshTracking = async (listingId: number) => {
    try {
      await refreshTracking.mutateAsync({ id: listingId });
      utils.listings.list.invalidate();
      toast.success("Tracking status updated!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to refresh tracking");
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Buyer tracking link copied!", { description: url });
  };

  const handlePost = async (listingId: number, platform: Platform) => {
    setPosting({ id: listingId, platform });
    try {
      const result = await postToPlatform.mutateAsync({ listingId, platform });
      utils.listings.list.invalidate();
      toast.success(`Posted to ${platform}!`, {
        description: result.url ? `View listing: ${result.url}` : undefined,
        action: result.url ? { label: "View", onClick: () => window.open(result.url, "_blank") } : undefined,
      });
    } catch {
      toast.error(`Failed to post to ${platform}`);
    } finally {
      setPosting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="memphis-card p-4 animate-pulse">
            <div className="h-4 bg-[oklch(0.85_0.04_55)] rounded w-2/3 mb-2" />
            <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="memphis-card p-8 text-center">
        <Tag size={32} className="mx-auto mb-3 text-[oklch(0.6_0.04_55)]" />
        <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.45_0.02_55)]">No listings yet</p>
        <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1">Research an item or use eBay Sync to import existing listings!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!ebayStatus?.connected && (
        <div className="memphis-card p-4 border-2 border-[oklch(0.65_0.18_260)] bg-[oklch(0.96_0.03_260)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.3_0.18_260)]">Connect eBay Account</p>
              <p className="text-xs text-[oklch(0.45_0.1_260)] mt-0.5">Link your eBay seller account to post listings directly</p>
            </div>
            <a
              href={ebayAuthData?.url ?? "#"}
              className="btn-memphis text-xs whitespace-nowrap flex-shrink-0"
              style={{ background: "oklch(0.65 0.18 260)", color: "white", borderColor: "oklch(0.45 0.18 260)" }}
            >
              Connect eBay
            </a>
          </div>
        </div>
      )}
      {ebayStatus?.connected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.94_0.06_145)] border border-[oklch(0.7_0.15_145)]">
          <CheckCircle2 size={14} className="text-[oklch(0.45_0.15_145)]" />
          <span className="text-xs font-bold text-[oklch(0.35_0.12_145)] uppercase tracking-wide">eBay Connected</span>
        </div>
      )}

      {listings.map(listing => {
        const isExpanded = expandedId === listing.id;
        const platformStatuses = {
          etsy: listing.etsyStatus,
          ebay: listing.ebayStatus,
          facebook: listing.fbStatus,
        };
        const postedCount = Object.values(platformStatuses).filter(s => s === "posted").length;

        return (
          <div key={listing.id} className="memphis-card overflow-hidden">
            <div
              className="p-4 flex items-center gap-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : listing.id)}
            >
              {listing.imageUrl ? (
                <img src={listing.imageUrl} alt={listing.title} className="w-14 h-14 object-cover rounded-lg border-2 border-black flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg border-2 border-black bg-[oklch(0.88_0.04_55)] flex items-center justify-center flex-shrink-0">
                  <Tag size={20} className="text-[oklch(0.55_0.02_55)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{listing.title}</p>
                <p className="text-lg font-black">${Number(listing.price).toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-medium text-[oklch(0.45_0.02_55)]">
                    {postedCount}/3 platforms
                  </span>
                  {PLATFORMS.map(p => {
                    const status = platformStatuses[p.id as Platform];
                    return (
                      <span
                        key={p.id}
                        className={`w-2 h-2 rounded-full ${status === "posted" ? "bg-[oklch(0.65_0.15_165)]" : "bg-[oklch(0.75_0.04_55)]"}`}
                      />
                    );
                  })}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isExpanded && (
              <div className="border-t-2 border-black/10 p-4 space-y-4">
                <p className="text-sm font-medium text-[oklch(0.35_0.02_55)] leading-relaxed line-clamp-3">
                  {listing.description}
                </p>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider mb-2">Post to Platforms</p>
                  <div className="space-y-2">
                    {PLATFORMS.map(platform => {
                      const status = platformStatuses[platform.id as Platform];
                      const url = platform.id === "etsy" ? listing.etsyUrl :
                                  platform.id === "ebay" ? listing.ebayUrl : listing.fbUrl;
                      const isPosting = posting?.id === listing.id && posting.platform === platform.id;

                      return (
                        <div key={platform.id} className="flex items-center justify-between p-3 bg-[oklch(0.95_0.02_55)] rounded-lg border border-black/10">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 border-black"
                              style={{ background: platform.color, color: platform.textColor }}
                            >
                              {platform.label[0]}
                            </div>
                            <span className="font-bold text-sm">{platform.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === "posted" ? (
                              <>
                                <span className="flex items-center gap-1 text-xs font-bold text-[oklch(0.45_0.15_165)]">
                                  <CheckCircle2 size={14} /> Posted
                                </span>
                                {url && (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn-memphis btn-memphis-mint text-[10px] px-2 py-1">
                                    <ExternalLink size={10} /> View
                                  </a>
                                )}
                              </>
                            ) : status === "pending" ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-[oklch(0.55_0.12_95)]">
                                <Clock size={14} /> Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePost(listing.id, platform.id as Platform)}
                                disabled={isPosting}
                                className="btn-memphis btn-memphis-black text-[10px] px-3 py-1.5 disabled:opacity-50"
                              >
                                {isPosting ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                Post
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {listing.tags && (listing.tags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(listing.tags as string[]).slice(0, 6).map((tag, i) => (
                      <span key={i} className="memphis-badge bg-[oklch(0.85_0.08_165)] text-[10px]">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="border-t-2 border-black/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Truck size={12} /> Shipment Tracking
                    </p>
                    <div className="flex items-center gap-2">
                      {listing.trackingShareToken && (
                        <button
                          onClick={() => copyShareLink(listing.trackingShareToken!)}
                          className="btn-memphis btn-memphis-mint text-[10px] px-2 py-1"
                        >
                          <Share2 size={10} /> Buyer Link
                        </button>
                      )}
                      {listing.trackingNumber && (
                        <button
                          onClick={() => handleRefreshTracking(listing.id)}
                          disabled={refreshTracking.isPending}
                          className="btn-memphis btn-memphis-yellow text-[10px] px-2 py-1 disabled:opacity-50"
                        >
                          <RefreshCw size={10} className={refreshTracking.isPending ? "animate-spin" : ""} /> Refresh
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setTrackingEdit(trackingEdit === listing.id ? null : listing.id);
                          setTrackingNumber(listing.trackingNumber ?? "");
                          setTrackingCarrier(listing.trackingCarrier ?? "USPS");
                          setBuyerName(listing.buyerName ?? "");
                          setBuyerEmail(listing.buyerEmail ?? "");
                        }}
                        className="btn-memphis btn-memphis-black text-[10px] px-2 py-1"
                      >
                        {listing.trackingNumber ? "Edit" : "+ Add"}
                      </button>
                    </div>
                  </div>

                  {listing.trackingNumber && trackingEdit !== listing.id && (
                    <div className="bg-[oklch(0.95_0.02_55)] rounded-xl border-2 border-black/10 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[oklch(0.45_0.02_55)]">{listing.trackingCarrier}</span>
                        {listing.trackingStatus && (
                          <span className="memphis-badge text-[9px] bg-[oklch(0.85_0.08_165)]">{listing.trackingStatus}</span>
                        )}
                      </div>
                      <p className="text-sm font-black font-mono">{listing.trackingNumber}</p>
                      {listing.trackingLastUpdate && (
                        <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium">{listing.trackingLastUpdate}</p>
                      )}
                      {listing.buyerName && (
                        <p className="text-xs font-bold text-[oklch(0.35_0.02_55)]">
                          Buyer: {listing.buyerName}{listing.buyerEmail ? ` · ${listing.buyerEmail}` : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {trackingEdit === listing.id && (
                    <div className="space-y-3 bg-[oklch(0.95_0.02_55)] rounded-xl border-2 border-black/10 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wide mb-1">Carrier</label>
                          <select
                            value={trackingCarrier}
                            onChange={(e) => setTrackingCarrier(e.target.value)}
                            className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-xs font-medium outline-none"
                          >
                            {["USPS", "UPS", "FedEx", "DHL", "Other"].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wide mb-1">Tracking #</label>
                          <input
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="9400111899..."
                            className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wide mb-1">Buyer Name</label>
                          <input
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="Jane Smith"
                            className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wide mb-1">Buyer Email</label>
                          <input
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            placeholder="jane@email.com"
                            className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveTracking(listing.id)}
                        disabled={updateTracking.isPending}
                        className="btn-memphis btn-memphis-black text-[10px] w-full justify-center py-2 disabled:opacity-50"
                      >
                        {updateTracking.isPending ? <Loader2 size={10} className="animate-spin" /> : <Truck size={10} />}
                        Save & Copy Buyer Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
