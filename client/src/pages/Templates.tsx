import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { FileText, Plus, Trash2, Edit3, Save, X, Loader2, Tag } from "lucide-react";

const CATEGORIES = [
  "Clothing", "Electronics", "Home Decor", "Books", "Toys",
  "Jewelry", "Sports", "Vintage", "Art", "Furniture", "Kitchen", "Other"
];

const PLATFORMS = ["etsy", "ebay", "facebook"];

interface TemplateFormData {
  name: string;
  category: string;
  descriptionTemplate: string;
  tags: string[];
  defaultPlatforms: string[];
  notes: string;
}

const emptyForm: TemplateFormData = {
  name: "",
  category: "",
  descriptionTemplate: "",
  tags: [],
  defaultPlatforms: [],
  notes: "",
};

export default function Templates() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const createTemplate = trpc.templates.create.useMutation();
  const updateTemplate = trpc.templates.update.useMutation();
  const deleteTemplate = trpc.templates.delete.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [tagInput, setTagInput] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="container py-12 pb-24 md:pb-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="memphis-card p-8 text-center max-w-sm w-full">
          <FileText size={40} className="mx-auto mb-4 text-[oklch(0.45_0.02_55)]" />
          <h2 className="section-title text-lg mb-2">Sign In to Use Templates</h2>
          <a href={getLoginUrl()} className="btn-memphis btn-memphis-black w-full justify-center">Sign In</a>
        </div>
      </div>
    );
  }

  const handleStartEdit = (template: typeof templates extends (infer T)[] | undefined ? T : never) => {
    if (!template) return;
    setEditingId(template.id);
    setForm({
      name: template.name,
      category: template.category ?? "",
      descriptionTemplate: template.descriptionTemplate ?? "",
      tags: template.tags as string[] ?? [],
      defaultPlatforms: template.defaultPlatforms as string[] ?? [],
      notes: template.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Template name is required"); return; }
    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, ...form });
        toast.success("Template updated!");
      } else {
        await createTemplate.mutateAsync(form);
        toast.success("Template created!");
      }
      utils.templates.list.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate.mutateAsync({ id });
      utils.templates.list.invalidate();
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput("");
  };

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      defaultPlatforms: f.defaultPlatforms.includes(p)
        ? f.defaultPlatforms.filter(x => x !== p)
        : [...f.defaultPlatforms, p],
    }));
  };

  return (
    <div className="container py-6 pb-24 md:pb-8 page-enter max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title text-xl mb-1">Templates</h1>
          <p className="text-sm text-[oklch(0.45_0.02_55)] font-medium">Reusable listing templates for common categories</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="btn-memphis btn-memphis-black text-xs"
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Template Form */}
      {showForm && (
        <div className="memphis-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-sm">{editingId ? "Edit Template" : "New Template"}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>
              <X size={18} className="text-[oklch(0.45_0.02_55)]" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Template Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Vintage Clothing, Electronics, Books..."
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Description Template</label>
              <textarea
                value={form.descriptionTemplate}
                onChange={(e) => setForm(f => ({ ...f, descriptionTemplate: e.target.value }))}
                placeholder="Template text for descriptions. Use placeholders like {brand}, {condition}, {size}..."
                rows={4}
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Default Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
                />
                <button onClick={addTag} className="btn-memphis btn-memphis-mint px-3">
                  <Plus size={14} />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}
                      className="memphis-badge bg-[oklch(0.85_0.08_165)] text-[10px] hover:bg-[oklch(0.72_0.14_30)] hover:text-white transition-colors"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Default Platforms */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Default Platforms</label>
              <div className="flex gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`btn-memphis text-xs px-3 py-1.5 capitalize ${
                      form.defaultPlatforms.includes(p) ? "btn-memphis-black" : "btn-memphis-yellow"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes about this template..."
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_black] transition-shadow"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={createTemplate.isPending || updateTemplate.isPending}
            className="btn-memphis btn-memphis-black w-full justify-center mt-4 disabled:opacity-50"
          >
            {(createTemplate.isPending || updateTemplate.isPending) ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {editingId ? "Save Changes" : "Create Template"}
          </button>
        </div>
      )}

      {/* Templates list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="memphis-card p-4 animate-pulse">
              <div className="h-4 bg-[oklch(0.85_0.04_55)] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[oklch(0.85_0.04_55)] rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="memphis-card p-8 text-center">
          <FileText size={32} className="mx-auto mb-3 text-[oklch(0.6_0.04_55)]" />
          <p className="font-bold text-sm uppercase tracking-wide text-[oklch(0.45_0.02_55)]">No templates yet</p>
          <p className="text-xs text-[oklch(0.55_0.02_55)] mt-1 mb-4">
            Create templates for your most common item categories to speed up listing creation.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-memphis btn-memphis-black text-xs"
          >
            <Plus size={12} />
            Create First Template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template, i) => {
            const colors = ["memphis-card", "memphis-card-mint", "memphis-card-lilac", "memphis-card-yellow"];
            const cardClass = colors[i % colors.length];
            return (
              <div key={template.id} className={`${cardClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-sm">{template.name}</h3>
                      {template.usageCount > 0 && (
                        <span className="memphis-badge bg-[oklch(0.92_0.12_95)] text-[9px]">
                          Used {template.usageCount}×
                        </span>
                      )}
                    </div>
                    {template.category && (
                      <p className="text-xs font-bold text-[oklch(0.45_0.02_55)] mb-2">{template.category}</p>
                    )}
                    {template.descriptionTemplate && (
                      <p className="text-xs font-medium text-[oklch(0.35_0.02_55)] line-clamp-2 mb-2">
                        {template.descriptionTemplate}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {(template.tags as string[]).slice(0, 5).map((tag, j) => (
                        <span key={j} className="memphis-badge bg-white/70 text-[9px]">{tag}</span>
                      ))}
                      {(template.defaultPlatforms as string[]).map(p => (
                        <span key={p} className="memphis-badge bg-black text-white text-[9px] capitalize">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(template)}
                      className="btn-memphis btn-memphis-yellow p-2 text-xs"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="btn-memphis btn-memphis-coral p-2 text-xs"
                    >
                      <Trash2 size={12} />
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
