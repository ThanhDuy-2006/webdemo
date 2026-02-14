import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import BackButton from "../components/common/BackButton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Profile() {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState("info");
    const [loading, setLoading] = useState(false);

    // Form data for Info Tab
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        avatar: null
    });
    const [preview, setPreview] = useState(null);

    // Form data for Password Tab
    const [pwdData, setPwdData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: ""
    });

    // Data for Balance Tab
    const [walletData, setWalletData] = useState({
        balance: 0,
        transactions: []
    });
    const [stats, setStats] = useState([]);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || "",
                phone: user.phone || "",
                avatar: null
            });
            setPreview(user.avatar_url || null);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === "balance") {
            fetchWallet();
            fetchStats();
        }
    }, [activeTab]);

    const isFetchingWallet = useRef(false);
    const isFetchingStats = useRef(false);

    const fetchWallet = async () => {
        if (isFetchingWallet.current) return;
        isFetchingWallet.current = true;
        try {
            const res = await api.get("/wallets");
            setWalletData(res);
        } catch (err) {
            console.error("Fetch wallet error:", err);
        } finally {
            isFetchingWallet.current = false;
        }
    };

    const fetchStats = async () => {
        if (isFetchingStats.current) return;
        isFetchingStats.current = true;
        try {
            const data = await api.get("/wallets/stats");
            setStats(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            isFetchingStats.current = false;
        }
    };

    const formatMoney = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePwdChange = (e) => {
        setPwdData({ ...pwdData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, avatar: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append("full_name", formData.full_name);
            data.append("phone", formData.phone);
            if (formData.avatar) {
                data.append("avatar", formData.avatar);
            }

            const res = await api.patch("/users/me", data, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.success && res.user) {
                updateUser(res.user);
                toast.success("Cập nhật thông tin thành công!");
            }
        } catch (err) {
            toast.error("Lỗi: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwdData.new_password !== pwdData.confirm_password) {
            return toast.warn("Mật khẩu mới không khớp!");
        }
        setLoading(true);
        try {
            await api.patch("/auth/change-password", {
                old_password: pwdData.old_password,
                new_password: pwdData.new_password
            });
            toast.success("Đổi mật khẩu thành công!");
            setPwdData({ old_password: "", new_password: "", confirm_password: "" });
        } catch (err) {
            toast.error("Lỗi: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="text-center py-20 text-muted">Vui lòng đăng nhập...</div>;

    const tabs = [
        { id: "info", label: "Thông Tin", icon: "👤" },
        { id: "password", label: "Thay Đổi Mật Khẩu", icon: "🔒" },
        { id: "balance", label: "Biến Động Số Dư", icon: "📈" }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in relative">
            <BackButton fallbackPath="/" className="absolute top-4 left-0 md:static md:mb-4" />
            <h1 className="text-3xl font-bold text-white mb-8 text-center bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Hồ Sơ Của Bạn
            </h1>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn gap-2 transition-all duration-300 ${
                            activeTab === tab.id 
                            ? "btn-primary shadow-lg shadow-primary/20 scale-105" 
                            : "btn-ghost text-muted hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* INFO TAB */}
                {activeTab === "info" && (
                    <div className="card glass p-8 animate-slide-up">
                        <form onSubmit={handleUpdateInfo} className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-40 h-40 rounded-full border-4 border-primary/20 overflow-hidden relative group bg-black/40 shadow-2xl">
                                    {preview ? (
                                        <img 
                                          src={(() => {
                                            // Normalization logic for mobile/local network
                                            let url = preview;
                                            if (url && (url.includes("localhost") || url.includes("127.0.0.1"))) {
                                               try {
                                                 const urlObj = new URL(url);
                                                 // Only normalize if it's not a blob (preview of new upload)
                                                 if (!url.startsWith('blob:')) {
                                                     return urlObj.pathname;
                                                 }
                                               } catch (e) { return url; }
                                            }
                                            return url;
                                          })()} 
                                          className="w-full h-full object-cover" 
                                          alt="Avatar" 
                                          onError={(e) => {
                                              console.error("Profile Avatar load failed:", preview);
                                              // Fallback to initial char
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl text-muted font-bold">
                                            {user.full_name?.charAt(0)}
                                        </div>
                                    )}
                                    {/* Fallback div for error state */}
                                    <div className="w-full h-full absolute inset-0 bg-primary/20 flex items-center justify-center text-5xl text-primary font-bold shadow-inner" style={{ display: 'none' }}>
                                        {user.full_name?.charAt(0)}
                                    </div>

                                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                                        <span className="text-white text-xs font-bold mb-1">CẬP NHẬT</span>
                                        <span className="text-[10px] text-muted">Click to upload</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-primary">{user.role?.toUpperCase()}</p>
                                    <p className="text-xs text-muted">ID: {user.id}</p>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-5">
                                <div className="form-control">
                                    <label className="label text-muted text-xs uppercase tracking-widest font-bold">Họ và tên</label>
                                    <input 
                                        name="full_name" 
                                        className="input bg-white/5 border-white/10 hover:border-primary/50 transition-colors" 
                                        value={formData.full_name} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label text-muted text-xs uppercase tracking-widest font-bold">Email</label>
                                    <input 
                                        className="input bg-black/40 text-muted cursor-not-allowed border-transparent" 
                                        value={user.email} 
                                        readOnly 
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label text-muted text-xs uppercase tracking-widest font-bold">Số điện thoại</label>
                                    <input 
                                        name="phone" 
                                        className="input bg-white/5 border-white/10 hover:border-primary/50 transition-colors" 
                                        value={formData.phone} 
                                        onChange={handleChange} 
                                        placeholder="Chưa cập nhật"
                                    />
                                </div>

                                <button type="submit" className={`btn btn-primary mt-4 shadow-xl shadow-primary/20 ${loading ? 'loading' : ''}`}>
                                    Lưu Thông Tin
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* PASSWORD TAB */}
                {activeTab === "password" && (
                    <div className="card glass p-8 animate-slide-up max-w-md mx-auto w-full">
                        <form onSubmit={handleChangePassword} className="flex flex-col gap-5 text-white">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <span className="p-2 bg-primary/20 rounded-lg">🔒</span>
                                Bảo Mật Tài Khoản
                            </h3>
                            <div className="form-control">
                                <label className="label text-muted text-xs uppercase tracking-widest font-bold">Mật khẩu cũ</label>
                                <input 
                                    type="password"
                                    name="old_password" 
                                    className="input bg-white/5 border-white/10" 
                                    value={pwdData.old_password} 
                                    onChange={handlePwdChange} 
                                    required 
                                />
                            </div>
                            <div className="form-control">
                                <label className="label text-muted text-xs uppercase tracking-widest font-bold">Mật khẩu mới</label>
                                <input 
                                    type="password"
                                    name="new_password" 
                                    className="input bg-white/5 border-white/10" 
                                    value={pwdData.new_password} 
                                    onChange={handlePwdChange} 
                                    required 
                                />
                            </div>
                            <div className="form-control">
                                <label className="label text-muted text-xs uppercase tracking-widest font-bold">Xác nhận mật khẩu mới</label>
                                <input 
                                    type="password"
                                    name="confirm_password" 
                                    className="input bg-white/5 border-white/10" 
                                    value={pwdData.confirm_password} 
                                    onChange={handlePwdChange} 
                                    required 
                                />
                            </div>
                            <button type="submit" className={`btn btn-primary mt-4 shadow-xl shadow-primary/20 ${loading ? 'loading' : ''}`}>
                                Cập Nhật Mật Khẩu
                            </button>
                        </form>
                    </div>
                )}

                {/* BALANCE TAB */}
                {activeTab === "balance" && (
                    <div className="card glass p-8 animate-slide-up">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="p-2 bg-green-500/20 rounded-lg">📈</span>
                                    Lịch Sử Biến Động
                                </h3>
                                <p className="text-sm text-muted">Theo dõi các giao dịch tài chính của bạn</p>
                            </div>
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center px-8">
                                <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Số dư hiện tại</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {(walletData.balance || 0).toLocaleString('vi-VN')} <span className="text-xs">VNĐ</span>
                                </p>
                            </div>
                        </div>

                        <div className="h-48 w-full mb-8 bg-black/20 rounded-xl p-4 border border-white/5 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke="#64748b" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(val) => {
                                            if (!val || typeof val !== 'string') return '';
                                            const parts = val.split('-');
                                            return parts.length > 2 ? `${parts[2]}/${parts[1]}` : val;
                                        }}
                                    />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ background: 'rgba(13, 20, 48, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ fontSize: '10px' }}
                                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#8aa4ff' }}
                                        formatter={(v) => [formatMoney(v), ""]}
                                    />
                                    <Bar 
                                        name="Tiền Vào"
                                        dataKey="total_deposit" 
                                        fill="#4f7cff" 
                                        radius={[4, 4, 0, 0]} 
                                        isAnimationActive={true}
                                        animationDuration={2000}
                                    />
                                    <Bar 
                                        name="Tiền Ra"
                                        dataKey="total_spent" 
                                        fill="#ff4f7c" 
                                        radius={[4, 4, 0, 0]} 
                                        isAnimationActive={true}
                                        animationDuration={2000}
                                        animationBegin={400}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-white/5">
                                    <tr className="border-b border-white/10">
                                        <th className="text-muted font-bold uppercase text-[10px] tracking-widest">Thời gian</th>
                                        <th className="text-muted font-bold uppercase text-[10px] tracking-widest">Người thực hiện</th>
                                        <th className="text-muted font-bold uppercase text-[10px] tracking-widest">Đối tác</th>
                                        <th className="text-muted font-bold uppercase text-[10px] tracking-widest">Nội dung</th>
                                        <th className="text-muted font-bold uppercase text-[10px] tracking-widest">Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {walletData.transactions.length > 0 ? (
                                        walletData.transactions.map(t => {
                                            const isPositive = Number(t.amount) >= 0;
                                            return (
                                            <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="text-xs text-white">
                                                    {new Date(t.created_at).toLocaleString('vi-VN')}
                                                </td>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-200 text-xs">{t.initiator_name || '???'}</span>
                                                        <span className="text-[10px] text-slate-500">{t.initiator_email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-blue-300 text-xs">{t.partner_name || '!!'}</span>
                                                        <span className="text-[10px] text-blue-500/50">{t.partner_email}</span>
                                                    </div>
                                                </td>
                                                <td className="text-xs text-muted italic">
                                                    {t.description || t.type}
                                                </td>
                                                <td className={`font-bold text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                    {isPositive ? '+' : ''}{formatMoney(t.amount)}
                                                </td>
                                            </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-muted italic">Chưa có giao dịch nào</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
