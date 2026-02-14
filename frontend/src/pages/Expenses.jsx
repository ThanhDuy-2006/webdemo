import { useState, useEffect, useMemo } from 'react';
import { api, expenses } from '../services/api'; 
import BackButton from '../components/common/BackButton';
import { ExpenseDetail } from './ExpenseDetail';
import { useToast } from '../context/ToastContext';
import './Expenses.css';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis
} from 'recharts';

// --- ICONS ---
const ICONS = {
    'Food': '🍜', 'Shopping': '🛍️', 'Living': '🏠', 'Transport': '🚗', 
    'Entertainment': '🎮', 'Health': '🏥', 'Other': '📦',
    'Salary': '💰', 'Invest': '📈', 'Bonus': '🎁'
};

const COLORS = ['#0066FF', '#FF3B30', '#AF52DE', '#FFCC00', '#FF9500', '#5AC8FA', '#4CD964'];

const formatMoney = (amount) => Number(amount).toLocaleString('vi-VN') + ' đ';

export function Expenses() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [records, setRecords] = useState([]);
    const [categories, setCategories] = useState([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [day, setDay] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [filterType, setFilterType] = useState('month'); // 'month' or 'day'
    
    const [selectedId, setSelectedId] = useState(null);
    const toast = useToast();

    // Modal State
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({
        amount: '',
        category_id: null,
        transaction_date: new Date().toISOString().slice(0, 10),
        note: '',
        type: 'EXPENSE'
    });

    useEffect(() => {
        loadData();
    }, [month, day, filterType]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = filterType === 'month' ? { month } : { day };
            const [statsRes, recordsRes, catsRes] = await Promise.all([
                expenses.getStats(month), // Stats remain monthly for better overview
                expenses.getAll(params),
                expenses.getCategories()
            ]);
            setStats(statsRes);
            setRecords(recordsRes);
            setCategories(catsRes);
        } catch (e) {
            console.error("Load expenses failed", e);
            toast.error(`Lỗi: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newItem.amount || !newItem.category_id) return showToast("Vui lòng nhập số tiền và chọn danh mục", "error");
        
        try {
            // If it's today, append current time for better sorting
            let finalDate = newItem.transaction_date;
            const today = new Date().toISOString().slice(0, 10);
            if (finalDate === today) {
                const now = new Date();
                finalDate = `${today} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            }

            await expenses.create({
                ...newItem,
                amount: parseInt(newItem.amount.replace(/\D/g, '')),
                transaction_date: finalDate
            });
            setShowAdd(false);
            setNewItem({ 
                amount: '', 
                category_id: null, 
                transaction_date: new Date().toISOString().slice(0, 10), 
                note: '', 
                type: 'EXPENSE' 
            });
            toast.success("Đã thêm hoá đơn mới");
            loadData(); // Reload
        } catch (e) {
            toast.error("Lỗi thêm hoá đơn");
        }
    };

    const groupedRecords = useMemo(() => {
        const groups = {};
        records.forEach(r => {
            const date = new Date(r.transaction_date).toLocaleDateString('vi-VN');
            if (!groups[date]) groups[date] = [];
            groups[date].push(r);
        });
        return groups;
    }, [records]);

    if (loading && !stats) return <div className="p-8 text-center text-slate-400">Đang tải dữ liệu...</div>;

    return (
        <div className="expenses-page p-4 max-w-md mx-auto min-h-screen">
            {/* Header */}
            <BackButton fallbackPath="/" className="mb-2" />
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-white">Quản lý chi tiêu</h1>
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button 
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${filterType === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
                            onClick={() => setFilterType('month')}
                        >Tháng</button>
                        <button 
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${filterType === 'day' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
                            onClick={() => setFilterType('day')}
                        >Ngày</button>
                    </div>
                </div>
                
                <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-blue-400">
                        🗓️
                    </div>
                    {filterType === 'month' ? (
                        <input 
                            type="month" 
                            className="w-full bg-transparent text-white pl-10 pr-4 py-2.5 text-sm outline-none font-bold"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                    ) : (
                        <input 
                            type="date" 
                            className="w-full bg-transparent text-white pl-10 pr-4 py-2.5 text-sm outline-none font-bold"
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                        />
                    )}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="expense-summary-grid">
                 <div className="summary-card income">
                    <h3>Thu nhập</h3>
                    <span className="value">{formatMoney(stats?.income || 0)}</span>
                 </div>
                 <div className="summary-card expense">
                    <h3>Chi tiêu</h3>
                    <span className="value">{formatMoney(stats?.expense || 0)}</span>
                    
                    {stats?.comparison && (
                        <div className={`comparison-badge ${stats.comparison.diff > 0 ? 'up' : 'down'}`}>
                            {stats.comparison.diff > 0 ? '▲' : '▼'} {Math.abs(stats.comparison.percent)}%
                        </div>
                    )}
                 </div>
            </div>

            {/* Chart */}
            {stats?.categories?.length > 0 && (
                <div className="expense-card h-64 mb-6">
                    <h3 className="text-sm text-slate-400 mb-4 uppercase">Phân bổ chi tiêu</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.categories}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                            >
                                {stats.categories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(val) => formatMoney(val)}
                                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {stats.categories.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="w-2 h-2 rounded-full" style={{background: c.color || COLORS[i % COLORS.length]}}></span>
                                {c.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Records List Section */}
            <div className="section-title flex justify-between items-center px-1 mb-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Lịch sử giao dịch</h3>
                <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{records.length} mục</span>
            </div>

            <div className="records-scroll-container">
                <div className="records-list">
                {Object.keys(groupedRecords).map(date => (
                    <div key={date}>
                        <div className="expense-group-header">
                            <span>{date}</span>
                        </div>
                        <div className="rounded-xl overflow-hidden">
                            {groupedRecords[date].map(item => (
                                <div key={item.id} className="expense-item" onClick={() => setSelectedId(item.id)}>
                                    <div className="cat-icon" style={{background: item.category_color + '20', color: item.category_color}}>
                                        {item.category_icon || '📦'}
                                    </div>
                                    <div className="expense-details">
                                        <div className="flex items-center gap-1.5 leading-none mb-0.5">
                                            <span className="expense-cat">{item.category_name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono opacity-80">
                                                {new Date(item.transaction_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="expense-note">{item.note}</div>
                                    </div>
                                    <div className={`expense-amount ${item.type === 'INCOME' ? 'income' : 'expense'}`}>
                                        {item.type === 'INCOME' ? '+' : '-'}{formatMoney(item.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {records.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-sm italic">
                        Không có dữ liệu cho thời gian này.
                    </div>
                )}
                </div>
            </div>

            {/* FAB */}
            <button className="fab-add" onClick={() => setShowAdd(true)}>
                <span>+</span>
            </button>

            {/* Add Modal */}
            {showAdd && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
                    <div className="bottom-sheet">
                        <div className="sheet-header">
                            <h2 className="sheet-title">Thêm giao dịch</h2>
                            <button onClick={() => setShowAdd(false)} className="text-slate-400 p-2">✕</button>
                        </div>
                        
                        <div className="amount-input-group">
                            <label className="text-xs text-slate-400">Số tiền</label>
                            <input 
                                type="text" 
                                className="amount-input" 
                                placeholder="0" 
                                autoFocus
                                value={newItem.amount ? Number(newItem.amount).toLocaleString('vi-VN') : ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setNewItem({...newItem, amount: val});
                                }}
                            />
                            <span className="text-right text-xs text-slate-500">VND</span>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Danh mục</label>
                            <div className="cat-grid">
                                {categories.filter(c => c.type === newItem.type).map(c => (
                                    <div 
                                        key={c.id} 
                                        className={`cat-item ${newItem.category_id === c.id ? 'active' : ''}`}
                                        onClick={() => setNewItem({...newItem, category_id: c.id})}
                                    >
                                        <div className="cat-circle" style={{color: c.color}}>
                                            {c.icon}
                                        </div>
                                        <span className="cat-name">{c.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <input 
                                type="date" 
                                className="date-picker flex-1"
                                value={newItem.transaction_date}
                                onChange={e => setNewItem({...newItem, transaction_date: e.target.value})}
                             />
                             <select 
                                className="date-picker w-auto"
                                value={newItem.type}
                                onChange={e => setNewItem({...newItem, type: e.target.value})}
                             >
                                <option value="EXPENSE">Chi tiền</option>
                                <option value="INCOME">Thu tiền</option>
                             </select>
                        </div>
                        
                        <input 
                            type="text" 
                            className="bg-slate-800 text-white p-3 rounded-xl w-full border border-slate-700 outline-none"
                            placeholder="Ghi chú (tuỳ chọn)"
                            value={newItem.note}
                            onChange={e => setNewItem({...newItem, note: e.target.value})}
                        />

                        <button onClick={handleAdd} className="btn btn-primary w-full py-3 text-lg mt-2">
                            Lưu hoá đơn
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedId && (
                <ExpenseDetail 
                    id={selectedId} 
                    onClose={() => setSelectedId(null)} 
                    onUpdate={loadData}
                />
            )}
        </div>
    );
}
