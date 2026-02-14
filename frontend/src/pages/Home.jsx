
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user } = useAuth();
  
  return (
    <div className="animate-fade-in">
      <section className="hero pt-10">
        <div className="hero-content animate-slide-up">
          <span className="badge">Chợ cư dân nội bộ</span>
          <h1>House <span>Marketplace</span></h1>
          <p className="max-w-3xl mx-auto">
            Nền tảng mua bán an toàn trong cộng đồng nhà bạn.  
            Kết nối nhanh – Giao dịch minh bạch – Bảo mật cao.
          </p>
          <div className="hero-actions">
            <Link to="/houses" className="btn-primary-custom no-underline hover:text-white shadow-xl shadow-primary/20">Vào chợ ngay</Link>
            {!user && (
              <Link to="/register" className="btn-secondary-custom no-underline hover:text-white border-white/10">Đăng ký ngay</Link>
            )}
          </div>
        </div>
      </section>
{/* icon ở trang chủ */}
      <section className="features">
        <div className="feature-card">
          <div className="icon">🏘️</div>
          <h3>Cộng Đồng Nhà</h3>
          <p>Kết nối cư dân cùng khu, tăng độ tin cậy và an toàn.</p>
        </div>
        <div className="feature-card">
          <div className="icon">🛒</div>
          <h3>Mua Bán Dễ Dàng</h3>
          <p>Đăng bán, tìm kiếm và trao đổi chỉ trong vài giây.</p>
        </div>
        <div className="feature-card">
          <div className="icon">🔒</div>
          <h3>An Toàn & Minh Bạch</h3>
          <p>Ví điện tử tích hợp, lịch sử giao dịch rõ ràng.</p>
        </div>
      </section>

      {/* Scrolling Carousel */}
      {/* Card Showcase ảnh động ở trang chủ */}
      <section className="showcase-section">
        <div className="showcase-body">
          <div className="showcase-card">
            <img src="https://wellavn.com/wp-content/uploads/2025/09/anh-gai-xinh-facebook-1.jpg" alt="Showcase 1" />
          </div>
          <div className="showcase-card">
            <img src="https://wellavn.com/wp-content/uploads/2025/09/anh-gai-xinh-facebook-4.jpg" alt="Showcase 2" />
          </div>
          <div className="showcase-card">
            <img src="https://wellavn.com/wp-content/uploads/2025/09/anh-gai-xinh-facebook-5.jpg" alt="Showcase 3" />
          </div>
          <div className="showcase-card">
            <img src="https://cdn.hnou.edu.vn/wp-content/uploads/2025/10/hinh-gai-xinh-cute-1.jpg" alt="Showcase 4" />
          </div>
          <div className="showcase-card">
            <img src="https://www.in.pro.vn/wp-content/uploads/2025/01/anh-gai-xinh-2k6-voi-phong-cach-de-thuong.webp" alt="Showcase 5" />
          </div>
        </div>
      </section>



      {/* Re-integrated Features Grid for Quick Access if user logged in? 
          Optional: Keep existing feature grid below or replace entirely. 
          User asked to "replace current content with the Hero and Features sections from the provided HTML".
          So I will just stick to the provided template for now.
      */}
    </div>
  );
}
