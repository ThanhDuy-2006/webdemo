import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import BackButton from "../components/common/BackButton";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      if (res.token) {
          // Auto redirect for dev convenience
          navigate(`/reset-password?token=${res.token}`);
      } else {
          setMessage(res.message);
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper p-4">
      <div className="card glass p-8 animate-slide-up">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Quên Mật Khẩu?</h2>
        <p className="text-center text-slate-400 mb-6 text-sm">
            Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
        </p>

        {message ? (
            <div className="bg-green-500/20 text-green-200 p-4 rounded-xl text-center mb-6 border border-green-500/30">
                <div className="text-xl mb-2">✅</div>
                {message}
                <div className="mt-4">
                    <Link to="/login" className="btn btn-sm btn-ghost">Quay lại đăng nhập</Link>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded text-center">{error}</div>}
                
                <div>
                    <label className="text-muted text-sm mb-1 block">Email</label>
                    <input 
                        type="email" 
                        className="input" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        placeholder="name@example.com"
                    />
                </div>

                <button 
                    type="submit" 
                    className={`btn btn-primary mt-2 py-3 ${loading ? 'loading' : ''}`}
                    disabled={loading}
                >
                    {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                </button>

                <div className="text-center mt-4 flex justify-center">
                    <BackButton fallbackPath="/login" label="Quay lại Đăng nhập" className="!bg-transparent hover:!bg-white/5 !border-none text-slate-400 font-normal shadow-none" />
                </div>
            </form>
        )}
      </div>
    </div>
  );
}
