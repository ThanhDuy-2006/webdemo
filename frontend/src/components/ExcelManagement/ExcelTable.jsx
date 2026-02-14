import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import './ExcelManagement.css';
import ExcelHistory from './ExcelHistory';
import { useToast } from '../../context/ToastContext';
import { FileUp } from 'lucide-react';

export default function ExcelManagement({ houseId, myRole, user, onActivityChange }) {
    const [data, setData] = useState({ items: [], status: [], members: [] });
    const [history, setHistory] = useState([]);
    const [newItem, setNewItem] = useState({ name: "", quantity: 1, price: "", description: "" });
    const [bulkText, setBulkText] = useState("");
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null); // { id, name, price, quantity }
    const toast = useToast();
    
    // Resize Logic
    const wrapperRef = React.useRef(null);
    const [tableHeight, setTableHeight] = useState(450);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = React.useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback((e) => {
        if (isResizing && wrapperRef.current) {
            const newHeight = e.clientY - wrapperRef.current.getBoundingClientRect().top;
            if (newHeight > 200 && newHeight < 1000) {
                setTableHeight(newHeight);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const isAdmin = myRole === 'owner' || myRole === 'admin';

    const fetchData = async () => {
        try {
            const [dataRes, historyRes] = await Promise.all([
                api.get(`/houses-excel/${houseId}/data`),
                api.get(`/houses-excel/${houseId}/history`)
            ]);
            setData(dataRes);
            setHistory(historyRes);
            
            // Calculate active users (those who have checked at least one item)
            if (onActivityChange && dataRes.status) {
                const activeIds = [...new Set(dataRes.status.filter(s => s.is_checked === 1).map(s => s.user_id))];
                onActivityChange(activeIds);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [houseId]);

    const handleAddItem = async (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (!newItem.name.trim()) return;
            try {
                await api.post(`/houses-excel/${houseId}/items`, { 
                    name: newItem.name,
                    quantity: parseInt(newItem.quantity) || 1,
                    price: parseInt(String(newItem.price).replace(/[,.]/g, '')) || 0,
                    description: newItem.description
                });
                setNewItem({ name: "", quantity: 1, price: "", description: "" });
                fetchData();
                toast.success("Đã thêm sản phẩm");
            } catch (e) {
                toast.error(e.message);
            }
        }
    };

    const handleBulkSubmit = async () => {
        if (!bulkText.trim()) return;
        try {
            const rows = bulkText.split('\n').filter(r => r.trim());
            const itemsToCreate = rows.map(row => {
                // Prioritize comma separation as requested
                const parts = row.includes(',') ? row.split(',') : row.split('\t');
                
                return {
                    name: parts[0]?.trim(),
                    quantity: parseInt(parts[1]) || 1,
                    price: parts[2] ? parseInt(String(parts[2]).replace(/[^0-9]/g, '')) : 0,
                    description: parts[3]?.trim() || ""
                };
            }).filter(item => item && item.name);

            if (itemsToCreate.length === 0) return;

            await api.post(`/houses-excel/${houseId}/items`, { items: itemsToCreate });
            setBulkText("");
            setShowBulkAdd(false);
            fetchData();
            toast.success(`Đã thêm ${itemsToCreate.length} sản phẩm`);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleUpdateItem = async (itemId, fields) => {
        try {
            await api.patch(`/houses-excel/${houseId}/items/${itemId}`, fields);
            fetchData();
            setEditingItem(null);
            toast.success("Đã cập nhật");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!confirm("Bạn có chắc muốn xóa mục này?")) return;
        try {
            await api.delete(`/houses-excel/${houseId}/items/${itemId}`);
            fetchData();
            toast.success("Đã xóa sản phẩm");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleToggle = async (itemId, targetUserId, currentStatus) => {
        // Permission check
        if (!isAdmin && targetUserId !== user.id) return;
        
        try {
            // Optimistic Update
            const newIsChecked = !currentStatus;
            setData(prev => ({
                ...prev,
                status: [
                    ...prev.status.filter(s => !(s.item_id === itemId && s.user_id === targetUserId)),
                    { item_id: itemId, user_id: targetUserId, is_checked: newIsChecked ? 1 : 0 }
                ]
            }));

            await api.post(`/houses-excel/${houseId}/items/${itemId}/toggle`, {
                targetUserId,
                isChecked: newIsChecked
            });
            fetchData(); // Sync history
        } catch (e) {
            toast.error(e.message);
            fetchData(); // Rollback
        }
    };

    const handleFileImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("house_id", houseId);
        formData.append("file", file);

        try {
            toast.info("Đang import dữ liệu...");
            await api.post(`/products/import?house_id=${houseId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Import thành công!");
            fetchData();
            // Reset input
            e.target.value = '';
        } catch (err) {
            toast.error("Import thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    const getStatus = (itemId, userId) => {
        return data.status.find(s => s.item_id === itemId && s.user_id === userId)?.is_checked === 1;
    };

    if (loading) return <div className="p-10 text-center text-slate-400">Đang tải dữ liệu...</div>;

    return (
        <div className="excel-container">
            <div className="excel-header">
                <h2>Quản lý Dạng Bảng</h2>
                {isAdmin && (
                    <div className="excel-actions">
                        <label className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-all border border-emerald-500/30 cursor-pointer">
                            <FileUp size={14} />
                            Tải File
                            <input 
                                type="file" 
                                hidden 
                                accept=".xlsx, .xls"
                                onChange={handleFileImport}
                            />
                        </label>
                        <button 
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors border border-white/5"
                            onClick={() => setShowBulkAdd(true)}
                        >
                            + Thêm hàng loạt
                        </button>
                        <input 
                            type="text" 
                            className="add-item-input flex-[2]"
                            placeholder="Name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                            onKeyDown={handleAddItem}
                        />
                        <input 
                            type="number" 
                            className="add-item-input w-20"
                            placeholder="Quantity"
                            min="1"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                            onKeyDown={handleAddItem}
                        />
                        <input 
                            type="text" 
                            className="add-item-input w-32"
                            placeholder="Price"
                            value={newItem.price}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setNewItem({...newItem, price: val});
                            }}
                            onKeyDown={handleAddItem}
                        />
                        <input 
                            type="text" 
                            className="add-item-input flex-[3]"
                            placeholder="Description"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            onKeyDown={handleAddItem}
                        />
                        <button className="btn btn-primary" onClick={handleAddItem}>Thêm</button>
                    </div>
                )}
            </div>

            {/* BULK ADD MODAL */}
            {showBulkAdd && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Thêm hàng loạt sản phẩm</h3>
                            <button onClick={() => setShowBulkAdd(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-400">Nhập định dạng: <span className="text-blue-400">Tên, SL, Giá, Mô tả</span> (cách nhau bởi dấu phẩy)</p>
                            <textarea 
                                className="w-full h-48 bg-black/20 border border-white/10 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-blue-500 transition-colors resize-none"
                                placeholder="Ví dụ:&#10;Sản phẩm A,10,50000,Mô tả A&#10;Sản phẩm B,5,10000,Mới"
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="p-6 bg-black/20 flex gap-3 justify-end">
                            <button onClick={() => setShowBulkAdd(false)} className="px-5 py-2 text-sm text-slate-300 hover:text-white">Hủy</button>
                            <button onClick={handleBulkSubmit} className="btn btn-primary px-8">Tạo sản phẩm</button>
                        </div>
                    </div>
                </div>
            )}

            <div 
                ref={wrapperRef}
                className="excel-table-wrapper custom-scrollbar"
                style={{ height: `${tableHeight}px`, resize: 'none' }} // Override CSS resize
            >
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th className="item-col">Sản phẩm</th>
                            <th className="qty-col">SL</th>
                            <th className="price-col">Tiền (đ)</th>
                            {data.members.map(m => (
                                <th key={m.id}>
                                    <div className="member-header">
                                        <span className="text-white text-xs">{m.full_name}</span>
                                        <span className={`member-role role-${m.role}`}>{m.role}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map(item => (
                            <tr key={item.id}>
                                <td className="item-cell">
                                    {editingItem?.id === item.id ? (
                                        <input 
                                            autoFocus
                                            className="edit-input"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                            onBlur={() => handleUpdateItem(item.id, editingItem)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem(item.id, editingItem)}
                                        />
                                    ) : (
                                        <div className="flex justify-between items-center group">
                                            <span 
                                                className={isAdmin ? "cursor-pointer hover:text-blue-400" : ""}
                                                onClick={() => isAdmin && setEditingItem({...item})}
                                            >
                                                {item.name}
                                            </span>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all text-[10px]"
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="qty-cell">
                                    {editingItem?.id === item.id ? (
                                        <input 
                                            type="number"
                                            className="edit-input w-12"
                                            value={editingItem.quantity}
                                            onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})}
                                            onBlur={() => handleUpdateItem(item.id, editingItem)}
                                        />
                                    ) : (
                                        <span onClick={() => isAdmin && setEditingItem({...item})}>{item.quantity}</span>
                                    )}
                                </td>
                                <td className="price-cell">
                                    {editingItem?.id === item.id ? (
                                        <input 
                                            type="number"
                                            className="edit-input w-20"
                                            value={editingItem.price}
                                            onChange={(e) => setEditingItem({...editingItem, price: e.target.value})}
                                            onBlur={() => handleUpdateItem(item.id, editingItem)}
                                        />
                                    ) : (
                                        <div 
                                            className={`flex flex-col ${isAdmin ? 'cursor-pointer hover:bg-white/5' : ''} rounded px-1 transition-colors`}
                                            onClick={() => isAdmin && setEditingItem({...item})}
                                        >
                                            <span className="font-bold text-slate-200">
                                                {Number(item.price).toLocaleString()}
                                            </span>
                                            {(() => {
                                                const checkedCount = data.status.filter(s => s.item_id === item.id && s.is_checked).length;
                                                if (checkedCount > 0) {
                                                    const share = Math.round(item.price / checkedCount);
                                                    return (
                                                        <span className="text-[9px] text-blue-400 font-mono italic">
                                                            ({share.toLocaleString()}đ/ng)
                                                        </span>
                                                    );
                                                }
                                                return <span className="text-[9px] text-slate-500 italic">(Chưa chia)</span>;
                                            })()}
                                        </div>
                                    )}
                                </td>
                                {data.members.map(member => {
                                    const checked = getStatus(item.id, member.id);
                                    const canToggle = isAdmin || member.id === user.id;
                                    return (
                                        <td key={member.id}>
                                            <div className="checkbox-container">
                                                <div 
                                                    className={`custom-checkbox ${checked ? 'checked' : ''} ${!!canToggle ? '' : 'disabled'}`}
                                                    onClick={() => canToggle && handleToggle(item.id, member.id, checked)}
                                                ></div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.items.length === 0 && (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <span className="text-4xl">📊</span>
                        <p>Chưa có sản phẩm nào được tạo. {isAdmin ? 'Hãy thêm sản phẩm mới để bắt đầu.' : ''}</p>
                    </div>
                )}
            </div>

            {/* GRAB BAR / TAP BAR */}
            <div 
                className={`excel-grab-bar ${isResizing ? 'resizing' : ''}`}
                onMouseDown={startResizing}
            >
                <div className="grab-handle">
                    <div className="bar-glow"></div>
                    <div className="dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span className="label">Kéo để chỉnh độ cao</span>
                </div>
            </div>

            <ExcelHistory history={history} />
        </div>
    );
}
