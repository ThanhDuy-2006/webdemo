import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ fallbackPath = '/', className = '', label = 'Quay lại' }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(fallbackPath);
        }
    };

    return (
        <button 
            onClick={handleBack}
            className={`
                inline-flex items-center gap-2 
                px-3 py-2 rounded-xl 
                text-slate-500 hover:text-white 
                bg-transparent hover:bg-white/5 
                transition-all duration-200 
                group
                ${className}
            `}
            aria-label="Go back"
        >
            <div className="p-1 rounded-full group-hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="font-bold text-sm hidden sm:inline-block uppercase tracking-wider">
                {label}
            </span>
        </button>
    );
};

export default BackButton;
