import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import BackButton from "../components/common/BackButton";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css";

// Google Icon Component


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { login } = useAuth();
  
  // Detect if running on a local IP or localhost to allow captcha bypass
  const isLocalHost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      // Shake animation Logic can be added here
      const card = document.querySelector('.login-card');
      if(card) {
          card.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => card.style.animation = '', 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-body">
        <div className="login-container">
            <div className="login-card">
                <BackButton fallbackPath="/" label="Về trang chủ" className="!absolute left-4 top-4 !bg-transparent hover:!bg-slate-200/20 shadow-none text-slate-500" />
                {!success ? (
                    <>
                        <div className="login-header">
                            <h2>Chào mừng trở lại</h2>
                            <p>Đăng nhập vào tài khoản của bạn</p>
                        </div>
                        
                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            <div className={`form-group ${error ? 'error' : ''}`}>
                                <div className="input-wrapper">
                                    <input 
                                        type="text" 
                                        id="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                        autoComplete="username" 
                                        placeholder=" "
                                    />
                                    <label htmlFor="email">Email hoặc Số điện thoại</label>
                                    <span className="focus-border"></span>
                                </div>
                            </div>

                            <div className={`form-group ${error ? 'error' : ''}`}>
                                <div className="input-wrapper password-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        id="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required 
                                        autoComplete="current-password"
                                        placeholder=" "
                                    />
                                    <label htmlFor="password">Password</label>
                                    <button 
                                        type="button" 
                                        className="password-toggle" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                    <span className="focus-border"></span>
                                </div>
                                {error && <span className="error-message show">{error}</span>}
                            </div>

                            <div className="form-options">
                                <label className="remember-wrapper">
                                    <input type="checkbox" id="remember" name="remember" />
                                    <span className="checkbox-label">
                                        <span className="checkmark"></span>
                                        Ghi nhớ đăng nhập
                                    </span>
                                </label>
                                <Link to="/forgot-password" className="forgot-password">Quên mật khẩu?</Link>
                            </div>

                            <button 
                                type="submit" 
                                className={`login-btn btn ${isLoading ? 'loading' : ''}`} 
                                disabled={isLoading}
                            >
                                <span className="btn-text">Đăng Nhập</span>
                                <span className="btn-loader"></span>
                            </button>

                            <div className="text-center mt-4">
                                <Link to="/forgot-password" style={{fontSize: '13px', color: '#94a3b8', textDecoration: 'none'}}>Quên mật khẩu?</Link>
                            </div>
                        </form>



                        <div className="signup-link">
                            <p>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
                        </div>
                    </>
                ) : (
                    <div className="success-message show">
                        <div className="success-icon">✓</div>
                        <h3>Đăng nhập thành công!</h3>
                        <p>Đang chuyển hướng...</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
