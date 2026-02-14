export const getFingerprint = (req) => {
    // Simple fingerprint based on User-Agent and IP (can be more complex)
    const ua = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    return `${ua}-${ip}`;
};
