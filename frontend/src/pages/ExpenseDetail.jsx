import { useState, useEffect } from 'react';
import { api, expenses } from '../services/api';
import { useToast } from '../context/ToastContext';
import './ExpenseDetail.css';

const formatMoney = (amount) => Number(amount).toLocaleString('vi-VN') + ' đ';

export function ExpenseDetail({ id, onClose, onUpdate }) {
    const toast = useToast();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [editingCat, setEditingCat] = useState(false);

    useEffect(() => {
        loadDetail();
        loadCats();
    }, [id]);

    const loadDetail = async () => {
        try {
            const res = await expenses.getDetail(id);
            setDetail(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadCats = async () => {
        const res = await expenses.getCategories();
        setCategories(res);
    };

    const handleDeleteClick = async () => {
        const ok = await toast.confirm("Bạn có chắc muốn xoá đơn này? (Có thể khôi phục trong 14 ngày)");
        if (!ok) return;

        try {
            await expenses.delete(id);
            onUpdate(); // Reload parent
            onClose();
            toast.success("Đã chuyển vào thùng rác");
        } catch (e) {
            toast.error(e.message || "Lỗi xoá đơn");
        }
    };

    const handleChangeCategory = async (catId) => {
        try {
            await expenses.updateCategory(id, { category_id: catId });
            setEditingCat(false);
            loadDetail(); // Reload self
            onUpdate();   // Reload parent stats
            toast.success("Đã đổi danh mục");
        } catch (e) {
            toast.error("Lỗi đổi danh mục");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Đang tải...</div>;
    if (!detail) return <div className="p-8 text-center text-red-400">Không tìm thấy đơn hàng</div>;

    const isIncome = detail.type === 'INCOME';

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bottom-sheet detail-sheet">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 p-2">✕</button>
                
                {/* Header */}
                <div className="detail-header">
                    <div className="cat-icon-lg mb-2 text-4xl">{detail.category_icon || '📦'}</div>
                    <div className="detail-cat text-lg font-bold text-white">{detail.category_name || 'Chưa phân loại'}</div>
                    <div className={`detail-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : '-'}{formatMoney(detail.amount)}
                    </div>
                    <div className="detail-date">
                        {new Date(detail.transaction_date).toLocaleString('vi-VN')}
                    </div>
                </div>

                {/* Details */}
                <div className="detail-section">
                    <div className="detail-row">
                        <span className="detail-label">Nguồn tiền</span>
                        <span className="detail-value">
                            {detail.source_type === 'WALLET' && <span className="source-badge source-wallet">Ví tiền</span>}
                            {detail.source_type === 'ORDER' && <span className="source-badge source-order">Đơn hàng #{detail.source_desc}</span>}
                            {detail.source_type === 'MANUAL' && <span className="source-badge source-manual">Nhập tay</span>}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Ghi chú</span>
                        <span className="detail-value">{detail.note || 'Không có'}</span>
                    </div>
                    {detail.image_url && (
                        <div className="mt-4">
                            <span className="detail-label block mb-2">Hoá đơn đính kèm</span>
                            <img src={detail.image_url} alt="Receipt" className="w-full rounded-lg" />
                        </div>
                    )}
                </div>

                {/* Category Editor */}
                <div className="detail-section">
                    <div className="detail-row">
                        <span className="detail-label">Danh mục</span>
                        <span className="detail-value">
                            {detail.category_name}
                            <button className="cat-change-btn" onClick={() => setEditingCat(!editingCat)}>Đổi</button>
                        </span>
                    </div>
                    
                    {editingCat && (
                        <div className="mt-4 grid grid-cols-4 gap-2">
                            {categories.filter(c => c.type === detail.type).map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => handleChangeCategory(c.id)}
                                    className={`p-2 rounded-lg text-center cursor-pointer ${detail.category_id === c.id ? 'bg-slate-700 ring-1 ring-blue-500' : 'bg-slate-800'}`}
                                >
                                    <div className="text-xl mb-1">{c.icon}</div>
                                    <div className="text-[10px] text-slate-300 truncate">{c.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* History */}
                {detail.logs?.length > 0 && (
                    <div className="detail-section">
                        <span className="detail-label block mb-2">Lịch sử thay đổi</span>
                        {detail.logs.map((log, i) => (
                           <div key={i} className="history-log">
                               {new Date(log.created_at).toLocaleString('vi-VN')}: 
                               {log.action === 'UPDATE_CATEGORY' ? ' Đổi danh mục' : 
                                log.action === 'RESTORE' ? ' Khôi phục đơn' : log.action}
                           </div> 
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="action-grid">
                     <button className="btn-action" onClick={() => toast.info("Tính năng sửa ghi chú đang phát triển")}>
                        ✏️ Sửa ghi chú
                     </button>
                     <button className="btn-action btn-delete" onClick={handleDeleteClick}>
                        🗑️ Xoá đơn
                     </button>
                </div>
            </div>
        </div>
    );
}
