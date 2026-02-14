import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";
import BackButton from "../components/common/BackButton";
import { SciFiSearch } from "../components/SciFiSearch";
import { ShoppingCart, Check, Shield, ShieldCheck, Trash2, Ban, CreditCard } from "lucide-react";
import "./HouseWarehouse.css";

export function HouseWarehouse() {
  const toast = useToast();
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const [houseName, setHouseName] = useState("");
  const [role, setRole] = useState(null);
  
  // Filter States
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isImagesHidden, setIsImagesHidden] = useState(true);

  // Bulk Delete
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [buyingId, setBuyingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const isAdmin = (role === 'owner' || role === 'admin' || user?.role === 'admin');

  useEffect(() => {
      loadWarehouse();
      checkMembership();
      if (user) loadWallet();
  }, [id, searchTerm, selectedMember, filterDate, user]); 

  const loadWallet = async () => {
      try {
          const data = await api.get("/wallets/me");
          setWallet(data);
      } catch (e) {
          console.error("Wallet load failed", e);
      }
  };

  const checkMembership = async () => {
      try {
          const data = await api.get(`/houses/${id}/membership`);
          setRole(data.role);
      } catch (e) {
          console.error("Check role failed:", e);
          setRole(null);
      }
  };

  const handleJoin = async () => {
      try {
          await api.post(`/houses/${id}/memberships`);
          toast.success("Đã tham gia thành công! Giờ bạn có thể mua hàng.");
          checkMembership();
      } catch (e) {
          toast.error(e.message);
      }
  };

  useEffect(() => {
      api.get(`/houses/${id}/members`).then(data => {
          if(Array.isArray(data)) setMembers(data);
      }).catch(console.error);
  }, [id]);

  const loadWarehouse = async () => {
      try {
          setLoading(true);
          if (!houseName) {
              const h = await api.get(`/houses/${id}`);
              setHouseName(h.name);
          }

          let url = `/products?house_id=${id}`;
          if (searchTerm) url += `&q=${searchTerm}`;
          if (selectedMember) url += `&seller_id=${selectedMember}`;
          if (filterDate) url += `&date=${filterDate}`;

          const data = await api.get(url);
          setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
          console.error("Load warehouse failed:", e);
      } finally {
          setLoading(false);
      }
  };

  const handleSearch = (e) => {
      setSearchTerm(e.target.value);
  };

  const handleBuyProduct = async (p) => {
      if (buyingId) return;
      if (!user) return toast.error("Vui lòng đăng nhập để mua hàng");
      if (p.quantity <= 0) return toast.error("Sản phẩm đã hết hàng");
      
      if (!role || role === 'pending') {
          const ok = await toast.confirm("Bạn chưa là thành viên của Nhà này. Bạn có muốn tham gia ngay để mua hàng không?");
          if(ok) await handleJoin();
          return;
      }

      if (wallet && parseFloat(wallet.balance) < parseFloat(p.unit_price || p.price)) {
          return toast.error("Số dư ví không đủ. Vui lòng nạp thêm!");
      }

      try {
          setBuyingId(p.id);
          await api.post(`/products/${p.id}/buy`);
          toast.success(`Đã mua 1 ${p.name}!`);
          loadWarehouse();
          loadWallet();
      } catch (e) {
          toast.error(e.message || "Mua hàng thất bại");
      } finally {
          setBuyingId(null);
      }
  };

  const handleDelete = async (id) => {
      const ok = await toast.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?");
      if (!ok) return;
      try {
          await api.delete(`/products/${id}`);
          toast.success("Đã xóa sản phẩm!");
          loadWarehouse();
      } catch (e) {
          toast.error(e.message);
      }
  };

  const toggleSelect = (id) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === products.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(products.map(p => p.id));
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;
      const ok = await toast.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} sản phẩm đã chọn?`);
      if (!ok) return;

      try {
          await api.post("/products/bulk-delete", { productIds: selectedIds });
          toast.success(`Đã xóa thành công ${selectedIds.length} sản phẩm!`);
          setIsSelectMode(false);
          setSelectedIds([]);
          loadWarehouse();
      } catch (e) {
          toast.error("Xóa thất bại: " + (e.message));
      }
  };

  const handleUpdateProduct = async (e) => {
      e.preventDefault();
      try {
          await api.patch(`/products/${editingProduct.id}`, {
              name: editingProduct.name,
              price: editingProduct.price,
              quantity: editingProduct.quantity,
              description: editingProduct.description
          });
          toast.success("Đã cập nhật sản phẩm!");
          setEditingProduct(null);
          loadWarehouse();
      } catch (e) {
          toast.error(e.message);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex-1">
                <BackButton fallbackPath={`/houses/${id}`} label="Quay lại Nhà" className="mb-2" />
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Kho hàng: {houseName}</h1>
                    {(!role || role === 'pending') && (
                        <button onClick={handleJoin} className="btn btn-sm btn-primary animate-pulse">
                            + Tham gia để mua
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                {wallet && (
                    <div className="flex items-center gap-3 bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg group transition-all hover:border-emerald-500/30">
                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest leading-none mb-1">Số dư Ví</span>
                            <span className="text-base font-black text-emerald-400 font-mono tracking-tighter">
                                {Number(wallet.balance).toLocaleString()}đ
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                             <CreditCard size={14} />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-900/30 p-2 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <select className="bg-slate-800 border border-white/10 rounded-md px-4 py-2 text-sm text-slate-300 outline-none focus:border-primary/50 appearance-none pr-8">
                        <option>Nhật thông II</option>
                        <option>Nhật thông I</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Shield size={12} />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                    <SciFiSearch
                        value={searchTerm}
                        onChange={handleSearch}
                        placeholder="Tìm kiếm sản phẩm..."
                        showFilter={true}
                        filterActive={!!selectedMember || !!filterDate}
                        onFilterClick={() => setShowFilterMenu(!showFilterMenu)}
                    />
                    
                    {showFilterMenu && (
                        <div className="absolute top-16 right-0 w-72 bg-[#161329] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in backdrop-blur-xl">
                            <div className="p-3 border-b border-white/10">
                                <h4 className="text-sm font-bold text-white mb-2">Lọc theo ngày đăng</h4>
                                <input 
                                    type="date"
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                            <div className="p-3 border-b border-white/10">
                                <h4 className="text-sm font-bold text-white mb-2">Lọc theo thành viên</h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button 
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${!selectedMember ? 'text-primary font-bold bg-white/5' : 'text-slate-400'}`}
                                    onClick={() => { setSelectedMember(null); setShowFilterMenu(false); }}
                                >
                                    Tất cả thành viên
                                </button>
                                {members.filter(m => m.id).map(m => (
                                    <button 
                                        key={m.id}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between ${selectedMember == m.id ? 'text-primary font-bold bg-white/5' : 'text-slate-400'}`}
                                        onClick={() => { 
                                            setSelectedMember(m.id); 
                                            setShowFilterMenu(false);
                                        }}
                                    >
                                        <span>{m.full_name || m.email}</span>
                                        {selectedMember == m.id && <span>✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {isAdmin && products.length > 0 && (
                    <button 
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            setSelectedIds([]);
                        }}
                        className={`Btn btn-scifi-custom h-[44px] ${isSelectMode ? 'active !bg-blue-600 !text-white' : ''}`}
                    >
                        <span className="svgIcon">{isSelectMode ? <ShieldCheck size={20} /> : <Shield size={20} />}</span>
                        <span className="text">{isSelectMode ? 'Xong' : 'Chọn nhiều'}</span>
                    </button>
                )}
            </div>
        </div>

        {loading ? (
             <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
            <div className="inventory-table-wrapper animate-slide-up">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      {isSelectMode && <th className="stt-col"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === products.length} /></th>}
                      <th className="stt-col">STT</th>
                      <th>Tên sản phẩm</th>
                      <th>Người bán</th>
                      <th>Giá</th>
                      <th>Giá đơn vị</th>
                      <th>Số lượng</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, index) => (
                      <tr key={p.id} className={selectedIds.includes(p.id) ? 'bg-blue-500/10' : ''} onClick={() => isSelectMode && toggleSelect(p.id)}>
                        {isSelectMode && <td className="stt-col"><input type="checkbox" checked={selectedIds.includes(p.id)} readOnly /></td>}
                        <td className="stt-col">{index + 1}</td>
                        <td className="font-bold flex items-center gap-3">
                            {p.image_url && !isImagesHidden && (
                                <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded object-cover border border-white/10" />
                            )}
                            {p.name}
                        </td>
                        <td className="owner-col">{p.owner_name}</td>
                        <td className="price-col">{Number(p.price).toLocaleString()}đ</td>
                        <td className="text-slate-400">
                             {p.unit_price && p.unit_price != p.price ? `${Number(p.unit_price).toLocaleString()}đ` : '-'}
                        </td>
                        <td className="font-mono">{p.quantity || 0}</td>
                        <td>
                            <span className={`status-badge ${p.quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                {p.quantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                            </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            {!isSelectMode && (
                                <>
                                    <button 
                                        className={`btn-table-action btn-table-buy ${p.quantity <= 0 || buyingId === p.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); handleBuyProduct(p); }}
                                        disabled={p.quantity <= 0 || buyingId === p.id}
                                    >
                                        {buyingId === p.id ? '...' : 'Mua'}
                                    </button>
                                    
                                    {(isAdmin || p.seller_id === user?.id) && (
                                        <>
                                            <button className="btn-table-action btn-table-edit" onClick={(e) => { e.stopPropagation(); setEditingProduct({...p}); }}>Sửa</button>
                                            <button className="btn-table-action btn-table-delete" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>Xóa</button>
                                        </>
                                    )}
                                </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                        <tr>
                            <td colSpan={isAdmin ? 9 : 8} className="text-center py-20 text-slate-500">
                                Không tìm thấy sản phẩm nào.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
                <div className="table-footer">
                    <div>Hiển thị {products.length} trên tổng {products.length} sản phẩm</div>
                    <div>Trang 1 trong 1</div>
                </div>
            </div>
        )}

        {/* Bulk Action Bar */}
        {isSelectMode && (
            <div className="bulk-action-bar active">
                <div className="bulk-info text-slate-300">
                    Đã chọn <span className="text-primary font-bold">{selectedIds.length}</span> sản phẩm
                </div>
                <div className="bulk-btns flex gap-3">
                    <button onClick={toggleSelectAll} className="Btn btn-scifi-custom">
                        <span className="svgIcon"><Shield size={18} /></span>
                        <span className="text">{selectedIds.length === products.length ? 'Bỏ chọn' : 'Tất cả'}</span>
                    </button>
                    <button 
                        onClick={handleBulkDelete} 
                        className="Btn btn-delete"
                        disabled={selectedIds.length === 0}
                    >
                        <span className="svgIcon"><Trash2 size={18} /></span>
                        <span className="text">Xoá ({selectedIds.length})</span>
                    </button>
                    <button onClick={() => setIsSelectMode(false)} className="Btn btn-scifi-custom">
                        <span className="svgIcon"><Ban size={18} /></span>
                        <span className="text">Thoát</span>
                    </button>
                </div>
            </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-[#1a1c2e] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleUpdateProduct}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Sửa sản phẩm</h3>
                            <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tên sản phẩm</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Giá tổng (VNĐ)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all font-mono"
                                        value={editingProduct.price}
                                        onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Số lượng</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all font-mono"
                                        value={editingProduct.quantity}
                                        onChange={(e) => setEditingProduct({...editingProduct, quantity: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mô tả (Ghi chú)</label>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all h-24 resize-none"
                                    value={editingProduct.description || ""}
                                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 flex gap-4 justify-end">
                            <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">Hủy</button>
                            <button type="submit" className="btn btn-primary px-10 rounded-2xl font-black uppercase tracking-widest">
                                Lưu thay đổi
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
