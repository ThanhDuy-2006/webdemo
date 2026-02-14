import dotenv from 'dotenv';
import { getLocalIP } from './ip.js';

// Load variables from .env
dotenv.config();

// Auto-detect LAN IP for easier mobile development
if (process.env.NODE_ENV !== 'production' || !process.env.FRONTEND_URL) {
    const lanIP = getLocalIP();
    
    // If FRONTEND_URL is not set or mentions localhost or specific hardcoded IPs that vary
    // We update it to the current LAN IP to make QR codes and CORS work instantly on new Wi-Fi
    if (!process.env.FRONTEND_URL || 
        process.env.FRONTEND_URL.includes('localhost') || 
        process.env.FRONTEND_URL.includes('10.115.') ||
        process.env.FRONTEND_URL.includes('192.168.')) {
        
        process.env.FRONTEND_URL = `http://${lanIP}:5173`;
        console.log(`🌐 LAN Environment Initialized: ${process.env.FRONTEND_URL}`);
    }
}

export default process.env;
