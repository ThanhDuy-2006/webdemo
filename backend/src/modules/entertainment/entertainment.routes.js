import express from 'express';

const router = express.Router();

// Simple in-memory cache for proxy requests
const proxyCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generic proxy for external entertainment APIs to bypass CORS
 * Usage: /api/entertainment/proxy?url=ENCODED_URL
 */
router.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "URL parameter is required" });
    }

    // Check Cache
    if (proxyCache.has(targetUrl)) {
        const cached = proxyCache.get(targetUrl);
        if (Date.now() < cached.expiry) {
            return res.json(cached.data);
        }
        proxyCache.delete(targetUrl);
    }

    try {
        const decodedUrl = targetUrl;
        
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': new URL(decodedUrl).origin
            },
            signal: AbortSignal.timeout(8000) // 8s timeout for external fetch
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "External API Error" });
        }

        const data = await response.json();
        
        // Save to Cache
        proxyCache.set(targetUrl, {
            data: data,
            expiry: Date.now() + CACHE_TTL
        });

        res.json(data);
    } catch (error) {
        res.status(502).json({ error: "Failed to connect to external API", details: error.message });
    }
});

/**
 * Advanced Filter Proxy
 * Priority: Genre -> Country -> Year -> Type
 */
router.get('/filter', async (req, res) => {
    try {
        const { type, genre, country, year, page = 1 } = req.query;
        let targetUrl = '';

        // Determine primary API endpoint based on priority
        if (genre) {
            targetUrl = `https://ophim1.com/v1/api/the-loai/${genre}`;
        } else if (country) {
            targetUrl = `https://ophim1.com/v1/api/quoc-gia/${country}`;
        } else if (year) {
            targetUrl = `https://ophim1.com/v1/api/nam-phat-hanh/${year}`;
        } else if (type) {
            // Mapping UI types to OPhim slugs
            const typeMap = {
                'phim-le': 'phim-le',
                'phim-bo': 'phim-bo',
                'hoat-hinh': 'hoat-hinh',
                'tv-shows': 'tv-shows',
                'chieu-rap': 'phim-chieu-rap'
            };
            const slug = typeMap[type] || type; 
            targetUrl = `https://ophim1.com/v1/api/danh-sach/${slug}`;
        } else {
            targetUrl = `https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat`;
        }

        // Add page param
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + `page=${page}`;

        console.log(`[FILTER] Priority logic chose: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': 'https://ophim1.com/',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`[FILTER] External API Error: ${response.status} for ${targetUrl}`);
            throw new Error(`OPhim API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Safety check for data structure
        if (!data || data.status !== 'success' || !data.data) {
            return res.json(data || { status: 'error', message: 'Invalid response from upstream' });
        }

        let items = data.data.items || [];
        
        // Secondary filtering by year if it wasn't the primary source
        if (year && !targetUrl.includes('nam-phat-hanh')) {
            console.log(`[FILTER] Applying secondary year filter: ${year}`);
            items = items.filter(i => String(i.year) === String(year));
        }

        // Return unified structure
        res.json({
            ...data,
            data: {
                ...data.data,
                items: items
            }
        });

    } catch (error) {
        console.error("[FILTER] Error:", error.message);
        res.status(500).json({ status: 'error', message: "Failed to perform search/filter", details: error.message });
    }
});

/**
 * Get Comic Categories
 */
router.get('/comics/categories', async (req, res) => {
    const targetUrl = 'https://otruyenapi.com/v1/api/the-loai';
    if (proxyCache.has(targetUrl)) {
        const cached = proxyCache.get(targetUrl);
        if (Date.now() < cached.expiry) return res.json(cached.data);
    }
    try {
        const response = await fetch(targetUrl);
        const data = await response.json();
        proxyCache.set(targetUrl, { data, expiry: Date.now() + CACHE_TTL });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Advanced Comics Filter
 */
router.get('/comics/filter', async (req, res) => {
    try {
        const { category, status, sort, year, type, q, page = 1 } = req.query;
        let targetUrl = '';

        // Priority Logic for OTRUYEN
        if (q) {
            targetUrl = `https://otruyenapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}`;
        } else if (category) {
            // otruyen supports single category slug
            const catSlug = category.split(',')[0]; 
            targetUrl = `https://otruyenapi.com/v1/api/the-loai/${catSlug}`;
        } else if (status) {
            // status map for otruyen lists: dang-cap-nhat, hoan-thanh, sap-ra-mat
            const statusMap = {
                'ongoing': 'dang-cap-nhat',
                'completed': 'hoan-thanh',
                'upcoming': 'sap-ra-mat'
            };
            const listSlug = statusMap[status] || 'truyen-moi';
            targetUrl = `https://otruyenapi.com/v1/api/danh-sach/${listSlug}`;
        } else if (type) {
            // mapping type to a list if possible, or search
            targetUrl = `https://otruyenapi.com/v1/api/danh-sach/truyen-moi`;
        } else {
            targetUrl = `https://otruyenapi.com/v1/api/danh-sach/truyen-moi`;
        }

        targetUrl += (targetUrl.includes('?') ? '&' : '?') + `page=${page}`;

        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) throw new Error(`OTruyen API error: ${response.status}`);
        const data = await response.json();

        if (data.status !== 'success') return res.json(data);

        let items = data.data.items || [];

        // Secondary filtering in memory for complex criteria OTRUYEN doesn't support directly
        if (status && targetUrl.includes('the-loai')) {
            items = items.filter(i => {
                if (status === 'ongoing') return i.status === 'ongoing';
                if (status === 'completed') return i.status === 'completed';
                return true;
            });
        }
        
        // Secondary multi-category filter (if user selected more than one)
        const catList = category ? category.split(',') : [];
        if (catList.length > 1 && items.length > 0) {
            items = items.filter(i => {
                const itemCats = i.category?.map(c => c.slug) || [];
                return catList.every(c => itemCats.includes(c));
            });
        }

        res.json({
            success: true,
            data: items,
            pagination: {
                page: parseInt(data.data.params?.pagination?.currentPage || page),
                totalPages: Math.ceil((data.data.params?.pagination?.totalItems || 0) / (data.data.params?.pagination?.totalItemsPerPage || 20)),
                totalItems: data.data.params?.pagination?.totalItems || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
