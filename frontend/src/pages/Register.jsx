import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../components/common/BackButton";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
      full_name: "",
      email: "",
      password: "",
      phone: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
      const { email, password, phone, full_name } = formData;
      if (!full_name) return "Vui lòng nhập họ tên.";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return "Email không hợp lệ.";

      // Phone is optional: only validate if the user has entered something
      if (phone && phone.trim().length > 0 && phone.trim().length < 10) {
          return "Số điện thoại không hợp lệ (cần ít nhất 10 số).";
      }
      
      if (password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";

      return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valError = validate();
    if (valError) {
        setError(valError);
        return;
    }

    try {
      setError("");
      await register(formData);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Lỗi kết nối server");
    }
  };

  if (success) {
      return (
          <div className="register-page">
              <div className="auth-box" style={{textAlign: 'center'}}>
                  <div style={{fontSize: '60px', marginBottom: '20px'}}>✅</div>
                  <h1>Đăng ký thành công!</h1>
                  <p className="sub">Đang chuyển hướng đến trang đăng nhập...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="auth-wrapper p-4">
        <div className="auth-container">
            <div className="auth-box relative">
                <BackButton fallbackPath="/" className="!absolute left-0 -top-10 !bg-transparent hover:!bg-white/10 text-white shadow-none" label="Về trang chủ" />
                <h1>Tạo Tài Khoản</h1>
                <p className="sub">Nhập thông tin của bạn bên dưới để tạo tài khoản</p>



                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="error-msg">{error}</div>}

                    <label>Họ và Tên</label>
                    <input 
                        type="text" 
                        placeholder="Nguyễn Văn A"
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />

                    <label>Email</label>
                    <input 
                        type="email" 
                        placeholder="m@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />

                    <label>Số điện thoại</label>
                    <input 
                        type="text" 
                        placeholder="0912345678"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />

                    <label>Mật khẩu</label>
                    <input 
                        type="password" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />

                    <button className="submit-btn">Đăng ký</button>
                </form>

                <div className="auth-link">
                    Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                </div>
            </div>
        </div>
    </div>
  );
}
