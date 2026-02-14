import os from 'os';

export function getLocalIP() {
    const addresses = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }

    // Prioritize 192.168.x.x (Common Wi-Fi)
    const preferred = addresses.find(a => a.startsWith('192.168.'));
    if (preferred) return preferred;

    // Then 10.x.x.x
    const second = addresses.find(a => a.startsWith('10.'));
    if (second) return second;

    return addresses[0] || 'localhost';
}
