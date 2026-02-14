import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import BackButton from "../components/common/BackButton";
import { Check, X, Eye, ExternalLink, Clock, User, CreditCard } from "lucide-react";

export function DepositManagement() {
    const toast = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [notes, setNotes] = useState({}); // Row-specific notes
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await api.get("/deposits/admin/all");
            setRequests(data);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách yêu cầu nạp tiền");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        const actionNote = notes[id] || "";
        
        if (!actionNote && action === 'reject') {
            toast.warning("Vui lòng nhập lý do từ chối vào ô ghi chú cho yêu cầu này");
            return;
        }

        const confirmMsg = action === 'approve' 
            ? "Bạn có chắc chắn muốn DUYỆT yêu cầu này? Tiền sẽ được cộng vào ví user ngay lập tức." 
            : "Từ chối yêu cầu này?";
        
        const ok = await toast.confirm(confirmMsg);
        if (!ok) return;

        setProcessingId(id);
        try {
            const endpoint = `/deposits/admin/${id}/${action}`;
            await api.post(endpoint, { admin_note: actionNote });
            toast.success(action === 'approve' ? "Đã duyệt thành công!" : "Đã từ chối yêu cầu.");
            
            // Clear note for this ID
            setNotes(prev => {
                const newNotes = { ...prev };
                delete newNotes[id];
                return newNotes;
            });
            
            fetchRequests();
        } catch (e) {
            toast.error(e.response?.data?.error || "Thao tác thất bại");
        } finally {
            setProcessingId(null);
        }
    };

    const formatMoney = (n) => Number(n).toLocaleString("vi-VN") + " đ";

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'APPROVED': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'REJECTED': return 'bg-red-500/20 text-red-500 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    // Helper to get image URL safely
    const getImageUrl = (path) => {
        if (!path) return "";
        if (path.startsWith('http')) return path;
        
        const baseUrl = import.meta.env.VITE_API_URL || "";
        // If baseUrl is relative (/api) or empty, we use relative path
        if (!baseUrl.startsWith('http')) return path;
        
        // If baseUrl is absolute, prepend it to path (but remove /api at the end if present since uploads is usually at root)
        const host = baseUrl.replace(/\/api$/, '');
        return `${host}${path}`;
    };

    return (
        <div className="deposit-management-page animate-fade-in p-6 min-h-screen">
            <BackButton fallbackPath="/wallet" className="mb-6" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="text-primary" />
                        Quản lý Yêu cầu Nạp tiền
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Duyệt hoặc từ chối các yêu cầu nạp tiền thủ công từ người dùng</p>
                </div>
                <button 
                    onClick={fetchRequests} 
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all"
                >
                    LÀM MỚI
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
                </div>
            ) : (
                <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người dùng</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Số tiền</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Phương thức</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Minh chứng</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                    {req.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium text-sm">{req.full_name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{req.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-blue-400 font-bold">{formatMoney(req.amount)}</div>
                                            <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-1">
                                                <Clock size={10} />
                                                {new Date(req.created_at).toLocaleString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">
                                                {req.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {req.proof_image ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div 
                                                        className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:scale-110 transition-transform bg-black/20"
                                                        onClick={() => setSelectedImage(req.proof_image)}
                                                    >
                                                        <img 
                                                           src={getImageUrl(req.proof_image)} 
                                                           className="w-full h-full object-cover" 
                                                           alt="Mini proof" 
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setSelectedImage(req.proof_image)}
                                                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 justify-center mt-1"
                                                    >
                                                        <Eye size={10} /> Xem lớn
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 italic">Không có ảnh</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusStyle(req.status)}`}>
                                                {req.status === 'PENDING' ? 'ĐANG CHỜ' : req.status === 'APPROVED' ? 'ĐÃ DUYỆT' : 'BỊ TỪ CHỐI'}
                                            </span>
                                            {req.processed_at && (
                                                <div className="text-[9px] text-slate-600 mt-1 uppercase">
                                                    {new Date(req.processed_at).toLocaleString('vi-VN')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'PENDING' ? (
                                                <div className="flex flex-col gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ghi chú (Note)..." 
                                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-primary/50"
                                                        value={notes[req.id] || ""}
                                                        onChange={(e) => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleAction(req.id, 'reject')}
                                                            disabled={processingId === req.id || processingId}
                                                            className="p-1 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                                                        >
                                                            <X size={12} /> TỪ CHỐI
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(req.id, 'approve')}
                                                            disabled={processingId === req.id || processingId}
                                                            className="p-1 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                                                        >
                                                            <Check size={12} /> DUYỆT
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-500 italic max-w-[150px] truncate ml-auto">
                                                    {req.admin_note || "Đã xử lý"}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center text-slate-500 italic">
                                            Không có yêu cầu nạp tiền nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* IMAGE PREVIEW MODAL */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl w-full flex flex-col items-center">
                        <button 
                            className="absolute -top-10 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 font-bold"
                            onClick={() => setSelectedImage(null)}
                        >
                            ĐÓNG (ESC) <X size={20} />
                        </button>
                        <img 
                            src={getImageUrl(selectedImage)} 
                            alt="Proof" 
                            className="max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <a 
                            href={getImageUrl(selectedImage)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 text-xs text-slate-400 hover:text-white flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 transition-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            MỞ TRONG TAB MỚI <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
