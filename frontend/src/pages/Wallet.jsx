
import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { useSocket } from "../context/SocketContext";
import BackButton from "../components/common/BackButton";
import { 
  BarChart, Bar, Legend, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import "./Wallet.css";

const formatMoney = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";

export function Wallet() {
  const { user } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState([]);
  const [depositRequests, setDepositRequests] = useState([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    init();
  }, []);

  // Realtime Listener
  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (data) => {
        if (data?.message) toast.success(data.message);
        init();
    };

    socket.on("walletUpdated", handleUpdate);
    socket.on("depositRejected", (data) => {
        toast.error(`Yêu cầu nạp ${formatMoney(data.amount)} đã bị từ chối. Lý do: ${data.reason}`);
        init();
    });

    return () => {
        socket.off("walletUpdated", handleUpdate);
        socket.off("depositRejected");
    };
  }, [socket]);

  const init = async () => {
      setLoading(true);
      setError(null);
      try {
          await Promise.all([loadWallet(), loadStats(), loadDepositRequests()]);
      } catch (err) {
          setError("Không thể tải thông tin ví. Vui lòng thử lại sau.");
      } finally {
          setLoading(false);
      }
  };

  const loadWallet = async () => {
    try {
        const data = await api.get("/wallets");
        setWallet(data);
    } catch (e) {
        console.error("Load wallet error:", e);
        throw e;
    }
  };

  const loadStats = async () => {
    try {
        const data = await api.get("/wallets/stats");
        setStats(data || []);
    } catch (e) {
        console.error("Load stats error:", e);
    }
  };

  const loadDepositRequests = async () => {
    try {
        const data = await api.get("/deposits/my-requests");
        setDepositRequests(data);
    } catch (e) {
        console.error("Load deposit requests error:", e);
    }
  };

  const handleDeposit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (user?.role === 'admin') {
               const rawAmount = parseInt(depositAmount.replace(/\./g, ''));
               const res = await api.post("/wallets/admin-deposit", { email: targetEmail, amount: rawAmount });
               toast.success(res.message);
               setTargetEmail("");
               setDepositAmount("");
               loadWallet();
          } else {
               const rawAmount = parseInt(depositAmount.replace(/\./g, ''));
               const formData = new FormData();
               formData.append('amount', rawAmount);
               formData.append('method', method);
               if (proof) formData.append('proof', proof);

               const res = await api.post("/deposits/request", formData);
               toast.success(res.message);
               setDepositAmount("");
               setProof(null);
               loadDepositRequests();
          }
      } catch (err) {
          toast.error(err.response?.data?.error || "Gửi yêu cầu thất bại");
      } finally {
          setLoading(false);
      }
  };

  const handleAmountChange = (e) => {
      // Remove non-numeric characters
      const rawValue = e.target.value.replace(/\D/g, "");
      // Format with thousands separator
      const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      setDepositAmount(formatted);
  };

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // --- Chart Logic ---
  const chartData = useMemo(() => {
    if (!wallet?.transactions) return { points: "", data: [] };

    const days = 7;
    const today = new Date();
    const statsArr = [];

    // Initialize last 7 days
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
        
        statsArr.push({ date: dateStr, label: dayLabel, count: 0 });
    }

    // Fill counts
    wallet.transactions.forEach(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        const stat = statsArr.find(s => s.date === txDate);
        if (stat) stat.count++;
    });

    // Scaling
    const maxCount = Math.max(...statsArr.map(s => s.count), 5);
    const width = 350;
    const height = 140;
    const paddingX = 10;
    const stepX = (width - paddingX * 2) / (days - 1);
    
    // Generate Coordinates
    const dataWithCoords = statsArr.map((s, index) => {
        const x = paddingX + index * stepX;
        const y = height - (s.count / maxCount * (height - 30)) - 10; 
        return { ...s, x, y };
    });

    const pointsStr = dataWithCoords.map(p => `${p.x},${p.y}`).join(" ");

    return { points: pointsStr, data: dataWithCoords };
  }, [wallet]);


  if (loading && !wallet) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Đang đồng bộ dữ liệu ví...</p>
      </div>
  );

  if (error) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-400">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="font-bold mb-4">{error}</p>
          <button onClick={init} className="btn btn-outline btn-error btn-sm">Thử lại</button>
      </div>
  );

  if (!wallet) return null;

  return (
    <div className="wallet-page animate-fade-in px-4 py-8">
      <BackButton fallbackPath="/" className="mb-6" />

      {/* TOP */}
      <div className="row">
        {/* BALANCE */}
        <div className="card balance">
          <span className="label">Số dư hiện tại</span>
          <h1>{formatMoney(wallet.balance)}</h1>
          <p className="muted">Cập nhật theo thời gian thực</p>
        </div>

        {/* NEW MONTHLY STATS CHART */}
        <div className="card activity flex-1 overflow-hidden min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="p-2 bg-primary/20 rounded-lg">📊</span>
                Biến động số dư
              </h3>
              <p className="text-xs text-slate-500 mt-1">30 ngày gần nhất (theo ngày)</p>
            </div>
            <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
               <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Nạp</div>
               <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Tiêu</div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={10}
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
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#8aa4ff' }}
                  formatter={(value) => [formatMoney(value), ""]}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                <Bar 
                  name="Tiền Vào"
                  dataKey="total_deposit" 
                  fill="#4f7cff" 
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={2000}
                />
                <Bar 
                  name="Tiền Ra"
                  dataKey="total_spent" 
                  fill="#ff4f7c" 
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationBegin={400}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="row">
        {/* ACTION */}
        <div className="card action">
          <h3>💳 {user?.role === 'admin' ? 'Admin nạp tiền' : 'Nạp tiền thủ công'}</h3>

            <form onSubmit={handleDeposit} encType="multipart/form-data">
                {user?.role === 'admin' && (
                    <>
                        <label>Email người nhận</label>
                        <input 
                            type="email" 
                            placeholder="duy@example.com" 
                            value={targetEmail}
                            onChange={e => setTargetEmail(e.target.value)}
                            required
                        />
                    </>
                )}

                <label>Số tiền (VND)</label>
                <div className="amount">
                    <input 
                        type="text" 
                        placeholder="100.000" 
                        value={depositAmount}
                        onChange={handleAmountChange}
                        required
                    />
                    <span>VND</span>
                </div>

                {!user || user.role !== 'admin' ? (
                    <>
                        <label>Phương thức thanh toán</label>
                        <select 
                            className="w-full bg-transparent border border-white/20 rounded-lg p-2.5 text-white mb-3"
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                        >
                            <option value="BANK_TRANSFER" className="bg-[#0b1437]">Chuyển khoản Ngân hàng</option>
                            <option value="MOMO" className="bg-[#0b1437]">Ví MoMo</option>
                            <option value="CASH" className="bg-[#0b1437]">Tiền mặt</option>
                        </select>

                        <label>Ảnh minh chứng (Bill/Hóa đơn)</label>
                        <input 
                            type="file" 
                            className="text-xs file:bg-primary file:border-none file:text-white file:rounded-md file:px-2 file:py-1 mb-4"
                            onChange={e => setProof(e.target.files[0])}
                            accept="image/*"
                        />
                    </>
                ) : null}

                <button className="primary" disabled={loading}>
                    {loading ? "Đang xử lý..." : (user?.role === 'admin' ? "Xác nhận nạp" : "Gửi yêu cầu")}
                </button>
            </form>
        </div>
      </div>

      <div className="row flex-col lg:flex-row mt-6">
        {/* DEPOSIT REQUESTS */}
        <div className="card requests flex-1 overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-4">⏳ Trạng thái yêu cầu nạp tiền</h3>
          <div className="history-scroll custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Ngày gửi</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {depositRequests.map(dr => (
                  <tr key={dr.id}>
                    <td className="text-xs">
                        {new Date(dr.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="font-bold text-blue-400">
                        {formatMoney(dr.amount)}
                    </td>
                    <td className="text-xs italic">{dr.method}</td>
                    <td>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            dr.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                            dr.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-500'
                        }`}>
                            {dr.status === 'PENDING' ? 'Chờ duyệt' : dr.status === 'APPROVED' ? 'Đã duyệt' : 'Bị từ chối'}
                        </span>
                    </td>
                  </tr>
                ))}
                {depositRequests.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-10 text-slate-500 italic">Chưa có yêu cầu nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* HISTORY */}
        <div className="card history flex-1 overflow-hidden">
          <h3>🧾 Lịch sử giao dịch</h3>
          <div className="history-scroll custom-scrollbar">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Nội dung</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map(tx => {
                     const isPositive = Number(tx.amount) >= 0;
                     return (
                        <tr key={tx.id}>
                          <td>
                              <div className="flex flex-col">
                                  <span className="text-slate-200">{new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
                              </div>
                          </td>
                          <td className="text-xs">{tx.description || tx.type}</td>
                          <td className={isPositive ? "plus" : "minus"}>
                              {isPositive ? "+" : ""}{formatMoney(tx.amount)}
                          </td>
                        </tr>
                     );
                })}
                {wallet.transactions.length === 0 && (
                    <tr>
                        <td colSpan="3" style={{textAlign: 'center', padding: '20px', color: '#9ca3af'}}>
                            Chưa có giao dịch.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
