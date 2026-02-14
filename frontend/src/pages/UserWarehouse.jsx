import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { SciFiSearch } from "../components/SciFiSearch";
import { 
    Shield, 
    ShieldCheck, 
    History, 
    ShoppingCart, 
    Trash2, 
    Edit3, 
    Coins, 
    Ban,
    Check,
    Edit
} from "lucide-react";
import "./UserWarehouse.css";
import BackButton from "../components/common/BackButton";
import { useToast } from "../context/ToastContext";

export function UserWarehouse() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState([]);
  const navigate = useNavigate();
  
  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [isImagesHidden, setIsImagesHidden] = useState(true);

  // Modals
  const [resellItem, setResellItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  
  // Form States
  const [resellPrice, setResellPrice] = useState("");
  const [resellQty, setResellQty] = useState(1);
  const [targetHouse, setTargetHouse] = useState("");
  
  // New States for Resell Logic
  const [calcMethod, setCalcMethod] = useState("normal"); // 'normal' | 'food'
  const [totalCost, setTotalCost] = useState("");
  
  const [editQty, setEditQty] = useState(1);
  const [houseSearchTerm, setHouseSearchTerm] = useState(""); // New state for house search
  
  // Bulk Delete
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const isFetchingData = useRef(false);
  const isFetchingHouses = useRef(false);

  useEffect(() => {
    loadData();
    loadHouses();
  }, []);

  const loadData = () => {
    if (isFetchingData.current) return;
    isFetchingData.current = true;
    setLoading(true);
    api.get("/inventories")
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        isFetchingData.current = false;
      });
  };

  const loadHouses = () => {
      if (isFetchingHouses.current) return;
      isFetchingHouses.current = true;
      // Only load houses user has joined
      api.get("/houses?scope=joined").then(data => {
          if (Array.isArray(data)) setHouses(data);
      }).catch(console.error)
      .finally(() => {
          isFetchingHouses.current = false;
      });
  };

  const handleCancelSell = async (newItem) => {
      const ok = await toast.confirm(`Bạn có chắc muốn HỦY BÁN món "${newItem.name}" không?`);
      if (!ok) return;
      
      try {
          await api.post(`/inventories/${newItem.id}/cancel-sell`);
          toast.success("Đã hủy bán thành công! Vật phẩm đã quay về kho.");
          loadData();
      } catch (e) {
          console.error(e);
          toast.error("Lỗi: " + (e.response?.data?.error || e.message));
      }
  };

  const handleResellSubmit = async () => {
      console.log("Resell Submit Triggered");
      
      // 1. Validate House
      if (!targetHouse) {
          toast.warn("Vui lòng chọn Nhà để bán!");
          return;
      }

      // 2. Validate Quantity
      const qty = parseInt(resellQty);
      if (!qty || qty <= 0) {
          toast.warn("Số lượng bán không hợp lệ!");
          return;
      }
      if (resellItem && qty > resellItem.quantity) {
          toast.warn(`Bạn chỉ có ${resellItem.quantity} cái, không thể bán ${qty}!`);
          return;
      }

      // 3. Validate Price
      if (calcMethod === 'food' && !totalCost) {
          toast.warn("Vui lòng nhập Tổng tiền cho hình thức ăn uống!");
          return;
      }

      // Remove dots, convert to number
      const rawPrice = resellPrice.replace(/\./g, '');
      const price = parseInt(rawPrice);
      if (isNaN(price) || price < 0) {
         toast.error(calcMethod === 'food' ? "Không thể tính đơn giá. Vui lòng kiểm tra lại Tổng tiền và Số lượng!" : "Giá bán không hợp lệ!");
         return;
      }

      const payload = {
          inventory_id: resellItem.id,
          house_id: targetHouse,
          price: price, // Send number
          quantity: qty
      };
      
      console.log("Sending API Payload:", payload);

      try {
          await api.post("/inventories/resell", payload);
          toast.success("Đăng bán thành công! Vật phẩm đã được chuyển sang trạng thái 'Đang bán'.");
          setResellItem(null);
          loadData();
      } catch (e) {
          console.error("Resell Error:", e);
          toast.error("Lỗi: " + (e.response?.data?.error || e.message));
      }
  };

  const handleEditSubmit = async (e) => {
      e.preventDefault();
      try {
          await api.patch(`/inventories/${editItem.id}`, {
              quantity: editQty
          });
          toast.success("Đã cập nhật số lượng thành công!");
          setEditItem(null);
          loadData();
      } catch (e) {
          toast.error(e.message);
      }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleDelete = async (id) => {
      const ok = await toast.confirm("Bạn có chắc chắn muốn xóa món hàng này khỏi kho? Hành động này không thể hoàn tác.");
      if (!ok) return;
      
      try {
          await api.delete(`/inventories/${id}`);
          setItems(items.filter(i => i.id !== id));
          toast.success("Đã xóa khỏi kho thành công!");
      } catch (e) {
          toast.error("Xóa thất bại: " + (e.response?.data?.error || e.message));
      }
  };

  const toggleSelectMode = () => {
      setIsSelectMode(!isSelectMode);
      setSelectedIds([]);
  };

  const handleSelectAll = () => {
      if (selectedIds.length === filteredItems.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredItems.map(i => i.id));
      }
  };

  const handleToggleSelect = (id) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
          setSelectedIds([...selectedIds, id]);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;
      const ok = await toast.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} món hàng đã chọn?`);
      if (!ok) return;

      try {
          await api.post("/inventories/bulk-delete", { ids: selectedIds });
          toast.success(`Đã xóa thành công ${selectedIds.length} món hàng!`);
          
          setIsSelectMode(false);
          setSelectedIds([]);
          loadData();
      } catch (e) {
          toast.error("Xóa thất bại: " + (e.response?.data?.error || e.message));
      }
  };

  const filteredItems = items.filter(item => 
      item && (
          (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  );

  return (
    <div className="warehouse-page animate-fade-in">
        {/* Header */}
        <header className="warehouse-header">
            <div className="header-left">
                <BackButton fallbackPath="/" className="mb-2" />
                <h1>Kho Của Tôi 🎒</h1>
                <p>Quản lý các sản phẩm bạn đã mua</p>
            </div>

            <div className="header-right">
                <button 
                    onClick={toggleSelectMode} 
                    className={`Btn btn-scifi-custom ${isSelectMode ? 'active !bg-blue-600 !text-white' : ''}`}
                    title={isSelectMode ? 'Xong' : 'Chọn nhiều'}
                >
                    <span className="svgIcon">{isSelectMode ? <ShieldCheck size={20} /> : <Shield size={20} />}</span>
                    <span className="text">{isSelectMode ? 'Xong' : 'Chọn nhiều'}</span>
                </button>
                <Link to="/history" className="Btn btn-scifi-custom" title="Lịch sử">
                    <span className="svgIcon"><History size={20} /></span>
                    <span className="text">Lịch sử</span>
                </Link>
                <Link to="/houses" className="Btn btn-scifi-custom" title="Mua thêm">
                    <span className="svgIcon"><ShoppingCart size={20} /></span>
                    <span className="text">Mua thêm</span>
                </Link>
            </div>
        </header>

        {/* Main */}
        <div className="warehouse-main">
            <div className="mb-8 flex items-center gap-6">
                <div className="w-full max-w-xl">
                    <SciFiSearch 
                        placeholder="Tìm kiếm vật phẩm trong kho..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        showFilter={false}
                    />
                </div>

                {/* Holo Toggle */}
                <div className="toggle-container scale-75 origin-left">
                  <div className="toggle-wrap">
                    <input 
                        className="toggle-input" 
                        id="holo-toggle-warehouse" 
                        type="checkbox" 
                        checked={isImagesHidden}
                        onChange={(e) => setIsImagesHidden(e.target.checked)}
                    />
                    <label className="toggle-track" htmlFor="holo-toggle-warehouse">
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
                 <div className="flex justify-center items-center h-64">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                 </div>
            ) : items.length === 0 ? (
                // Empty State
                <div className="empty-state-container">
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h2>Kho của bạn đang trống</h2>
                        <p>
                            Mua sản phẩm đầu tiên để bắt đầu sử dụng các tính năng
                            của HouseMarket Pro.
                        </p>

                        <div className="empty-actions">
                            <Link to="/houses" className="Btn btn-scifi-custom !w-auto !px-6 !rounded-xl" title="Mua sắm">
                                <span className="svgIcon"><ShoppingCart size={20} /></span>
                                <span className="text">🛒 Đi chợ ngay</span>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : filteredItems.length === 0 ? (
                 <div className="text-center py-20 opacity-50">
                    <p>Không tìm thấy sản phẩm nào khớp với từ khóa.</p>
                 </div>
            ) : (
                // Product Grid
                <div className={`product-grid ${isImagesHidden ? 'compact-view' : ''}`}>
                    {filteredItems.map(item => (
                        <div 
                            key={item.id} 
                            className={`warehouse-card group ${isSelectMode ? 'is-selecting' : ''} ${selectedIds.includes(item.id) ? 'is-selected' : ''} ${isImagesHidden ? 'compact-card' : ''}`}
                            onClick={() => isSelectMode && handleToggleSelect(item.id)}
                        >
                            {/* Standard View OR Compact View Content */}
                            {!isImagesHidden ? (
                                <>
                                    {isSelectMode && (
                                        <div className="card-checkbox-wrapper">
                                            <div className={`card-checkbox ${selectedIds.includes(item.id) ? 'checked' : ''}`}>
                                                <span className="check-icon">✓</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="card-img-wrapper">
                                        {item.image_url ? (
                                            <img src={getImageUrl(item.image_url)} className="card-img" onError={(e) => e.target.style.display = 'none'} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl bg-white/50 text-slate-400">🎁</div>
                                        )}
                                    </div>
                                    
                                    <div className="card-content">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="card-title text-slate-800" title={item.name}>{item.name}</h3>
                                            {item.is_selling === 1 && (
                                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">
                                                    Đang bán
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Prominent Seller Name */}
                                        <p className="text-[11px] font-bold text-blue-500 mb-2 truncate" title={`Người bán: ${item.seller_name || 'Hệ thống'}`}>
                                            Người bán: {item.seller_name || 'Hệ thống'}
                                        </p>

                                        <p className="card-desc">{item.description}</p>
                                        
                                        <div className="card-badges">
                                            <span className="card-badge primary">x{item.quantity}</span>
                                        </div>

                                        <div className="card-actions !border-t-0 !pt-3 flex justify-center gap-4">
                                            {!isSelectMode && (
                                                <>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                                                        className="Btn btn-delete"
                                                        title="Xóa vật phẩm"
                                                    >
                                                        <span className="svgIcon"><Trash2 size={18} /></span>
                                                        <span className="text">Xóa</span>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditItem(item);
                                                            setEditQty(item.quantity);
                                                        }}
                                                        className="Btn btn-scifi-custom"
                                                        title="Sửa số lượng"
                                                    >
                                                        <span className="svgIcon"><Edit3 size={18} /></span>
                                                        <span className="text">Sửa</span>
                                                    </button>
                                                    
                                                    {item.is_selling === 1 ? (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleCancelSell(item); }}
                                                            className="Btn btn-scifi-custom !text-yellow-500"
                                                            title="Gỡ khỏi chợ"
                                                        >
                                                            <span className="svgIcon"><Ban size={18} /></span>
                                                            <span className="text">Hủy bán</span>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setResellItem(item);
                                                                setResellQty(1);
                                                                setResellPrice("");
                                                                setTotalCost("");
                                                                setHouseSearchTerm(""); 
                                                                const defaultHouse = houses[0] || null;
                                                                setTargetHouse(defaultHouse?.id || "");
                                                                if (defaultHouse?.type === 'food') setCalcMethod("food");
                                                                else setCalcMethod("normal");
                                                            }}
                                                            className="Btn btn-scifi-custom !text-emerald-400"
                                                            title="Đăng bán lại"
                                                        >
                                                            <span className="svgIcon"><Coins size={18} /></span>
                                                            <span className="text">Bán lại</span>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {isSelectMode && (
                                                <div className="text-xs font-medium text-center w-full py-1 text-primary animate-pulse">
                                                    {selectedIds.includes(item.id) ? '✅ Đã chọn' : 'Click để chọn'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="compact-card-inner">
                                    {/* Delete Button (Corner Close) */}
                                    {!isSelectMode && (
                                        <button 
                                            className="compact-close-btn" 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                            title="Xóa"
                                        >
                                            ✕
                                        </button>
                                    )}

                                    {/* Selection Checkbox */}
                                    {isSelectMode && (
                                        <div className="compact-checkbox-wrapper">
                                            <div className={`compact-checkbox ${selectedIds.includes(item.id) ? 'checked' : ''}`}>
                                                ✓
                                            </div>
                                        </div>
                                    )}

                                    <div className="compact-card-top">
                                        <h3 className="compact-title">{item.name}</h3>
                                        <p className="text-[9px] text-blue-500 font-bold leading-none mt-1 truncate">
                                            {item.seller_name || 'Hệ thống'}
                                        </p>
                                    </div>

                                    <div className="compact-card-mid">
                                        <div className="compact-price">
                                            {item.price ? item.price.toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}
                                        </div>
                                        <div className="compact-qty">
                                            x{item.quantity}
                                        </div>
                                    </div>

                                    <div className="compact-card-bottom">
                                        {!isSelectMode && (
                                            item.is_selling === 1 ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCancelSell(item); }}
                                                    className="Btn btn-scifi-custom !text-yellow-500 scale-90"
                                                    title="Hủy bán"
                                                >
                                                    <span className="svgIcon"><Ban size={16} /></span>
                                                    <span className="text">Hủy</span>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setResellItem(item);
                                                        setResellQty(1);
                                                        setResellPrice("");
                                                        setTotalCost("");
                                                        setHouseSearchTerm(""); 
                                                        setTargetHouse(houses[0]?.id || "");
                                                    }}
                                                    className="Btn btn-scifi-custom !text-emerald-400 scale-90"
                                                    title="Bán lại"
                                                >
                                                    <span className="svgIcon"><Coins size={16} /></span>
                                                    <span className="text">Bán</span>
                                                </button>
                                            )
                                        )}
                                        {isSelectMode && (
                                             <div className="compact-select-label">
                                                {selectedIds.includes(item.id) ? 'Đã chọn' : 'Chọn'}
                                             </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Bulk Action Bar */}
        <div className={`bulk-action-bar ${isSelectMode ? 'active' : ''}`}>
            <div className="bulk-info">
                Đã chọn <span>{selectedIds.length}</span> sản phẩm
            </div>
            <div className="bulk-btns">
                <button onClick={handleSelectAll} className="Btn btn-scifi-custom" title={selectedIds.length === filteredItems.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}>
                    <span className="svgIcon"><Shield size={18} /></span>
                    <span className="text">{selectedIds.length === filteredItems.length ? 'Bỏ chọn' : 'Tất cả'}</span>
                </button>
                <button 
                    onClick={handleBulkDelete} 
                    className="Btn btn-delete"
                    disabled={selectedIds.length === 0}
                    title={`Xóa ${selectedIds.length} món`}
                >
                    <span className="svgIcon"><Trash2 size={18} /></span>
                    <span className="text">Xoá ({selectedIds.length})</span>
                </button>
                <button onClick={toggleSelectMode} className="Btn btn-scifi-custom" title="Hủy chọn">
                    <span className="svgIcon"><Ban size={18} /></span>
                    <span className="text">Hủy</span>
                </button>
            </div>
        </div>

        {/* Footer */}
        <footer className="footer">
              Được Phát Triển Bởi Duy Đẹp Trai. Liên Hệ Gmai Để Được Hỗ Trợ
        </footer>

        {/* Modals (Identical Logic, Wrapped in Divs) */}
        
        {/* Resell Modal */}
        {resellItem && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
                <div className="modal-box fire-modal w-full max-w-lg">
                    <h3 className="font-bold text-lg mb-4">Đăng bán: {resellItem.name}</h3>
                    
                    {houses.length === 0 && (
                        <div className="alert alert-warning text-xs py-2 mb-4 bg-yellow-900/50 text-yellow-200 border-yellow-700">
                            ⚠️ Không tìm thấy Nhà nào. Bạn cần tham gia một Nhà trước khi bán hàng!
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <div className="form-control">
                            <label className="label text-xs font-semibold">Chọn Nhà để bán</label>
                            
                            {/* House Search Input */}
                            <div className="w-full mb-4">
                                <SciFiSearch 
                                    placeholder="🔍 Tìm nhà..." 
                                    value={houseSearchTerm}
                                    onChange={(e) => setHouseSearchTerm(e.target.value)}
                                    scale={0.9} // Slight scale down to fit nicely
                                    theme="fire"
                                />
                            </div>

                            <select 
                                className="select select-bordered w-full" 
                                value={targetHouse} 
                                onChange={e => {
                                    const houseId = e.target.value;
                                    setTargetHouse(houseId);
                                    const selectedHouse = houses.find(h => h.id == houseId);
                                    if (selectedHouse?.type === 'food') {
                                        setCalcMethod('food');
                                    } else {
                                        setCalcMethod('normal');
                                    }
                                }}
                            >
                                <option value="" disabled>-- Chọn Nhà --</option>
                                {houses
                                    .filter(h => h.name.toLowerCase().includes(houseSearchTerm.toLowerCase()))
                                    .map(h => (
                                    <option key={h.id} value={h.id}>{h.name} {h.type === 'food' ? '(Dịch vụ/Ăn uống)' : ''}</option>
                                ))}
                            </select>
                            {houses.filter(h => h.name.toLowerCase().includes(houseSearchTerm.toLowerCase())).length === 0 && (
                                <span className="text-xs text-error mt-1">Không tìm thấy nhà nào khớp với từ khóa.</span>
                            )}
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-semibold">Cách tính tiền</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-slate-700 flex-1 hover:bg-slate-800 transition-colors">
                                    <input type="radio" className="radio radio-primary radio-sm" name="calcMethod" checked={calcMethod === 'normal'} onChange={() => setCalcMethod('normal')} />
                                    <span className="text-xs font-medium text-slate-300">Thường</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-slate-700 flex-1 hover:bg-slate-800 transition-colors">
                                    <input type="radio" className="radio radio-secondary radio-sm" name="calcMethod" checked={calcMethod === 'food'} onChange={() => {
                                        setCalcMethod('food');
                                        if (totalCost && resellQty) {
                                            const price = Math.ceil(parseInt(totalCost.replace(/\./g, '')) / parseInt(resellQty));
                                            setResellPrice(price.toLocaleString('vi-VN'));
                                        }
                                    }} />
                                    <span className="text-xs font-medium text-slate-300">Ăn uống (Chia SL)</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4">
                             <div className="form-control flex-1">
                                <label className="label text-xs font-semibold">Số lượng bán</label>
                                <input 
                                    type="number" 
                                    className="input input-bordered" 
                                    min="1" 
                                    max={resellItem.quantity}
                                    value={resellQty} 
                                    onChange={e => {
                                        const qty = e.target.value === "" ? "" : parseInt(e.target.value);
                                        setResellQty(qty);
                                        if (calcMethod === 'food' && totalCost) {
                                            const validQty = qty || 1;
                                            const price = Math.ceil(parseInt(totalCost.replace(/\./g, '')) / validQty);
                                            setResellPrice(price.toLocaleString('vi-VN'));
                                        }
                                    }} 
                                />
                            </div>

                            {calcMethod === 'food' ? (
                                <div className="form-control flex-1">
                                    <label className="label text-xs text-secondary font-semibold">Tổng tiền</label>
                                    <div className="relative">
                                        <input 
                                            className="input input-bordered w-full font-mono text-secondary focus:border-secondary pr-12" 
                                            placeholder="Tổng bill..."
                                            value={totalCost} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                setTotalCost(val);
                                                const rawVal = parseInt(val.replace(/\./g, '')) || 0;
                                                const qty = parseInt(resellQty) || 1;
                                                const price = Math.ceil(rawVal / qty);
                                                setResellPrice(price.toLocaleString('vi-VN'));
                                            }} 
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#e64f25]">VNĐ</span>
                                    </div>
                                </div>
                            ) : null}

                            <div className="form-control flex-1">
                                <label className="label text-xs text-warning font-bold">Giá {calcMethod === 'food' ? '(Tự tính)' : '(Bán)'}</label>
                                <div className="relative">
                                    <input 
                                        className="input input-bordered w-full font-mono text-warning focus:border-warning pr-12" 
                                        value={resellPrice} 
                                        readOnly={calcMethod === 'food'}
                                        onChange={e => {
                                            if (calcMethod === 'food') return;
                                            const val = e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                            setResellPrice(val);
                                        }} 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">VNĐ</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-action mt-6">
                            <button type="button" onClick={() => {
                                console.log("Closing Resell Modal");
                                setResellItem(null);
                            }} className="btn btn-ghost hover:bg-white/10">Hủy</button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    console.log("Submit clicked, calling handleResellSubmit");
                                    handleResellSubmit();
                                }} 
                                className="btn btn-primary px-8 border-none"
                                disabled={!targetHouse || !resellPrice}
                            >
                                Đăng bán ngay
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal - Standard UI */}
        {editItem && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
                <div className="modal-box bg-white/95 backdrop-blur-xl border border-white/40 w-full max-w-lg shadow-2xl">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Cập nhật kho: {editItem.name}</h3>
                     <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                        <p className="text-sm text-slate-500">Điều chỉnh số lượng hàng bạn đang giữ.</p>
                        <div className="form-control">
                            <label className="label text-slate-600 text-xs font-semibold">Số lượng</label>
                            <input 
                                type="number" 
                                className="input input-bordered bg-slate-50 text-slate-800 border-slate-200 focus:border-primary-custom" 
                                min="0" 
                                value={editQty} 
                                onChange={e => setEditQty(e.target.value === "" ? "" : parseInt(e.target.value))} 
                                required 
                            />
                            <label className="label">
                                <span className="label-text-alt text-warning">Nếu đặt 0, vật phẩm sẽ bị xóa khỏi kho.</span>
                            </label>
                        </div>
                        <div className="modal-action mt-6">
                             <button type="button" onClick={() => setEditItem(null)} className="btn btn-ghost text-slate-500 hover:text-slate-700 hover:bg-slate-100">Hủy</button>
                            <button type="submit" className="btn btn-primary px-8">Lưu thay đổi</button>
                        </div>
                     </form>
                </div>
            </div>
        )}
    </div>
  );
}
