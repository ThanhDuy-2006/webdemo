
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Paintbrush, X, Check } from 'lucide-react';

export function ThemeCustomizer() {
    const { user } = useAuth();
    const { theme, saveTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [tempTheme, setTempTheme] = useState(theme);

    if (!user) return null;

    const handleChange = (key, value) => {
        setTempTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        saveTheme(tempTheme);
        setIsOpen(false);
    };

    const handleReset = () => {
        setTempTheme({
            primary: '#4f7cff',
            secondary: '#7c9dff',
            background: '#0b1020',
            text: '#e5e7eb'
        });
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isOpen && (
                <button 
                    onClick={() => { setTempTheme(theme); setIsOpen(true); }}
                    className="p-3 rounded-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 backdrop-blur transition-all shadow-lg hover:shadow-primary/50"
                    title="Tùy chỉnh giao diện"
                >
                    <Paintbrush size={24} />
                </button>
            )}

            {isOpen && (
                <div className="bg-[#161329]/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl w-72 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Paintbrush size={16} /> Giao diện
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Màu chủ đạo (Primary)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={tempTheme.primary}
                                    onChange={(e) => handleChange('primary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <input 
                                    type="text" 
                                    value={tempTheme.primary}
                                    onChange={(e) => handleChange('primary', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Màu phụ (Secondary)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={tempTheme.secondary}
                                    onChange={(e) => handleChange('secondary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <input 
                                    type="text" 
                                    value={tempTheme.secondary}
                                    onChange={(e) => handleChange('secondary', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Màu nền (Background)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={tempTheme.background}
                                    onChange={(e) => handleChange('background', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <input 
                                    type="text" 
                                    value={tempTheme.background}
                                    onChange={(e) => handleChange('background', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={handleReset}
                                className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-white transition-colors"
                            >
                                Mặc định
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-1 px-3 py-2 bg-primary hover:opacity-90 rounded text-xs text-primary-foreground font-bold transition-colors flex items-center justify-center gap-1"
                            >
                                <Check size={14} /> Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
