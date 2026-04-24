import { useLocation } from "wouter";
import { Camera, LayoutDashboard, Tag, FileText, Bell, History } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/research", label: "Research", icon: Camera },
  { href: "/listings", label: "Listings", icon: Tag },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/history", label: "History", icon: History },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export default function AppNav() {
  const [location, navigate] = useLocation();

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-[oklch(0.12_0_0)] border-b-4 border-[oklch(0.12_0_0)] sticky top-0 z-50">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-full bg-[oklch(0.85_0.08_165)] border-2 border-white flex items-center justify-center">
            <span className="text-sm font-black text-black">T</span>
          </div>
          <span className="text-white font-black text-lg uppercase tracking-widest">
            Thrift<span className="text-[oklch(0.92_0.12_95)]">Lister</span>
          </span>
        </button>

        <div className="flex items-center gap-1">
          {navItems.slice(1).map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? "bg-[oklch(0.85_0.08_165)] text-black"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={() => navigate("/privacy")}
            className="text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors px-2 py-1.5"
          >
            Privacy
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[oklch(0.12_0_0)] border-t-4 border-[oklch(0.12_0_0)] flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all min-w-0 ${
                active ? "text-[oklch(0.92_0.12_95)]" : "text-white/50"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider leading-none">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile top logo bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[oklch(0.12_0_0)] sticky top-0 z-40">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[oklch(0.85_0.08_165)] border-2 border-white flex items-center justify-center">
            <span className="text-xs font-black text-black">T</span>
          </div>
          <span className="text-white font-black text-base uppercase tracking-widest">
            Thrift<span className="text-[oklch(0.92_0.12_95)]">Lister</span>
          </span>
        </button>
        <button
          onClick={() => navigate("/research")}
          className="btn-memphis btn-memphis-mint text-xs px-3 py-1.5"
        >
          <Camera size={14} />
          Research
        </button>
      </div>
    </>
  );
}
