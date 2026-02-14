import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import BackButton from "../components/common/BackButton";
import { SciFiSearch } from "../components/SciFiSearch";
import { RefreshCw, Trash2, ShieldCheck, Shield, Ban } from "lucide-react";
import "./MyProducts.css";

export function Trash() {
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isImagesHidden, setIsImagesHidden] = useState(true);
    
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = async () => {
        try {
            setLoading(true);
            const data = await api.get("/products/trash");
            setProducts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Load trash failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item) => {
        try {
            let endpoint = "";
            if (item.trash_type === 'listing') endpoint = `/products/${item.id}/restore`;
            else if (item.trash_type === 'inventory') endpoint = `/inventories/${item.id}/restore`;
            else if (item.trash_type === 'house') endpoint = `/houses/${item.id}/restore`;
            
            await api.post(endpoint);
            setProducts(products.filter(p => p.id !== item.id || p.trash_type !== item.trash_type));
            toast.success("Đã khôi phục thành công!");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleForceDelete = async (item) => {
        let msg = "";
        if (item.trash_type === 'listing') msg = "Xóa vĩnh viễn tin đăng này? Hành động này không thể hoàn tác.";
        else if (item.trash_type === 'inventory') msg = "Xóa vĩnh viễn vật phẩm này khỏi kho? Hành động này không thể hoàn tác.";
        else if (item.trash_type === 'house') msg = "Xóa vĩnh viễn NHÀ này? Mọi dữ liệu liên quan (sản phẩm, thành viên) sẽ bị xóa sạch và không thể hoàn tác!";
            
        const ok = await toast.confirm(msg);
        if (!ok) return;
        try {
            let endpoint = "";
            if (item.trash_type === 'listing') endpoint = `/products/${item.id}/force`;
            else if (item.trash_type === 'inventory') endpoint = `/inventories/${item.id}/force`;
            else if (item.trash_type === 'house') endpoint = `/houses/${item.id}/force`;
                
            await api.delete(endpoint);
            setProducts(products.filter(p => p.id !== item.id || p.trash_type !== item.trash_type));
            toast.success("Đã xóa vĩnh viễn!");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const calculateDaysRemaining = (deletedAt) => {
        const delDate = new Date(deletedAt);
        const now = new Date();
        const diffTime = Math.abs(now - delDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const remaining = 14 - diffDays;
        return remaining > 0 ? remaining : 0;
    };

    const toggleSelect = (item) => {
        const key = `${item.trash_type}-${item.id}`;
        setSelectedIds(prev => 
            prev.includes(key) ? prev.filter(sk => sk !== key) : [...prev, key]
        );
    };

    const handleBulkRestore = async () => {
        if (selectedIds.length === 0) return;
        try {
            const productIds = selectedIds.filter(k => k.startsWith('listing-')).map(k => k.split('-')[1]);
            const inventoryIds = selectedIds.filter(k => k.startsWith('inventory-')).map(k => k.split('-')[1]);
            
            if (productIds.length > 0) {
                await api.post("/products/bulk-restore", { productIds });
            }
            
            if (inventoryIds.length > 0) {
                await api.post("/inventories/bulk-restore", { ids: inventoryIds });
            }
            
            toast.success(`Đã khôi phục ${selectedIds.length} mục thành công!`);
            loadTrash();
            setIsSelectMode(false);
            setSelectedIds([]);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleBulkForceDelete = async () => {
        if (selectedIds.length === 0) return;
        const ok = await toast.confirm(`Xóa vĩnh viễn ${selectedIds.length} mục đã chọn?`);
        if (!ok) return;
        try {
            const productIds = selectedIds.filter(k => k.startsWith('listing-')).map(k => k.split('-')[1]);
            const inventoryIds = selectedIds.filter(k => k.startsWith('inventory-')).map(k => k.split('-')[1]);
            
            if (productIds.length > 0) {
                await api.post("/products/bulk-force-delete", { productIds });
            }
            
            if (inventoryIds.length > 0) {
                await api.post("/inventories/bulk-force-delete", { ids: inventoryIds });
            }
            
            toast.success(`Đã xóa vĩnh viễn ${selectedIds.length} mục!`);
            loadTrash();
            setIsSelectMode(false);
            setSelectedIds([]);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <div className="trash-page animate-fade-in">
            <header className="page-header">
                <div className="header-left">
                    <BackButton fallbackPath="/my-products" label="Quay lại" className="mb-2" />
                    <h1 className="text-3xl font-bold text-white">Thùng rác 🗑️</h1>
                    <p className="text-slate-400">Sản phẩm sẽ bị xóa vĩnh viễn sau 14 ngày</p>
                </div>
                <div className="header-right">
                    <button 
                        onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
                        className={`Btn btn-scifi-custom ${isSelectMode ? 'active' : ''}`}
                    >
                        <span className="svgIcon">{isSelectMode ? <ShieldCheck size={20} /> : <Shield size={20} />}</span>
                        <span className="text">{isSelectMode ? 'Xong' : 'Chọn nhiều'}</span>
                    </button>
                </div>
            </header>

            <div className="flex items-center gap-6 mb-8">
                <div className="flex-1">
                    <SciFiSearch 
                        placeholder="Tìm trong thùng rác..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Holo Toggle */}
                <div className="toggle-container scale-75 origin-left">
                  <div className="toggle-wrap">
                    <input 
                        className="toggle-input" 
                        id="holo-toggle-trash" 
                        type="checkbox" 
                        checked={isImagesHidden}
                        onChange={(e) => setIsImagesHidden(e.target.checked)}
                    />
                    <label className="toggle-track" htmlFor="holo-toggle-trash">
                      <div className="track-lines">
                        <div className="track-line"></div>
                      </div>

                      <div className="toggle-thumb">
                        <div className="thumb-core"></div>
                        <div className="thumb-inner"></div>
                        <div className="thumb-scan"></div>
                        <div className="thumb-particles">
                          <div className="thumb-particle"></div>
                          <div className="thumb-particle"></div>
                          <div className="thumb-particle"></div>
                          <div className="thumb-particle"></div>
                          <div className="thumb-particle"></div>
                        </div>
                      </div>

                      <div className="toggle-data">
                        <div className="data-text off" style={{fontSize: '10px'}}>ẢNH: BẬT</div>
                        <div className="data-text on" style={{fontSize: '10px'}}>ẢNH: TẮT</div>
                        <div className="status-indicator off"></div>
                        <div className="status-indicator on"></div>
                      </div>

                      <div className="energy-rings">
                        <div className="energy-ring"></div>
                        <div className="energy-ring"></div>
                        <div className="energy-ring"></div>
                      </div>

                      <div className="interface-lines">
                        <div className="interface-line"></div>
                        <div className="interface-line"></div>
                        <div className="interface-line"></div>
                        <div className="interface-line"></div>
                        <div className="interface-line"></div>
                        <div className="interface-line"></div>
                      </div>

                      <div className="toggle-reflection"></div>
                      <div className="holo-glow"></div>
                    </label>
                  </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state text-center py-20 opacity-50">
                    <div className="text-6xl mb-4">✨</div>
                    <h3 className="text-xl font-bold text-white">Thùng rác trống</h3>
                    <p className="text-slate-400">Tuyệt vời! Không có mục nào đang chờ xóa.</p>
                </div>
            ) : (
                <div className={`products-grid ${isImagesHidden ? 'compact-view' : ''}`}>
                    {filtered.map(p => (
                        <div 
                            key={`${p.trash_type}-${p.id}`} 
                            className={`product-card-manage group ${isSelectMode ? 'selecting' : ''} ${selectedIds.includes(`${p.trash_type}-${p.id}`) ? 'selected' : ''} ${isImagesHidden ? 'compact-card' : ''}`}
                            onClick={() => isSelectMode && toggleSelect(p)}
                        >
                            {!isImagesHidden ? (
                                <>
                                    <div className="card-img-container opacity-60">
                                        {p.image_url ? (
                                            <img src={getImageUrl(p.image_url)} alt={p.name} />
                                        ) : (
                                            <div className="no-img">📦</div>
                                        )}
                                        <div className="countdown-timer absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded backdrop-blur-md text-[10px]">
                                            ⏳ Còn {calculateDaysRemaining(p.deleted_at)} ngày
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <h3 className="product-name flex items-center gap-2">
                                            {p.name}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${p.trash_type === 'listing' ? 'border-primary/40 text-primary' : p.trash_type === 'house' ? 'border-red-500/40 text-red-400' : 'border-orange-500/40 text-orange-400'}`}>
                                                {p.trash_type === 'listing' ? 'TIN ĐĂNG' : p.trash_type === 'house' ? 'NHÀ' : 'KHO'}
                                            </span>
                                        </h3>
                                         <div className="p-house text-[10px] text-slate-500 mb-0.5">Nhà: {p.trash_type === 'house' ? 'Chính là Nhà này' : p.house_name}</div>
                                         <div className="text-[11px] font-bold text-blue-400 mb-2 truncate">Người bán: {p.seller_name || 'Hệ thống'}</div>
                                         {p.trash_type === 'inventory' && <div className="text-[10px] text-slate-400">Số lượng: {p.quantity}</div>}
                                         
                                         {!isSelectMode && (
                                             <div className="card-actions mt-4 pt-4 border-t border-white/5 flex justify-center gap-3">
                                                 <button className="Btn btn-restore-custom" onClick={(e) => { e.stopPropagation(); handleRestore(p); }} title="Khôi phục">
                                                     <span className="svgIcon"><RefreshCw size={18} /></span>
                                                     <span className="text">Khôi phục</span>
                                                 </button>
                                                 <button className="Btn btn-delete" onClick={(e) => { e.stopPropagation(); handleForceDelete(p); }} title="Xóa vĩnh viễn">
                                                     <span className="svgIcon"><Trash2 size={18} /></span>
                                                     <span className="text">Xóa vĩnh viễn</span>
                                                 </button>
                                             </div>
                                         )}
                                     </div>
                                 </>
                            ) : (
                                <div className="compact-card-inner !p-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="compact-title !text-left !text-sm truncate" title={p.name}>
                                                {p.name}
                                                <span className={`ml-2 text-[8px] px-1 rounded border ${p.trash_type === 'listing' ? 'border-primary/40 text-primary' : p.trash_type === 'house' ? 'border-red-500/40 text-red-400' : 'border-orange-500/40 text-orange-400'}`}>
                                                    {p.trash_type === 'listing' ? 'BOX' : p.trash_type === 'house' ? 'HOUSE' : 'INV'}
                                                </span>
                                            </h3>
                                            <div className="text-[10px] text-slate-500 truncate">Nhà: {p.house_name}</div>
                                            <div className="text-[10px] text-blue-400 font-bold truncate">Người bán: {p.seller_name || 'Hệ thống'}</div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-[9px] text-orange-400 font-mono">⌛ {calculateDaysRemaining(p.deleted_at)}d</div>
                                            {p.trash_type === 'inventory' && <div className="text-[9px] text-slate-400">x{p.quantity}</div>}
                                        </div>
                                    </div>
                                    
                                    {!isSelectMode && (
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button className="Btn btn-restore-custom scale-75 origin-right" onClick={(e) => { e.stopPropagation(); handleRestore(p); }} title="Khôi phục">
                                                <span className="svgIcon"><RefreshCw size={16} /></span>
                                                <span className="text">Lấy lại</span>
                                            </button>
                                            <button className="Btn btn-delete scale-75 origin-right" onClick={(e) => { e.stopPropagation(); handleForceDelete(p); }} title="Xóa">
                                                <span className="svgIcon"><Trash2 size={16} /></span>
                                                <span className="text">Xóa</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isSelectMode && (
                <div className="bulk-action-bar active">
                    <div className="info text-slate-300">Đã chọn <span className="text-primary font-bold">{selectedIds.length}</span> sản phẩm</div>
                    <div className="actions flex gap-3">
                        <button onClick={handleBulkRestore} className="Btn btn-restore-custom" disabled={selectedIds.length === 0} title="Khôi phục">
                            <span className="svgIcon"><RefreshCw size={20} /></span>
                            <span className="text">Khôi phục ({selectedIds.length})</span>
                        </button>
                        <button onClick={handleBulkForceDelete} className="Btn btn-delete" disabled={selectedIds.length === 0} title="Xóa vĩnh viễn">
                            <span className="svgIcon"><Trash2 size={20} /></span>
                            <span className="text">Xóa sạch ({selectedIds.length})</span>
                        </button>
                        <button onClick={() => setIsSelectMode(false)} className="Btn btn-scifi-custom" title="Thoát">
                            <span className="svgIcon"><Ban size={20} /></span>
                            <span className="text">Hủy</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
