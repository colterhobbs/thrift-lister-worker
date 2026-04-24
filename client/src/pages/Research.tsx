import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Camera, Upload, Type, X, Loader2, TrendingUp, Tag, Star, ChevronRight, CheckCircle2, Plus, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Mode = "idle" | "photo" | "text";
type Step = "upload" | "identifying" | "results";

interface IdentificationResult {
  name: string;
  brand: string;
  category: string;
  condition: string;
  description: string;
  tags: string[];
  estimatedEra: string;
  uniqueFeatures: string;
  confidence: number;
}

interface PricingResult {
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
  comparables: Array<{ title: string; price: number; platform: string; soldDate: string; condition: string }>;
  pricingNotes: string;
}

interface UploadedPhoto {
  previewUrl: string;
  s3Url: string | null;
  uploading: boolean;
  file: File;
}

const MAX_PHOTOS = 5;

export default function Research() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("idle");
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [userDescription, setUserDescription] = useState("");
  const [manualText, setManualText] = useState("");
  const [identification, setIdentification] = useState<IdentificationResult | null>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.items.uploadImage.useMutation();
  const createFromImage = trpc.items.createFromImage.useMutation();
  const createFromDescription = trpc.items.createFromDescription.useMutation();

  const uploadFileToS3 = useCallback(async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(",")[1]);
      };
      r.readAsDataURL(file);
    });
    const { url } = await uploadImage.mutateAsync({ base64, mimeType: file.type });
    return url;
  }, [uploadImage]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    const toAdd = fileArray.slice(0, remaining);
    if (fileArray.length > remaining) {
      toast.info(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added (max ${MAX_PHOTOS})`);
    }

    // Validate files
    for (const file of toAdd) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
    }

    // Create preview entries immediately
    const newPhotos: UploadedPhoto[] = toAdd.map(file => ({
      previewUrl: URL.createObjectURL(file),
      s3Url: null,
      uploading: true,
      file,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);

    // Upload each to S3 in parallel
    const uploadPromises = toAdd.map(async (file, i) => {
      try {
        const s3Url = await uploadFileToS3(file);
        setPhotos(prev => {
          const updated = [...prev];
          const idx = prev.length - toAdd.length + i;
          if (updated[idx]) {
            updated[idx] = { ...updated[idx], s3Url, uploading: false };
          }
          return updated;
        });
        return s3Url;
      } catch {
        setPhotos(prev => {
          const updated = [...prev];
          const idx = prev.length - toAdd.length + i;
          if (updated[idx]) {
            updated[idx] = { ...updated[idx], uploading: false };
          }
          return updated;
        });
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    await Promise.all(uploadPromises);
  }, [photos.length, uploadFileToS3]);

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleAnalyze = async () => {
    const readyPhotos = photos.filter(p => p.s3Url);
    if (readyPhotos.length === 0) {
      toast.error("Please wait for photos to finish uploading");
      return;
    }
    const stillUploading = photos.some(p => p.uploading);
    if (stillUploading) {
      toast.info("Waiting for all photos to finish uploading...");
    }

    setStep("identifying");
    try {
      const imageUrls = readyPhotos.map(p => p.s3Url!);
      const result = await createFromImage.mutateAsync({
        imageUrl: imageUrls[0],
        imageUrls,
        userDescription: userDescription.trim() || undefined,
      });
      setIdentification(result.identification);
      setPricing(result.pricing);
      setItemId(result.itemId);
      setStep("results");
    } catch {
      toast.error("Failed to analyze photos. Please try again.");
      setStep("upload");
    }
  };

  const handleTextSubmit = async () => {
    if (!manualText.trim()) return;
    setStep("identifying");
    try {
      const result = await createFromDescription.mutateAsync({ description: manualText });
      setIdentification(result.identification);
      setPricing(result.pricing);
      setItemId(result.itemId);
      setStep("results");
    } catch {
      toast.error("Failed to research item. Please try again.");
      setStep("upload");
    }
  };

  const handleReset = () => {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setMode("idle");
    setStep("upload");
    setPhotos([]);
    setUserDescription("");
    setManualText("");
    setIdentification(null);
    setPricing(null);
    setItemId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-12 pb-24 md:pb-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="memphis-card p-8 text-center max-w-sm w-full">
          <Camera size={40} className="mx-auto mb-4 text-[oklch(0.45_0.02_55)]" />
          <h2 className="section-title text-lg mb-2">Sign In to Research</h2>
          <p className="text-sm text-[oklch(0.45_0.02_55)] mb-6">
            Create a free account to start researching and pricing your thrift finds.
          </p>
          <a href={getLoginUrl()} className="btn-memphis btn-memphis-black w-full justify-center">
            Sign In / Sign Up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      <div className="mb-6">
        <h1 className="section-title text-xl mb-1">Research Item</h1>
        <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">
          Upload up to 5 photos or describe your item to get instant pricing
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["upload", "identifying", "results"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-xs font-black
              ${step === s ? "bg-black text-white" :
                (["identifying", "results"].indexOf(step) > i) ? "bg-[oklch(0.85_0.08_165)] text-black" : "bg-white text-black"}`}>
              {(["identifying", "results"].indexOf(step) > i) ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide hidden sm:block
              ${step === s ? "text-black" : "text-[oklch(0.55_0.02_55)]"}`}>
              {s === "upload" ? "Upload" : s === "identifying" ? "Analyzing" : "Results"}
            </span>
            {i < 2 && <div className="w-6 h-0.5 bg-[oklch(0.75_0.04_55)]" />}
          </div>
        ))}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="space-y-4">
          {mode === "idle" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode("photo")}
                className="memphis-card p-6 flex flex-col items-center gap-3 hover:translate-y-[-2px] transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-[oklch(0.92_0.12_95)] border-2 border-black flex items-center justify-center">
                  <Camera size={24} />
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-wide">Photos</p>
                  <p className="text-xs text-[oklch(0.45_0.02_55)] font-medium mt-0.5">Up to 5 photos</p>
                </div>
              </button>
              <button
                onClick={() => setMode("text")}
                className="memphis-card-mint p-6 flex flex-col items-center gap-3 hover:translate-y-[-2px] transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center">
                  <Type size={24} />
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-wide">Describe</p>
                  <p className="text-xs text-[oklch(0.25_0.02_165)] font-medium mt-0.5">Type item details</p>
                </div>
              </button>
            </div>
          )}

          {mode === "photo" && (
            <div className="space-y-4">
              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-lg border-2 border-black overflow-hidden bg-[oklch(0.92_0.04_55)]">
                      <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                        </div>
                      )}
                      {!photo.uploading && !photo.s3Url && (
                        <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Failed</span>
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                      {i === 0 && (
                        <div className="absolute bottom-1 left-1 bg-black text-white text-[9px] font-black px-1 rounded uppercase">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add more slot */}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      onClick={() => addMoreRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-black bg-white/50 flex flex-col items-center justify-center gap-1 hover:bg-[oklch(0.92_0.12_95)] transition-colors"
                    >
                      <Plus size={20} />
                      <span className="text-[10px] font-black uppercase">Add</span>
                    </button>
                  )}
                  <input
                    ref={addMoreRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                  />
                </div>
              )}

              {/* Drop zone (shown when no photos yet) */}
              {photos.length === 0 && (
                <div
                  className={`upload-zone p-10 flex flex-col items-center gap-4 text-center ${dragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-[oklch(0.92_0.12_95)] border-2 border-black flex items-center justify-center animate-float">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="font-black text-base uppercase tracking-wide">Drop photos here</p>
                    <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium mt-1">or tap to browse</p>
                    <p className="text-xs text-[oklch(0.55_0.02_55)] mt-2">Up to {MAX_PHOTOS} photos · JPG, PNG, WEBP · 10MB each</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                  />
                </div>
              )}

              {/* Description field */}
              {photos.length > 0 && (
                <div className="memphis-card p-4">
                  <label className="block text-xs font-black uppercase tracking-wider mb-2">
                    Add Details <span className="text-[oklch(0.55_0.02_55)] normal-case font-medium">(optional — helps AI accuracy)</span>
                  </label>
                  <textarea
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder="e.g. Nike windbreaker, size L, 1990s, red/black. Has small stain on sleeve..."
                    className="w-full h-20 bg-white border-2 border-black rounded-lg p-3 text-sm font-medium resize-none outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                  />
                  <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1">
                    Brand, size, color, condition, era, or anything you know about the item
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {photos.length > 0 ? (
                  <>
                    <button
                      onClick={handleAnalyze}
                      disabled={photos.every(p => !p.s3Url) || photos.some(p => p.uploading)}
                      className="btn-memphis btn-memphis-black flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {photos.some(p => p.uploading) ? (
                        <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                      ) : (
                        <><TrendingUp size={14} /> Analyze {photos.filter(p => p.s3Url).length} Photo{photos.filter(p => p.s3Url).length !== 1 ? "s" : ""}</>
                      )}
                    </button>
                    <button onClick={() => setMode("idle")} className="btn-memphis btn-memphis-yellow px-4">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setMode("idle")} className="btn-memphis btn-memphis-yellow w-full justify-center text-xs">
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-4">
              <div className="memphis-card p-5">
                <label className="block text-xs font-black uppercase tracking-wider mb-2">Describe Your Item</label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="e.g. Vintage Nike windbreaker jacket, size large, red and black, 1990s style, good condition..."
                  className="w-full h-32 bg-white border-2 border-black rounded-lg p-3 text-sm font-medium resize-none outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                  autoFocus
                />
                <p className="text-xs text-[oklch(0.55_0.02_55)] mt-2">
                  Include brand, style, color, size, condition, and any unique features for best results.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleTextSubmit}
                  disabled={!manualText.trim()}
                  className="btn-memphis btn-memphis-black flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrendingUp size={14} />
                  Research Pricing
                </button>
                <button onClick={() => setMode("idle")} className="btn-memphis btn-memphis-yellow px-4">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Identifying step */}
      {step === "identifying" && (
        <div className="memphis-card p-10 flex flex-col items-center gap-6 text-center">
          {/* Photo thumbnails during analysis */}
          {photos.length > 0 && (
            <div className="flex gap-2 justify-center">
              {photos.filter(p => p.s3Url).slice(0, 5).map((p, i) => (
                <div key={i} className="w-12 h-12 rounded-lg border-2 border-black overflow-hidden">
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[oklch(0.92_0.12_95)] border-2 border-black flex items-center justify-center">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-[oklch(0.85_0.12_300)] border-2 border-black rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-[oklch(0.92_0.12_95)] border-2 border-black rounded-full" />
          </div>
          <div>
            <p className="font-black text-lg uppercase tracking-wide">Analyzing Your Item</p>
            <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium mt-2">
              {photos.length > 1
                ? `Examining ${photos.filter(p => p.s3Url).length} photos with AI vision...`
                : "AI is identifying and researching market prices..."}
            </p>
            <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1">This takes about 10-20 seconds</p>
          </div>
          <div className="flex gap-2">
            {["Identifying item", "Checking brand", "Researching prices"].map((label, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-black rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                <span className="text-xs font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results step */}
      {step === "results" && identification && pricing && (
        <div className="space-y-4">
          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.filter(p => p.s3Url).map((p, i) => (
                <div key={i} className={`flex-shrink-0 rounded-lg border-2 overflow-hidden ${i === 0 ? "w-24 h-24 border-black" : "w-16 h-16 border-[oklch(0.75_0.04_55)]"}`}>
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Item identification card */}
          <div className="memphis-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h2 className="section-title text-base">{identification.name}</h2>
                {identification.brand && identification.brand !== "Unknown" && (
                  <p className="text-sm font-bold text-[oklch(0.45_0.02_55)]">{identification.brand}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="badge badge-yellow text-xs">{identification.category}</span>
                <span className="badge badge-mint text-xs">{identification.condition}</span>
              </div>
            </div>
            <p className="text-sm text-[oklch(0.25_0.02_55)] leading-relaxed mb-3">{identification.description}</p>
            {identification.uniqueFeatures && (
              <div className="bg-[oklch(0.92_0.12_95)] border border-black rounded-lg p-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-wide mb-0.5">Notable Features</p>
                <p className="text-xs text-[oklch(0.35_0.02_55)]">{identification.uniqueFeatures}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {identification.tags.slice(0, 8).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-white border border-black rounded-full px-2 py-0.5 text-xs font-bold">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <Star size={12} className="text-[oklch(0.65_0.15_95)]" fill="currentColor" />
              <span className="text-xs font-bold text-[oklch(0.45_0.02_55)]">
                {Math.round(identification.confidence * 100)}% confidence
                {photos.length > 1 && ` · ${photos.filter(p => p.s3Url).length} photos analyzed`}
              </span>
            </div>
          </div>

          {/* Pricing card */}
          <div className="memphis-card-mint p-5">
            <h3 className="section-title text-sm mb-3">Market Pricing</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white border-2 border-black rounded-lg p-3 text-center">
                <p className="text-xs font-black uppercase tracking-wide text-[oklch(0.45_0.02_55)]">Low</p>
                <p className="text-lg font-black">${pricing.priceMin}</p>
              </div>
              <div className="bg-black text-white rounded-lg p-3 text-center border-2 border-black">
                <p className="text-xs font-black uppercase tracking-wide opacity-70">Suggested</p>
                <p className="text-xl font-black">${pricing.suggestedPrice}</p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-3 text-center">
                <p className="text-xs font-black uppercase tracking-wide text-[oklch(0.45_0.02_55)]">High</p>
                <p className="text-lg font-black">${pricing.priceMax}</p>
              </div>
            </div>
            {pricing.pricingNotes && (
              <p className="text-xs text-[oklch(0.25_0.02_165)] font-medium mb-3">{pricing.pricingNotes}</p>
            )}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wide">Comparable Sales</p>
              {pricing.comparables.slice(0, 4).map((comp, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-black rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{comp.title}</p>
                    <p className="text-xs text-[oklch(0.45_0.02_55)]">{comp.platform} · {comp.soldDate}</p>
                  </div>
                  <span className="font-black text-sm ml-2">${comp.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/listings?itemId=${itemId}`)}
              className="btn-memphis btn-memphis-black flex-1 justify-center"
            >
              Create Listing <ChevronRight size={14} />
            </button>
            <button onClick={handleReset} className="btn-memphis btn-memphis-yellow px-4">
              <ImageIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
