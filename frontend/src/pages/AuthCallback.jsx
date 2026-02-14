
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
        // Authenticated via cookies. Just go home.
        // We use window.location.href to force a full reload and trigger checkUser in AuthProvider
        window.location.href = "/"; 
    } else {
        const error = searchParams.get("error") || "auth_failed";
        navigate(`/login?error=${error}`);
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin text-blue-500">🌀</div>
        <h2 className="text-xl font-semibold">Đang xác thực...</h2>
        <p className="text-slate-400 mt-2">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
}
