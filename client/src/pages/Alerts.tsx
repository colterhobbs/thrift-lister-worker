import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Loader2, ToggleLeft, ToggleRight, X } from "lucide-react";

const CATEGORIES = [
  "Clothing", "Electronics", "Home Decor", "Books", "Toys",
  "Jewelry", "Sports", "Vintage", "Art", "Furniture", "Kitchen", "Other"
];

export default function Alerts() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery();
  const createAlert = trpc.alerts.create.useMutation();
  const toggleAlert = trpc.alerts.toggle.useMutation();
  const deleteAlert = trpc.alerts.delete.useMutation();
  const checkPrice = trpc.alerts.checkPrice.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    keyword: "",
    category: "",
    baselinePrice: "",
    thresholdPercent: 20,
  });
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [priceResults, setPriceResults] = useState<Record<number, { currentPrice: number; priceMin: number; priceMax: number }>>({});

  if (!isAuthenticated) {
    return (
      <div className="container py-12 pb-24 md:pb-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="memphis-card p-8 text-center max-w-sm w-full">
          <Bell size={40} className="mx-auto mb-4 text-[oklch(0.45_0.02_55)]" />
          <h2 className="section-title text-lg mb-2">Sign In for Price Alerts</h2>
          <a href={getLoginUrl()} className="btn-memphis btn-memphis-black w-full justify-center">Sign In</a>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!form.keyword.trim()) { toast.error("Keyword is required"); return; }
    try {
      await createAlert.mutateAsync({
        keyword: form.keyword,
        category: form.category || undefined,
        baselinePrice: form.baselinePrice || undefined,
        thresholdPercent: form.thresholdPercent,
      });
      utils.alerts.list.invalidate();
      toast.success("Price alert created!");
      setShowForm(false);
      setForm({ keyword: "", category: "", baselinePrice: "", thresholdPercent: 20 });
    } catch {
      toast.error("Failed to create alert");
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await toggleAlert.mutateAsync({ id, isActive: !isActive });
      utils.alerts.list.invalidate();
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this alert?")) return;
    try {
      await deleteAlert.mutateAsync({ id });
      utils.alerts.list.invalidate();
      toast.success("Alert deleted");
    } catch {
      toast.error("Failed to delete alert");
    }
  };

  const handleCheckPrice = async (alert: { id: number; keyword: string; category: string | null; baselinePrice: string | null }) => {
    setCheckingId(alert.id);
    try {
      const result = await checkPrice.mutateAsync({
        keyword: alert.keyword,
        category: alert.category ?? undefined,
      });
      setPriceResults(prev => ({ ...prev, [alert.id]: result }));

      if (alert.baselinePrice) {
        const baseline = Number(alert.baselinePrice);
        const current = result.currentPrice;
        const diff = ((current - baseline) / baseline) * 100;
        if (Math.abs(diff) > 15) {
          toast(diff > 0 ? "📈 Prices are UP!" : "📉 Prices are DOWN!", {
            description: `${alert.keyword}: was $${baseline.toFixed(2)}, now ~$${current.toFixed(2)} (${diff > 0 ? "+" : ""}${diff.toFixed(0)}%)`,
          });
        } else {
          toast.success("Prices are stable", { description: `${alert.keyword}: ~$${current.toFixed(2)}` });
        }
      }
    } catch {
      toast.error("Failed to check price");
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title text-xl mb-1">Price Alerts</h1>
          <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">
            Get notified when similar items sell at different prices
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-memphis btn-memphis-black text-xs"
        >
          <Plus size={12} />
          New Alert
        </button>
      </div>

      {/* Info card */}
      <div className="memphis-card-mint p-4 mb-6">
        <div className="flex items-start gap-3">
          <TrendingUp size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">How Price Alerts Work</p>
            <p className="text-xs font-medium text-[oklch(0.25_0.02_165)] mt-1">
              Set a keyword and baseline price. When you check an alert, the AI researches current market prices
              and notifies you if there's a significant change — so you can adjust your pricing strategy.
            </p>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="memphis-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-sm">New Price Alert</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-[oklch(0.45_0.02_55)]" /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Search Keyword *</label>
              <input
                value={form.keyword}
                onChange={(e) => setForm(f => ({ ...f, keyword: e.target.value }))}
                placeholder="e.g. Nike Air Max, Vintage Levi's, Pyrex bowls..."
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none"
                >
                  <option value="">Any</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">Baseline Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm">$</span>
                  <input
                    value={form.baselinePrice}
                    onChange={(e) => setForm(f => ({ ...f, baselinePrice: e.target.value }))}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="w-full bg-white border-2 border-black rounded-lg pl-7 pr-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Alert Threshold: {form.thresholdPercent}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={form.thresholdPercent}
                onChange={(e) => setForm(f => ({ ...f, thresholdPercent: Number(e.target.value) }))}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-[10px] text-[oklch(0.45_0.02_55)] font-medium mt-1">
                <span>5% (sensitive)</span>
                <span>50% (major changes)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={createAlert.isPending}
            className="btn-memphis btn-memphis-black w-full justify-center mt-4 disabled:opacity-50"
          >
            {createAlert.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Create Alert
          </button>
        </div>
      )}

      {/* Alerts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="memphis-card p-4 animate-pulse">
              <div className="h-4 bg-[oklch(0.85_0.04_55)] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="memphis-card p-8 text-center">
          <Bell size={32} className="mx-auto mb-3 text-[oklch(0.6_0.04_55)]" />
          <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.45_0.02_55)]">No alerts yet</p>
          <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1 mb-4">
            Create alerts for items you sell regularly to track price changes.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-memphis btn-memphis-black text-xs">
            <Plus size={12} />
            Create First Alert
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const result = priceResults[alert.id];
            const isChecking = checkingId === alert.id;
            const colors = ["memphis-card", "memphis-card-yellow", "memphis-card-lilac", "memphis-card-mint"];
            const cardClass = colors[i % colors.length];

            let priceDiff: number | null = null;
            if (result && alert.baselinePrice) {
              priceDiff = ((result.currentPrice - Number(alert.baselinePrice)) / Number(alert.baselinePrice)) * 100;
            }

            return (
              <div key={alert.id} className={`${cardClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-sm truncate">{alert.keyword}</h3>
                      <span className={`memphis-badge text-[9px] ${alert.isActive ? "bg-[oklch(0.85_0.08_165)]" : "bg-[oklch(0.75_0.02_55)]"}`}>
                        {alert.isActive ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-[oklch(0.45_0.02_55)]">
                      {alert.category && <span>{alert.category}</span>}
                      {alert.baselinePrice && <span>Baseline: ${Number(alert.baselinePrice).toFixed(2)}</span>}
                      <span>Alert at ±{alert.thresholdPercent}%</span>
                    </div>

                    {/* Price check result */}
                    {result && (
                      <div className="mt-3 p-3 bg-white/70 rounded-lg border border-black/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide">Current Market</p>
                            <p className="text-xl font-black">${result.currentPrice.toFixed(2)}</p>
                            <p className="text-[10px] text-[oklch(0.45_0.02_55)]">
                              Range: ${result.priceMin.toFixed(2)} – ${result.priceMax.toFixed(2)}
                            </p>
                          </div>
                          {priceDiff !== null && (
                            <div className={`flex items-center gap-1 font-black text-sm ${priceDiff > 0 ? "text-green-700" : "text-red-700"}`}>
                              {priceDiff > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                              {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggle(alert.id, alert.isActive)}
                        className="text-[oklch(0.45_0.02_55)] hover:text-black transition-colors"
                      >
                        {alert.isActive ? <ToggleRight size={22} className="text-[oklch(0.65_0.15_165)]" /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="text-[oklch(0.55_0.02_55)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleCheckPrice(alert)}
                      disabled={isChecking || !alert.isActive}
                      className="btn-memphis btn-memphis-black text-[10px] px-3 py-1.5 disabled:opacity-50"
                    >
                      {isChecking ? <Loader2 size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                      Check Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
