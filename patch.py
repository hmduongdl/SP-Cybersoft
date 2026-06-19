import re
import sys

with open("src/components/shared/PersonalSettingsModal.tsx", "r") as f:
    content = f.read()

# 1. Update TABS
new_tabs = '''const TABS: TabDef[] = [
  { id: "profile", label: "Hồ sơ tài khoản", icon: User },
  { id: "workspaces", label: "Không gian & Thẻ Tag", icon: Briefcase },
  { id: "appearance", label: "Giao diện hiển thị", icon: Paintbrush },
];'''
content = re.sub(r'const TABS: TabDef\[\] = \[.*?\];', new_tabs, content, flags=re.DOTALL)

# 2. Update renderContent and tabTitles
new_render_content = '''const renderContent = () => {
    switch (activeTab) {
      case "profile":     return <ProfileTab onClose={onClose} />;
      case "workspaces":  return <WorkspacesTab />;
      case "appearance":  return <AppearanceTab />;
      default: return null;
    }
  };

  const tabTitles: Record<string, string> = {
    profile: "Hồ sơ tài khoản",
    workspaces: "Quản lý Không gian & Thẻ Tag",
    appearance: "Giao diện hiển thị",
  };'''
content = re.sub(r'const renderContent = \(\) => \{.*?const tabTitles:[^\}]+\};', new_render_content, content, flags=re.DOTALL)

# 3. Replace WorkspacesTab, TagsTab, InvitationsTab
start_tags = content.find("// ──────────────────── Tags Tab ────────────────────")
start_appearance = content.find("// ──────────────────── AppearanceTab ────────────────────")

if start_tags == -1 or start_appearance == -1:
    print("Could not find boundaries")
    sys.exit(1)

