import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Truck, Package, CheckCircle, Clock, MapPin, AlertCircle } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";

const CARRIER_URLS: Record<string, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  DHL: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  "In Transit": <Truck size={20} className="text-[oklch(0.55_0.18_260)]" />,
  "Out for Delivery": <Truck size={20} className="text-[oklch(0.65_0.15_95)]" />,
  "Delivered": <CheckCircle size={20} className="text-[oklch(0.55_0.15_165)]" />,
  "Pending": <Clock size={20} className="text-[oklch(0.55_0.04_55)]" />,
  "Exception": <AlertCircle size={20} className="text-[oklch(0.65_0.2_25)]" />,
};

export default function TrackingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const { data: listing, isLoading, error } = trpc.listings.getByShareToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "oklch(0.97 0.03 75)" }}>
      <MemphisBackground />

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-black text-xl uppercase tracking-tight mb-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            SalvagingHistory
          </div>
          <p className="text-sm font-medium text-[oklch(0.45_0.02_55)]">Order Tracking</p>
        </div>

        {isLoading && (
          <div className="memphis-card w-full max-w-md p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[oklch(0.88_0.04_55)] mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-[oklch(0.88_0.04_55)] rounded w-2/3 mx-auto mb-2 animate-pulse" />
            <div className="h-3 bg-[oklch(0.88_0.04_55)] rounded w-1/2 mx-auto animate-pulse" />
          </div>
        )}

        {error && (
          <div className="memphis-card w-full max-w-md p-8 text-center">
            <AlertCircle size={40} className="mx-auto mb-4 text-[oklch(0.65_0.2_25)]" />
            <h2 className="section-title text-lg mb-2">Tracking Link Not Found</h2>
            <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">
              This tracking link may have expired or is invalid. Please contact the seller for updated tracking information.
            </p>
          </div>
        )}

        {listing && (
          <div className="w-full max-w-md space-y-4">
            {/* Item card */}
            <div className="memphis-card p-5">
              <div className="flex items-center gap-4">
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-16 h-16 object-cover rounded-xl border-2 border-black flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-black bg-[oklch(0.88_0.04_55)] flex items-center justify-center flex-shrink-0">
                    <Package size={24} className="text-[oklch(0.55_0.02_55)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {listing.buyerName && (
                    <p className="text-xs font-bold text-[oklch(0.45_0.02_55)] mb-0.5">
                      For {listing.buyerName}
                    </p>
                  )}
                  <p className="font-black text-sm leading-tight">{listing.title}</p>
                  {listing.trackingStatus && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {STATUS_ICONS[listing.trackingStatus] ?? <Truck size={16} />}
                      <span className="font-bold text-sm">{listing.trackingStatus}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tracking info */}
            {listing.trackingNumber && (
              <div className="memphis-card-mint p-5">
                <p className="section-title text-xs mb-3">Tracking Details</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[oklch(0.35_0.02_165)]">Carrier</span>
                    <span className="font-black text-sm">{listing.trackingCarrier ?? "USPS"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[oklch(0.35_0.02_165)]">Tracking Number</span>
                    <span className="font-black text-sm font-mono">{listing.trackingNumber}</span>
                  </div>
                  {listing.trackingLastUpdate && (
                    <div>
                      <span className="text-xs font-bold text-[oklch(0.35_0.02_165)]">Last Update</span>
                      <p className="font-medium text-sm mt-0.5">{listing.trackingLastUpdate}</p>
                    </div>
                  )}
                  {listing.trackingUpdatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[oklch(0.35_0.02_165)]">Checked</span>
                      <span className="text-xs font-medium text-[oklch(0.45_0.02_55)]">
                        {new Date(listing.trackingUpdatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Link to carrier website */}
                {listing.trackingCarrier && CARRIER_URLS[listing.trackingCarrier] && (
                  <a
                    href={CARRIER_URLS[listing.trackingCarrier](listing.trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-memphis btn-memphis-black w-full justify-center mt-4 text-xs"
                  >
                    <MapPin size={12} />
                    Track on {listing.trackingCarrier} Website
                  </a>
                )}
              </div>
            )}

            {!listing.trackingNumber && (
              <div className="memphis-card-yellow p-5 text-center">
                <Clock size={28} className="mx-auto mb-3 text-[oklch(0.45_0.02_55)]" />
                <p className="font-bold text-sm uppercase tracking-wide">Tracking Pending</p>
                <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium mt-1">
                  Your tracking number will appear here once the seller ships your order.
                </p>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-[oklch(0.55_0.02_55)] font-medium pb-4">
              Questions? Contact the seller directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
