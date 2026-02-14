import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import BackButton from "../components/common/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Trash2, ShoppingCart, ArrowLeft, Loader2 } from "lucide-react";

const formatMoney = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";

export function Cart() {
  const toast = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const data = await api.get("/cart");
      setCart(data);
      // Auto select all initially
      if (data?.items) {
        setSelectedIds(data.items.map(item => item.product_id));
      }
    } catch (e) {
      console.error(e);
      setCart({ items: [] });
    }
  };

  const handleRemove = async (productId) => {
    try {
        await api.post("/cart/remove", { product_id: productId });
        loadCart();
    } catch(e) {
        console.error(e);
        toast.error("Lỗi khi xóa sản phẩm");
    }
  };

  const updateQuantity = async (productId, delta) => {
      try {
          await api.post("/cart/add", { product_id: productId, qty: delta });
          loadCart();
      } catch (e) {
          toast.error("Lỗi cập nhật số lượng: " + (e.response?.data?.error || e.message));
      }
  };

  const toggleSelect = (productId) => {
    setSelectedIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cart.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cart.items.map(item => item.product_id));
    }
  };

  const handleCheckout = async () => {
      if (!cart || selectedIds.length === 0) return;
      const ok = await toast.confirm(`Xác nhận thanh toán ${selectedIds.length} sản phẩm? Tiền sẽ được trừ từ ví của bạn.`);
      if (!ok) return;

      setLoading(true);
      try {
          const res = await api.post("/orders/checkout", { productIds: selectedIds });
          toast.success("Thanh toán thành công! Mã đơn: " + res.orderIds.join(", "));
          navigate("/wallet"); 
      } catch (e) {
          toast.error("Lỗi thanh toán: " + (e.response?.data?.error || e.message));
      } finally {
          setLoading(false);
      }
  };

  if (!cart) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      );
  }

  const hasItems = cart.items?.length > 0;
  const selectedItems = cart.items?.filter(item => selectedIds.includes(item.product_id)) || [];
  const total = selectedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <BackButton fallbackPath="/" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Giỏ hàng của bạn</h1>
        <p className="text-slate-300 text-sm">Xem lại các sản phẩm trước khi thanh toán.</p>
      </div>

      {!hasItems ? (
        <Card className="bg-transparent border-none shadow-none">
            <CardContent>
                <EmptyState 
                    icon={ShoppingCart}
                    title="Giỏ hàng trống"
                    description="Bạn chưa thêm sản phẩm nào vào giỏ hàng."
                    actionLabel="Mua sắm ngay"
                    actionLink="/houses"
                />
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List Items (70%) */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-white">Sản phẩm ({cart.items.length})</CardTitle>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.length === cart.items.length && cart.items.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-slate-800"
                            />
                            Chọn tất cả
                        </label>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {cart.items.map((item) => (
                            <div key={item.product_id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-100/10 pb-6 last:border-0 last:pb-0">
                                <div className="flex gap-4 flex-1">
                                    <div className="flex items-center pt-2">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(item.product_id)}
                                            onChange={() => toggleSelect(item.product_id)}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-slate-800"
                                        />
                                    </div>
                                    <div className="w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center text-2xl overflow-hidden relative border border-white/5">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>📦</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white text-lg">{item.name}</h4>
                                        <p className="text-slate-400 text-sm">Người bán: {item.seller_name}</p>
                                        
                                        {/* Food House Details */}
                                        {item.house_type === 'food' && (
                                            <div className="mt-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded inline-block">
                                                🍽️ Chung tiền: {formatMoney(item.price * (item.remaining_slots || 1))} / {item.remaining_slots || 1} suất
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 mt-3">
                                            {/* Decrease Button */}
                                            <div className="button-container" style={{ borderRadius: '8px', padding: '1.5px' }}>
                                                <button 
                                                    onClick={() => {
                                                        if (item.quantity > 1) updateQuantity(item.product_id, -1);
                                                    }}
                                                    className="space-button"
                                                    style={{ padding: '4px 12px', minWidth: '32px', borderRadius: '6px' }}
                                                >
                                                    <div className="bright-particles"></div>
                                                    <span className="text-lg leading-none">-</span>
                                                </button>
                                            </div>

                                            <span className="text-xl font-bold w-8 text-center text-white">{item.quantity}</span>

                                            {/* Increase Button */}
                                            <div className="button-container" style={{ borderRadius: '8px', padding: '1.5px' }}>
                                                <button 
                                                    onClick={() => updateQuantity(item.product_id, 1)}
                                                    className="space-button"
                                                    style={{ padding: '4px 12px', minWidth: '32px', borderRadius: '6px' }}
                                                >
                                                    <div className="bright-particles"></div>
                                                    <span className="text-lg leading-none">+</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1 w-full sm:w-auto justify-between pl-9 sm:pl-0">
                                    <span className="font-bold text-white text-lg">{formatMoney(item.price * item.quantity)}</span>
                                    <button 
                                        onClick={() => handleRemove(item.product_id)}
                                        className="text-red-400 text-sm hover:underline flex items-center gap-1 mt-2 opacity-70 hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" /> Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Summary (30%) */}
            <div className="lg:col-span-1">
                <Card className="sticky top-4 bg-slate-900/40 border-white/5 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-white">Hóa đơn</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Selected Product List in Summary */}
                        <div className="space-y-3 border-b border-white/10 pb-4 max-h-[300px] overflow-y-auto pr-1">
                            {selectedItems.length === 0 ? (
                                <p className="text-xs text-slate-500 italic text-center py-2">Chưa chọn sản phẩm nào</p>
                            ) : (
                                selectedItems.map(item => (
                                    <div key={item.product_id} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between text-sm text-slate-300">
                                            <span className="truncate font-medium">{item.name}</span>
                                            <span className="font-bold text-white">{formatMoney(item.price * item.quantity)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                            <span>Số lượng: {item.quantity}</span>
                                            <span>Đơn giá: {formatMoney(item.price)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-between text-slate-400">
                            <span>Tạm tính ({selectedItems.length} sản phẩm)</span>
                            <span className="font-medium text-white">{formatMoney(total)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Phí dịch vụ</span>
                            <span className="font-medium text-white">0 đ</span>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="font-bold text-lg text-white">Tổng cộng</span>
                            <span className="font-bold text-xl text-blue-400">{formatMoney(total)}</span>
                        </div>
                        
                        <button 
                            onClick={handleCheckout} 
                            disabled={loading || selectedItems.length === 0}
                            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                            {loading ? "Đang xử lý..." : "Thanh toán ngay"}
                        </button>

                        <Link to="/houses" className="block text-center text-sm text-slate-500 hover:text-slate-300 transition-colors">
                            Tiếp tục mua sắm
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
