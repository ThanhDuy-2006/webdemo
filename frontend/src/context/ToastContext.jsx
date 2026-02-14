import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmConfig, setConfirmConfig] = useState(null);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmConfig({
                message,
                resolve,
                title: options.title || "Xác nhận",
                confirmLabel: options.confirmLabel || "Đồng ý",
                cancelLabel: options.cancelLabel || "Hủy"
            });
        });
    }, []);

    const handleConfirmClose = (result) => {
        if (confirmConfig) {
            confirmConfig.resolve(result);
            setConfirmConfig(null);
        }
    };

    const success = (msg, dur) => showToast(msg, 'success', dur);
    const error = (msg, dur) => showToast(msg, 'error', dur);
    const info = (msg, dur) => showToast(msg, 'info', dur);
    const warn = (msg, dur) => showToast(msg, 'warn', dur);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warn, confirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmConfig && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleConfirmClose(false)}></div>
                    <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
                        <div className="flex items-center gap-3 mb-4 text-white">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <AlertTriangle className="text-blue-400" size={24} />
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tight">{confirmConfig.title}</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">{confirmConfig.message}</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleConfirmClose(false)}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-white/5"
                            >
                                {confirmConfig.cancelLabel}
                            </button>
                            <button 
                                onClick={() => handleConfirmClose(true)}
                                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                {confirmConfig.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onClose }) => {
    const icons = {
        success: <CheckCircle className="text-emerald-400" size={20} />,
        error: <AlertCircle className="text-rose-400" size={20} />,
        info: <Info className="text-blue-400" size={20} />,
        warn: <AlertTriangle className="text-amber-400" size={20} />,
    };

    const colors = {
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-50',
        error: 'border-rose-500/20 bg-rose-500/10 text-rose-50',
        info: 'border-blue-500/20 bg-blue-500/10 text-blue-50',
        warn: 'border-amber-500/20 bg-amber-500/10 text-amber-50',
    };

    return (
        <div className={`
            flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl 
            animate-slide-in-right pointer-events-auto min-w-[300px] max-w-md
            ${colors[toast.type]}
        `}>
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 font-bold text-sm leading-relaxed">{toast.message}</div>
            <button 
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
                <X size={16} className="opacity-50" />
            </button>
        </div>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
