import { useState } from "react";
import { useLocation } from "wouter";
import { Camera, Tag, TrendingUp, Zap, ArrowRight, Star, DollarSign, Loader2, X, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const [, navigate] = useLocation();
  const [showQuickSell, setShowQuickSell] = useState(false);
  const { data: stats } = trpc.items.stats.useQuery();
  const { data: profit } = trpc.items.profitStats.useQuery();

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      {/* Hero */}
      <div className="text-center mb-6 pt-4">
        <div className="inline-flex items-center gap-2 memphis-badge bg-[oklch(0.85_0.08_165)] mb-4">
          <Star size={10} fill="currentColor" />
          <span>Your Resale Assistant</span>
          <Star size={10} fill="currentColor" />
        </div>
        <h1 className="display-title mb-3">
          Find it.<br />
          <span className="text-[oklch(0.72_0.14_30)]">Price it.</span><br />
          List it.
        </h1>
        <p className="text-base font-medium text-[oklch(0.35_0.02_55)] max-w-sm mx-auto">
          Snap a photo, get instant market pricing, and cross-post to Etsy, eBay & Facebook in seconds.
        </p>
      </div>

      {/* Primary CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
        <button
          onClick={() => navigate("/research")}
          className="btn-memphis btn-memphis-black text-sm px-6 py-3 w-full sm:w-auto justify-center"
        >
          <Camera size={16} />
          Research an Item
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => setShowQuickSell(true)}
          className="btn-memphis btn-memphis-coral text-sm px-6 py-3 w-full sm:w-auto justify-center"
        >
          <Zap size={16} />
          Quick Sell
        </button>
        <button
          onClick={() => navigate("/listings")}
          className="btn-memphis btn-memphis-mint text-sm px-6 py-3 w-full sm:w-auto justify-center"
        >
          <Tag size={16} />
          My Listings
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="memphis-card-yellow p-4 text-center">
            <div className="text-2xl font-black">{stats.totalItems}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[oklch(0.35_0.02_55)]">Researched</div>
          </div>
          <div className="memphis-card-mint p-4 text-center">
            <div className="text-2xl font-black">{stats.totalListings}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[oklch(0.35_0.02_55)]">Listed</div>
          </div>
          <div className="memphis-card-lilac p-4 text-center">
            <div className="text-2xl font-black">{stats.soldItems}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[oklch(0.35_0.02_55)]">Sold</div>
          </div>
        </div>
      )}

      {/* Profit card */}
      {profit && profit.soldCount > 0 && (
        <div className="memphis-card p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.85_0.08_165)] border-2 border-black flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} className="text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="section-title text-xs mb-1">Total Profit</p>
            <p className="text-2xl font-black text-[oklch(0.25_0.12_165)]">
              ${profit.totalProfit.toFixed(2)}
            </p>
            <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium">
              ${profit.totalRevenue.toFixed(2)} revenue · ${profit.totalCost.toFixed(2)} cost · {profit.soldCount} items sold
            </p>
          </div>
          <button
            onClick={() => navigate("/history")}
            className="btn-memphis btn-memphis-black text-xs px-3 py-1.5"
          >
            Details
          </button>
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate("/research")}
          className="memphis-card p-5 text-left hover:translate-y-[-2px] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-[oklch(0.92_0.12_95)] border-2 border-black flex items-center justify-center mb-3">
            <Camera size={18} className="text-black" />
          </div>
          <h3 className="section-title text-sm mb-1">Photo Research</h3>
          <p className="text-xs text-[oklch(0.4_0.02_55)] font-medium leading-relaxed">
            Upload a photo or describe your item. AI identifies it and pulls real sold-listing prices from eBay.
          </p>
        </button>

        <button
          onClick={() => navigate("/listings")}
          className="memphis-card-mint p-5 text-left hover:translate-y-[-2px] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center mb-3">
            <Zap size={18} className="text-black" />
          </div>
          <h3 className="section-title text-sm mb-1">Auto-Generate</h3>
          <p className="text-xs text-[oklch(0.25_0.02_165)] font-medium leading-relaxed">
            AI writes your title, description, and tags. Post to Etsy, eBay, and Facebook with one tap.
          </p>
        </button>

        <button
          onClick={() => navigate("/listings")}
          className="memphis-card-lilac p-5 text-left hover:translate-y-[-2px] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center mb-3">
            <Truck size={18} className="text-black" />
          </div>
          <h3 className="section-title text-sm mb-1">Track & Share</h3>
          <p className="text-xs text-[oklch(0.25_0.02_295)] font-medium leading-relaxed">
            Add tracking numbers and share a live tracking page directly with your buyers.
          </p>
        </button>
      </div>

      {/* Recent items */}
      <RecentItems />

      {/* Quick Sell Modal */}
      {showQuickSell && <QuickSellModal onClose={() => setShowQuickSell(false)} />}
    </div>
  );
}

function QuickSellModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [description, setDescription] = useState("");
  const [thriftCost, setThriftCost] = useState("");
  const utils = trpc.useUtils();

  const quickSell = trpc.items.quickSell.useMutation({
    onSuccess: (data) => {
      utils.items.list.invalidate();
      utils.items.stats.invalidate();
      toast.success("Item created! Researching now...");
      onClose();
      navigate(`/research/${data.itemId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="memphis-card w-full max-w-md p-6 page-enter">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Quick Sell</h2>
            <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium mt-0.5">
              Describe the item — AI will research and price it instantly
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[oklch(0.88_0.04_55)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
              What is it? <span className="text-[oklch(0.72_0.14_30)]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Vintage Nike windbreaker jacket, size L, 1990s, blue and white..."
              rows={3}
              className="w-full bg-white border-2 border-black rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
              What did you pay? <span className="text-[oklch(0.45_0.02_55)] font-normal normal-case">(optional — for profit tracking)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm">$</span>
              <input
                type="number"
                value={thriftCost}
                onChange={(e) => setThriftCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-white border-2 border-black rounded-xl pl-7 pr-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>
          </div>

          <button
            onClick={() => quickSell.mutate({ description, thriftCost: thriftCost || undefined })}
            disabled={!description.trim() || quickSell.isPending}
            className="btn-memphis btn-memphis-black w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {quickSell.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Researching...</>
            ) : (
              <><Zap size={16} /> Research & Price It</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentItems() {
  const [, navigate] = useLocation();
  const { data: items, isLoading } = trpc.items.list.useQuery({ limit: 4 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="section-title text-sm">Recent Research</h2>
        {[1, 2, 3].map(i => (
          <div key={i} className="memphis-card p-4 animate-pulse">
            <div className="h-4 bg-[oklch(0.85_0.04_55)] rounded w-2/3 mb-2" />
            <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="memphis-card p-8 text-center">
        <Camera size={32} className="mx-auto mb-3 text-[oklch(0.6_0.04_55)]" />
        <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.45_0.02_55)]">No items yet</p>
        <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1">Start by researching your first item!</p>
        <button
          onClick={() => navigate("/research")}
          className="btn-memphis btn-memphis-black mt-4 text-xs"
        >
          <Camera size={12} />
          Research Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title text-sm">Recent Research</h2>
        <button
          onClick={() => navigate("/history")}
          className="text-xs font-bold uppercase tracking-wide text-[oklch(0.45_0.02_55)] hover:text-black transition-colors flex items-center gap-1"
        >
          View All <ArrowRight size={12} />
        </button>
      </div>
      <div className="space-y-2">
        {(items as any[]).map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/research/${item.id}`)}
            className="memphis-card p-4 w-full text-left flex items-center gap-4 hover:translate-y-[-1px] transition-transform"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.identifiedName ?? "Item"}
                className="w-14 h-14 object-cover rounded-lg border-2 border-black flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg border-2 border-black bg-[oklch(0.88_0.04_55)] flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-[oklch(0.55_0.02_55)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">
                {item.identifiedName ?? item.manualDescription ?? "Unknown Item"}
              </p>
              {item.identifiedBrand && (
                <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium">{item.identifiedBrand}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {item.suggestedPrice && (
                  <p className="text-sm font-black text-[oklch(0.35_0.14_30)]">
                    ${Number(item.suggestedPrice).toFixed(2)}
                  </p>
                )}
                {item.thriftCost && (
                  <p className="text-xs font-bold text-[oklch(0.45_0.02_55)]">
                    paid ${Number(item.thriftCost).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <span className={`memphis-badge text-[10px] flex-shrink-0 status-${item.status}`}>
              {item.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
