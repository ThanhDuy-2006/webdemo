import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import BackButton from "../components/common/BackButton";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
        setError("Token không hợp lệ hoặc thiếu.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp!");
        return;
    }
    if (newPassword.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/reset-password", { 
          token, 
          new_password: newPassword 
      });
      setMessage(res.message);
      // Auto redirect after success? Or just show link.
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
      return (
        <div className="max-w-md mx-auto mt-20 p-4 text-center">
            <div className="card glass p-8">
                <h2 className="text-xl font-bold text-red-400 mb-4">Lỗi Xác Thực</h2>
                <p className="text-slate-400 mb-6">Link đặt lại mật khẩu không hợp lệ hoặc bị thiếu.</p>
                <Link to="/forgot-password" className="btn btn-primary">Gửi lại yêu cầu</Link>
            </div>
        </div>
      );
  }

  return (
    <div className="auth-wrapper p-4">
      <div className="card glass p-8 animate-slide-up">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Đặt Lại Mật Khẩu</h2>

        {message ? (
            <div className="bg-green-500/20 text-green-200 p-4 rounded-xl text-center mb-6 border border-green-500/30">
                <div className="text-xl mb-2">🎉</div>
                <div className="font-bold mb-2">Thành công!</div>
                {message}
                <div className="mt-6">
                    <Link to="/login" className="btn btn-primary w-full">Đăng Nhập Ngay</Link>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded text-center">{error}</div>}
                
                <div>
                    <label className="text-muted text-sm mb-1 block">Mật khẩu mới</label>
                    <input 
                        type="password" 
                        className="input" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        required 
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label className="text-muted text-sm mb-1 block">Nhập lại mật khẩu mới</label>
                    <input 
                        type="password" 
                        className="input" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        required 
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    className={`btn btn-primary mt-4 py-3 ${loading ? 'loading' : ''}`}
                    disabled={loading}
                >
                    {loading ? 'Đang xử lý...' : 'Xác Nhận Đổi Mật Khẩu'}
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
