import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import BackButton from "../components/common/BackButton";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";

export function UserManagement() {
    const { user } = useAuth();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Debounce search and filters to prevent rapid API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, startDate, endDate]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                search: searchTerm,
                startDate,
                endDate
            }).toString();
            
            const data = await api.get(`/users/admin/all?${params}`);
            setUsers(data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi tải danh sách người dùng");
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === "active" ? "locked" : "active";
        const message = newStatus === "locked" ? "Bạn có chắc muốn khóa tài khoản này?" : "Bạn có chắc muốn mở khóa tài khoản này?";
        
        const ok = await toast.confirm(message);
        if (!ok) return;

        try {
            await api.patch(`/users/admin/${userId}/status`, { status: newStatus });
            toast.success(newStatus === 'locked' ? "Đã khóa tài khoản!" : "Đã mở khóa tài khoản!");
            fetchUsers();
        } catch (e) {
            toast.error(e.message || "Cập nhật trạng thái thất bại");
        }
    };

    const handleDelete = async (userId) => {
        const ok = await toast.confirm("CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản. Bạn có chắc chắn không?", { title: "CẢNH BÁO NGUY HIỂM", confirmLabel: "Xóa vĩnh viễn" });
        if (!ok) return;

        try {
            await api.delete(`/users/admin/${userId}`);
            toast.success("Đã xóa tài khoản thành công!");
            fetchUsers();
        } catch (e) {
            toast.error(e.message || "Xóa người dùng thất bại. Có thể do dữ liệu liên quan.");
        }
    };

    if (user?.role !== 'admin') {
        return <div className="p-10 text-center text-red-500 font-bold">Quyền truy cập bị từ chối!</div>;
    }

    return (
        <div className="user-management-page animate-fade-in relative px-4 py-6">
            <BackButton fallbackPath="/" className="mb-4" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                   <h1 className="text-2xl font-bold text-white">Quản lý Người dùng</h1>
                   <p className="text-slate-400 text-xs mt-1">Quản lý và cập nhật quyền hạn người dùng toàn hệ thống</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Date Filters */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 overflow-hidden">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Từ:</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-white text-xs outline-none filter-invert-on-dark"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-700 mx-1">|</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Đến:</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-white text-xs outline-none filter-invert-on-dark"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="search-box relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm email, tên..." 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-primary/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</div>
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người dùng</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Vai trò</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Ngày tham gia</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                        {u.full_name?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-white font-medium">{u.full_name}</div>
                                                    <div className="text-xs text-muted">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${u.status === 'locked' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {u.status === 'locked' ? 'Bị khóa' : 'Hoạt động'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted hidden md:table-cell">
                                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleToggleStatus(u.id, u.status)}
                                                    className={`btn btn-xs ${u.status === 'locked' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'} border-none`}
                                                >
                                                    {u.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(u.id)}
                                                    className="btn btn-xs bg-red-500/20 text-red-500 hover:bg-red-500/30 border-none"
                                                    disabled={u.id === user.id}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
