import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import BackButton from "../components/common/BackButton";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from 'recharts';
import { Users, Activity, Calendar, TrendingUp, Search, Filter, ArrowUp, ArrowDown } from "lucide-react";

export function UserActivity() {
    const { user } = useAuth();
    const toast = useToast();
    
    const [stats, setStats] = useState([]);
    const [charts, setCharts] = useState({ dailyUsers: [], weeklyVisits: [], topUsers: [] });
    const [peakHourData, setPeakHourData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [filters, setFilters] = useState({
        search: '',
        sort: 'last_visit_at',
        order: 'DESC',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchStats();
            // Charts and Peak Hour usually don't need the same detailed table filtering, 
            // but could be updated if needed. For now, keep them global.
            fetchCharts();
            fetchPeakHour();
        }
    }, [pagination.page, filters.sort, filters.order, filters.startDate, filters.endDate]);

    // Use a separate effect for search to debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user?.role === 'admin') fetchStats();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.search]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { search, sort, order, startDate, endDate } = filters;
            const query = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                search,
                sort,
                order,
                startDate,
                endDate
            }).toString();
            
            const res = await api.get(`/admin/user-activity/stats?${query}`);
            setStats(res.data);
            setPagination(prev => ({ ...prev, total: res.pagination.total }));
            setLoading(false);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi tải dữ liệu thống kê");
            setLoading(false);
        }
    };

    const fetchCharts = async () => {
        try {
            const res = await api.get(`/admin/user-activity/charts`);
            setCharts(res);
        } catch (e) {
            console.error(e);
        }
    };
    
    const fetchPeakHour = async () => {
        try {
            const res = await api.get(`/admin/analytics/peak-hour`);
            setPeakHourData(res);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSort = (column) => {
        setFilters(prev => ({
            ...prev,
            sort: column,
            order: prev.sort === column && prev.order === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    if (user?.role !== 'admin') {
        return <div className="p-10 text-center text-red-500 font-bold">Quyền truy cập bị từ chối!</div>;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "Chưa có dữ liệu";
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="user-activity-page animate-fade-in px-4 py-6 max-w-7xl mx-auto pb-20">
            <BackButton fallbackPath="/" className="mb-4" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Activity className="text-primary w-8 h-8" />
                        Thống kê hoạt động người dùng
                    </h1>
                    <p className="text-slate-400 mt-1">Theo dõi tương tác và tần suất truy cập của người dùng</p>
                </div>
                
                {peakHourData && (
                    <div className="glass p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-4 animate-bounce-in shadow-lg">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">🔥 Giờ truy cập cao nhất</div>
                            <div className="text-xl font-black text-white">{peakHourData.peakRange}</div>
                            <div className="text-[10px] text-primary font-bold uppercase">{peakHourData.totalVisits} lượt truy cập</div>
                        </div>
                    </div>
                )}
            </div>

            {/* PEAK HOUR 24H CHART */}
            {peakHourData && (
                <div className="glass p-6 rounded-2xl border border-white/10 shadow-xl mb-8">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-400" />
                        Tần suất truy cập trong ngày (24h)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHourData.hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="hour" 
                                    stroke="#94a3b8" 
                                    fontSize={11}
                                    tickFormatter={(val) => `${val}h`}
                                />
                                <YAxis stroke="#94a3b8" fontSize={11} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20', borderRadius: '8px', color: '#fff' }}
                                    cursor={{fill: '#ffffff05'}}
                                    formatter={(value) => [`${value} lượt`, 'Tần suất']}
                                    labelFormatter={(label) => `Khung giờ: ${label}:00 - ${label + 1}:00`}
                                />
                                <Bar dataKey="total">
                                    {peakHourData.hourlyData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.hour === peakHourData.peakHour ? '#f97316' : '#3b82f6'} 
                                            fillOpacity={entry.hour === peakHourData.peakHour ? 1 : 0.6}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Daily Active Users Chart */}
                <div className="glass p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Số User Hoạt Động (7 ngày gần nhất)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts.dailyUsers}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#94a3b8" 
                                    fontSize={12} 
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Users Chart */}
                <div className="glass p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Top 5 User Hoạt Động Nhiều Nhất
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.topUsers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} hide />
                                <YAxis 
                                    dataKey="full_name" 
                                    type="category" 
                                    stroke="#fff" 
                                    fontSize={11} 
                                    width={100}
                                    tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20', borderRadius: '8px', color: '#fff' }}
                                    cursor={{fill: '#ffffff05'}}
                                />
                                <Bar dataKey="total_visits" radius={[0, 4, 4, 0]}>
                                    {charts.topUsers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <h3 className="text-xl font-bold text-white">Chi tiết hoạt động</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Date Filters */}
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 overflow-hidden">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Lần cuối từ:</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-white text-xs outline-none filter-invert-on-dark"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                            <span className="text-slate-700 mx-1">|</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Đến:</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-white text-xs outline-none filter-invert-on-dark"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>

                        <div className="relative flex-1 lg:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Tìm theo tên hoặc email..." 
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50 transition-all font-sans"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('full_name')}>
                                    Người dùng {filters.sort === 'full_name' && (filters.order === 'ASC' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('total_visits')}>
                                    Tổng lượt {filters.sort === 'total_visits' && (filters.order === 'ASC' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('last_visit_at')}>
                                    Lần cuối {filters.sort === 'last_visit_at' && (filters.order === 'ASC' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('total_active_days')}>
                                    Số ngày {filters.sort === 'total_active_days' && (filters.order === 'ASC' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                </th>
                                <th className="px-6 py-4">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-8">
                                            <div className="h-10 bg-white/5 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : stats.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Không có dữ liệu người dùng</td>
                                </tr>
                            ) : (
                                stats.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    {u.avatar_url ? (
                                                        <img src={u.avatar_url} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-primary font-bold">
                                                            {u.full_name?.charAt(0) || "U"}
                                                        </div>
                                                    )}
                                                    {u.status === 'online' && (
                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1e293b]"></span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-white font-semibold group-hover:text-primary transition-colors">{u.full_name}</div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                                                {u.total_visits} lượt
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {formatDate(u.last_visit_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-primary">
                                            {u.total_active_days || 0} ngày
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${u.status === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-slate-500/20 text-slate-500 border border-white/5'}`}>
                                                {u.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center">
                    <p className="text-sm text-slate-500">
                        Hiển thị {stats.length} trên tổng số {pagination.total} người dùng
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="btn btn-sm glass border-white/10 text-white disabled:opacity-30"
                        >
                            Trước
                        </button>
                        <div className="flex items-center px-4 bg-white/5 rounded-lg text-sm text-white font-bold">
                            {pagination.page}
                        </div>
                        <button 
                            disabled={pagination.page * pagination.limit >= pagination.total}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="btn btn-sm glass border-white/10 text-white disabled:opacity-30"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserActivity;