new_code = """
// ──────────────────── Tag Management Component ────────────────────
function TagManager({ workspaceId, title, description, hideIfEmpty }: { workspaceId: string, title: string, description?: string, hideIfEmpty?: boolean }) {
  const { tags, fetchTags } = useTaskStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[8]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const loadTags = useCallback(() => {
    if (workspaceId) fetchTags(workspaceId);
  }, [workspaceId, fetchTags]);

  useEffect(() => { loadTags(); }, [loadTags]);

  const wsTags = tags.filter(t => t.workspace_id === workspaceId);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const url = editingId ? `/api/tags/${editingId}` : "/api/tags";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, workspace_id: workspaceId }),
      });
      if (!res.ok) throw new Error("Lỗi lưu thẻ");
      toast.success(editingId ? "Đã cập nhật thẻ" : "Tạo thẻ mới thành công");
      await fetchTags(workspaceId);
      router.refresh();
      setName(""); setColor(TAG_COLORS[8]); setEditingId(null); setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const startEdit = (tag: any) => { setEditingId(tag.id); setName(tag.name); setColor(tag.color || TAG_COLORS[8]); setShowForm(true); };
  const cancelEdit = () => { setEditingId(null); setName(""); setColor(TAG_COLORS[8]); setShowForm(false); };

  const handleDelete = async (tagId: string) => {
    if (!window.confirm("Cảnh báo: Bạn có chắc chắn muốn xóa thẻ này? Các công việc đang gán tag này sẽ bị gỡ bỏ nhãn!")) return;
    setDeleting(tagId);
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xóa thẻ");
      toast.success("Đã xóa thẻ");
      await fetchTags(workspaceId);
      router.refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(null); }
  };

  if (hideIfEmpty && wsTags.length === 0 && !showForm) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title} ({wsTags.length})</p>
          {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5">
            <Plus size={14} /> Thêm Tag
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{editingId ? "Sửa thẻ" : "Tạo thẻ mới"}</p>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Tên thẻ</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Urgent..." disabled={loading} className="w-full px-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-slate-100" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} disabled={loading} className="h-9 px-4 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={loading || !name.trim()} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editingId ? <Check size={14} /> : <Plus className="w-3.5 h-3.5" />)}{editingId ? "Lưu" : "Thêm"}</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-indigo-400 dark:ring-offset-slate-900' : 'hover:scale-110'}`} style={{ backgroundColor: c }} disabled={loading} />
            ))}
          </div>
        </form>
      )}

      {wsTags.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {wsTags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#3b82f6' }} />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tag.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit(tag)} disabled={loading} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Paintbrush size={14} /></button>
                <button onClick={() => handleDelete(tag.id)} disabled={deleting === tag.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{deleting === tag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────── Workspace Detail View ────────────────────
function WorkspaceDetailView({ workspace, onBack, onWorkspaceUpdated }: { workspace: any, onBack: () => void, onWorkspaceUpdated: () => void }) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const router = useRouter();

  const loadCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`);
      if (res.ok) {
        const d = await res.json();
        setCollaborators(d.collaborators || []);
      }
    } catch (e) {}
  }, [workspace.id]);

  useEffect(() => { loadCollaborators(); }, [loadCollaborators]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      toast.success("Cập nhật thành công");
      onWorkspaceUpdated();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi mời");
      toast.success("Đã mời thành công");
      setEmail("");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleRemoveCollab = async (userId: string) => {
    if (!window.confirm("Xóa cộng tác viên này?")) return;
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xóa");
      toast.success("Đã xóa");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateCollabRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật quyền");
      toast.success("Đã cập nhật quyền");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} /></button>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chi tiết: {workspace.name}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thông tin chung</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Tên workspace</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Mô tả</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
              </div>
              <button type="submit" disabled={loading || !name.trim() || (name === workspace.name && description === workspace.description)} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all w-full flex items-center justify-center disabled:opacity-50">Lưu thông tin</button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             <TagManager workspaceId={workspace.id} title="Thẻ Tag Mặc định của Không gian" description="Chỉ áp dụng trong workspace này" />
          </div>
        </div>

        <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-6">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cộng tác viên</p>
          <form onSubmit={handleInvite} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Email người được mời</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading || !email.trim()} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Mời</button>
          </form>

          <div className="space-y-2 mt-4">
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    {c.user.avatar_url ? <img src={c.user.avatar_url} className="w-full h-full object-cover" /> : <UserAvatar name={c.user.name} size="sm" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate dark:text-slate-200">{c.user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{c.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={c.role} onChange={(e) => updateCollabRole(c.user.id, e.target.value)} className="text-[10px] px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <option value="VIEWER">Read-only</option>
                    <option value="MEMBER">Full-write</option>
                  </select>
                  <button onClick={() => handleRemoveCollab(c.user.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            {collaborators.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Chưa có ai.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────── WorkspacesTab ────────────────────
function WorkspacesTab() {
  const { data: session } = useSession();
  const { workspaces, fetchWorkspaces } = useTaskStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedWs, setSelectedWs] = useState<any | null>(null);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const ownedWorkspaces = workspaces.filter(ws => ws.owner_id === session?.user?.id);
  const customCount = ownedWorkspaces.filter(ws => !ws.is_default).length;
  const personalWorkspace = workspaces.find(ws => ws.owner_id === session?.user?.id && ws.name === "Personal");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Lỗi tạo workspace");
      toast.success("Tạo workspace thành công");
      await fetchWorkspaces();
      setName(""); setDescription(""); setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (wsId: string, wsName: string) => {
    if (!window.confirm(`Xóa không gian "${wsName}"?`)) return;
    try {
      await fetch(`/api/tasks/workspaces/${wsId}`, { method: "DELETE" });
      toast.success("Đã xóa");
      await fetchWorkspaces();
    } catch (err: any) { toast.error(err.message); }
  };

  if (selectedWs) {
    return <WorkspaceDetailView workspace={selectedWs} onBack={() => setSelectedWs(null)} onWorkspaceUpdated={fetchWorkspaces} />;
  }

  return (
    <div className="space-y-8">
      {/* 1. GLOBAL TAGS (Personal Workspace tags) */}
      {personalWorkspace && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
          <TagManager workspaceId={personalWorkspace.id} title="Thẻ Tag Của Bạn (Global)" description="Có thể sử dụng ở bất kỳ không gian nào bạn tham gia" />
        </div>
      )}

      {/* 2. SYSTEM DEFAULT WORKSPACES */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Không gian mặc định</p>
        <div className="grid gap-2">
          {ownedWorkspaces.filter(ws => ws.is_default).map(ws => (
            <div key={ws.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shadow-sm">
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{ws.name}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                      Hệ thống
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Không gian mặc định không thể thay đổi hoặc xóa</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CUSTOM WORKSPACES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Không gian Tự tạo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Đã tạo: {customCount}/5 không gian</p>
          </div>
          {!showForm && customCount < 5 && (
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5">
              <Plus size={14} /> Thêm Không gian
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên workspace..." className="w-full px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả..." className="w-full px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="h-8 px-3 text-xs bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" disabled={!name.trim()} className="h-8 px-3 text-xs bg-indigo-600 text-white rounded-lg">Tạo mới</button>
            </div>
          </form>
        )}

        <div className="grid gap-2">
          {ownedWorkspaces.filter(ws => !ws.is_default).map(ws => (
            <div key={ws.id} onClick={() => setSelectedWs(ws)} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ws.name}</p>
                  {ws.description && <p className="text-xs text-slate-500 mt-0.5">{ws.description}</p>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id, ws.name); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {customCount === 0 && <p className="text-sm text-slate-500 text-center py-4">Chưa có không gian tự tạo.</p>}
        </div>
      </div>
    </div>
  );
}
"""

content = content[:start_tags] + new_code + content[start_appearance:]

with open("src/components/shared/PersonalSettingsModal.tsx", "w") as f:
    f.write(content)

print("Patch applied successfully.")
