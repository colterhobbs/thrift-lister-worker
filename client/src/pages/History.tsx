import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { History as HistoryIcon, Camera, TrendingUp, Search, Filter, ChevronRight, DollarSign, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[oklch(0.88_0.04_55)] text-[oklch(0.35_0.02_55)]",
  researching: "bg-[oklch(0.92_0.12_95)] text-[oklch(0.35_0.02_55)]",
  ready: "bg-[oklch(0.85_0.08_165)] text-[oklch(0.2_0.02_165)]",
  listed: "bg-[oklch(0.82_0.08_295)] text-[oklch(0.2_0.02_295)]",
  sold: "bg-black text-white",
};

type SoldModalState = { itemId: number; itemName: string; suggestedPrice: string | null } | null;

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [offset, setOffset] = useState(0);
  const [soldModal, setSoldModal] = useState<SoldModalState>(null);

  const { data: itemsData, isLoading } = trpc.items.list.useQuery({ limit: 20, offset });
  const { data: profit } = trpc.items.profitStats.useQuery();

  if (!isAuthenticated) {
    return (
      <div className="container py-12 pb-24 md:pb-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="memphis-card p-8 text-center max-w-sm w-full">
          <HistoryIcon size={40} className="mx-auto mb-4 text-[oklch(0.45_0.02_55)]" />
          <h2 className="section-title text-lg mb-2">Sign In to View History</h2>
          <a href={getLoginUrl()} className="btn-memphis btn-memphis-black w-full justify-center">Sign In</a>
        </div>
      </div>
    );
  }

  const allItems = (itemsData as any[]) ?? [];
  const filtered = allItems.filter(item => {
    const matchSearch = !search.trim() ||
      (item.identifiedName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.identifiedBrand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.manualDescription ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title text-xl mb-1">Item History</h1>
          <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">All your researched items</p>
        </div>
        <button
          onClick={() => navigate("/research")}
          className="btn-memphis btn-memphis-black text-xs"
        >
          <Camera size={12} />
          New
        </button>
      </div>

      {/* Profit summary */}
      {profit && profit.soldCount > 0 && (
        <div className="memphis-card-mint p-4 mb-5">
          <p className="section-title text-xs mb-3">Profit Summary</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xl font-black text-[oklch(0.2_0.1_165)]">${profit.totalProfit.toFixed(0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[oklch(0.35_0.02_165)]">Profit</p>
            </div>
            <div>
              <p className="text-xl font-black">${profit.totalRevenue.toFixed(0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[oklch(0.35_0.02_55)]">Revenue</p>
            </div>
            <div>
              <p className="text-xl font-black">${profit.totalCost.toFixed(0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[oklch(0.35_0.02_55)]">Cost</p>
            </div>
            <div>
              <p className="text-xl font-black">{profit.soldCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[oklch(0.35_0.02_55)]">Sold</p>
            </div>
          </div>
          {profit.totalCost > 0 && (
            <div className="mt-3 pt-3 border-t-2 border-black/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[oklch(0.35_0.02_55)]">Return on Investment</span>
                <span className="text-[oklch(0.2_0.1_165)]">
                  {((profit.totalProfit / profit.totalCost) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0.02_55)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-white border-2 border-black rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[undefined, "researching", "ready", "listed", "sold"].map(s => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s)}
              className={`btn-memphis text-[10px] px-3 py-1.5 capitalize flex-shrink-0 ${
                statusFilter === s ? "btn-memphis-black" : "btn-memphis-mint"
              }`}
            >
              {s ?? "All Status"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {allItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Items", value: allItems.length, color: "memphis-card" },
            { label: "Ready to List", value: allItems.filter((i: any) => i.status === "ready").length, color: "memphis-card-mint" },
            { label: "Listed", value: allItems.filter((i: any) => i.status === "listed").length, color: "memphis-card-yellow" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} p-3 text-center`}>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[oklch(0.45_0.02_55)]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="memphis-card p-4 animate-pulse flex gap-4">
              <div className="w-16 h-16 rounded-lg bg-[oklch(0.85_0.04_55)] flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-[oklch(0.85_0.04_55)] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="memphis-card p-8 text-center">
          <HistoryIcon size={32} className="mx-auto mb-3 text-[oklch(0.6_0.04_55)]" />
          <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.45_0.02_55)]">
            {search ? "No items match your search" : "No items yet"}
          </p>
          <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1 mb-4">
            {search ? "Try a different search term" : "Start by researching your first thrift find!"}
          </p>
          {!search && (
            <button onClick={() => navigate("/research")} className="btn-memphis btn-memphis-black text-xs">
              <Camera size={12} />
              Research First Item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any, i: number) => {
            const colors = ["memphis-card", "memphis-card-mint", "memphis-card-lilac", "memphis-card-yellow"];
            const cardClass = item.status === "sold" ? "memphis-card" : colors[i % colors.length];
            const margin = item.soldPrice && item.thriftCost
              ? Number(item.soldPrice) - Number(item.thriftCost)
              : null;

            return (
              <div key={item.id} className={`${cardClass} p-4`}>
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => navigate(`/listings?itemId=${item.id}`)}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.identifiedName ?? "Item"}
                      className="w-16 h-16 object-cover rounded-xl border-2 border-black flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-black bg-white/60 flex items-center justify-center flex-shrink-0">
                      <Camera size={20} className="text-[oklch(0.55_0.02_55)]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">
                          {item.identifiedName ?? item.manualDescription ?? "Unknown Item"}
                        </p>
                        {item.identifiedBrand && item.identifiedBrand !== "Unknown" && (
                          <p className="text-xs font-bold text-[oklch(0.45_0.02_55)]">{item.identifiedBrand}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="flex-shrink-0 text-[oklch(0.55_0.02_55)]" />
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`memphis-badge text-[9px] ${STATUS_COLORS[item.status] ?? "bg-[oklch(0.88_0.04_55)]"}`}>
                        {item.status}
                      </span>
                      {item.suggestedPrice && item.status !== "sold" && (
                        <span className="flex items-center gap-0.5 text-xs font-black">
                          <TrendingUp size={10} />
                          ${Number(item.suggestedPrice).toFixed(2)}
                        </span>
                      )}
                      {item.thriftCost && (
                        <span className="text-xs font-bold text-[oklch(0.45_0.02_55)]">
                          paid ${Number(item.thriftCost).toFixed(2)}
                        </span>
                      )}
                      {item.soldPrice && (
                        <span className="text-xs font-black text-[oklch(0.2_0.1_165)]">
                          sold ${Number(item.soldPrice).toFixed(2)}
                        </span>
                      )}
                      {margin !== null && (
                        <span className={`text-xs font-black ${margin >= 0 ? "text-[oklch(0.2_0.1_165)]" : "text-[oklch(0.55_0.2_25)]"}`}>
                          {margin >= 0 ? "+" : ""}${margin.toFixed(2)} profit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mark as sold button for listed items */}
                {(item.status === "listed" || item.status === "ready") && (
                  <div className="mt-3 pt-3 border-t-2 border-black/10">
                    <button
                      onClick={() => setSoldModal({ itemId: item.id, itemName: item.identifiedName ?? item.manualDescription ?? "Item", suggestedPrice: item.suggestedPrice })}
                      className="btn-memphis btn-memphis-black text-[10px] px-3 py-1.5 w-full justify-center"
                    >
                      <CheckCircle size={12} />
                      Mark as Sold
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {allItems.length === 20 && (
            <button
              onClick={() => setOffset(o => o + 20)}
              className="btn-memphis btn-memphis-yellow w-full justify-center"
            >
              <Filter size={14} />
              Load More
            </button>
          )}
        </div>
      )}

      {/* Mark as Sold Modal */}
      {soldModal && (
        <MarkSoldModal
          itemId={soldModal.itemId}
          itemName={soldModal.itemName}
          suggestedPrice={soldModal.suggestedPrice}
          onClose={() => setSoldModal(null)}
        />
      )}
    </div>
  );
}

function MarkSoldModal({
  itemId,
  itemName,
  suggestedPrice,
  onClose,
}: {
  itemId: number;
  itemName: string;
  suggestedPrice: string | null;
  onClose: () => void;
}) {
  const [soldPrice, setSoldPrice] = useState(suggestedPrice ? Number(suggestedPrice).toFixed(2) : "");
  const [thriftCost, setThriftCost] = useState("");
  const utils = trpc.useUtils();

  const markSold = trpc.items.markSold.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      utils.items.stats.invalidate();
      utils.items.profitStats.invalidate();
      toast.success("Item marked as sold!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const profit = soldPrice && thriftCost
    ? Number(soldPrice) - Number(thriftCost)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="memphis-card w-full max-w-sm p-6 page-enter">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Mark as Sold</h2>
            <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium mt-0.5 truncate max-w-[200px]">{itemName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[oklch(0.88_0.04_55)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
              Final Sale Price <span className="text-[oklch(0.72_0.14_30)]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm">$</span>
              <input
                type="number"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-white border-2 border-black rounded-xl pl-7 pr-4 py-2.5 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
              What did you pay? <span className="text-[oklch(0.45_0.02_55)] font-normal normal-case">(optional)</span>
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

          {profit !== null && (
            <div className={`p-3 rounded-xl border-2 border-black ${profit >= 0 ? "bg-[oklch(0.92_0.06_165)]" : "bg-[oklch(0.95_0.05_25)]"}`}>
              <div className="flex items-center gap-2">
                <DollarSign size={16} />
                <span className="font-black text-sm">
                  {profit >= 0 ? "+" : ""}${profit.toFixed(2)} profit
                </span>
                {profit > 0 && thriftCost && (
                  <span className="text-xs font-bold text-[oklch(0.35_0.02_55)]">
                    ({((profit / Number(thriftCost)) * 100).toFixed(0)}% ROI)
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => markSold.mutate({ id: itemId, soldPrice, thriftCost: thriftCost || undefined })}
            disabled={!soldPrice || markSold.isPending}
            className="btn-memphis btn-memphis-black w-full justify-center py-3 disabled:opacity-50"
          >
            {markSold.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle size={16} /> Confirm Sale</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
