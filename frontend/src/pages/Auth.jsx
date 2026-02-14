import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="card glass">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">Đăng nhập</h2>
        {error && <div className="text-danger text-center mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Email</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2">Đăng nhập</button>
        </form>
        <div className="text-center mt-4 text-sm text-muted">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="card glass">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">Đăng ký tài khoản</h2>
        {error && <div className="text-danger text-center mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Họ tên</label>
            <input 
              className="input" 
              value={form.full_name} 
              onChange={e => setForm({...form, full_name: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Email</label>
            <input 
              type="email" 
              className="input" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Số điện thoại</label>
            <input 
              className="input" 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="input" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2">Đăng ký</button>
        </form>
        <div className="text-center mt-4 text-sm text-muted">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
