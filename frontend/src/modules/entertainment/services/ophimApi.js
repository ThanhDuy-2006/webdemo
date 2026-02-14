import { api } from "../../../services/api";

const PROXY_URL = "/entertainment/proxy?url=";
const DOMAINS = [
    { name: 'OPhim 1', url: "https://ophim1.com", type: 'ophim' },
    { name: 'OPhim 17', url: "https://ophim17.cc", type: 'ophim' },
    { name: 'KKPhim', url: "https://kkphim.vip", type: 'ophim' },
    { name: 'NguonC', url: "https://phim.nguonc.com", type: 'nguonc' }
];

const TTL_SHORT = 5 * 60 * 1000;
const TTL_MEDIUM = 15 * 60 * 1000;

const cache = new Map();

class MovieService {
    constructor() {
        this.activeSource = DOMAINS[0];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        return this.rotateSource();
    }

    getSources() {
        return DOMAINS;
    }

    getActiveSource() {
        return this.activeSource;
    }

    setSourceByName(name) {
        const found = DOMAINS.find(d => d.name === name);
        if (found) {
            this.activeSource = found;
            this.isInitialized = true;
            return true;
        }
        return false;
    }

    async rotateSource() {
        for (const source of DOMAINS) {
            try {
                const testUrl = source.type === 'ophim' 
                    ? `${source.url}/v1/api/the-loai` 
                    : `${source.url}/api/films/the-loai/hanh-dong`; 
                
                const fullUrl = `${PROXY_URL}${encodeURIComponent(testUrl)}`;
                const res = await api.get(fullUrl);
                
                if (res && (res.status === true || res.status === 'success')) {
                    this.activeSource = source;
                    this.isInitialized = true;
                    console.log(`[MovieService] Stabilized on: ${source.name} (${source.url})`);
                    return true;
                }
            } catch (e) {
                console.warn(`[MovieService] Source ${source.name} unreachable, skipping...`);
            }
        }
        this.activeSource = DOMAINS[0];
        return false;
    }

    /**
     * Map raw data to a standardized movie object
     */
    normalizeMovieData(raw, source) {
        if (!raw) return null;

        if (source.type === 'ophim') {
            const movie = raw.data?.item || raw.movie;
            const episodes = raw.data?.item?.episodes || raw.episodes || [];
            
            return {
                id: movie._id,
                name: movie.name,
                origin_name: movie.origin_name,
                slug: movie.slug,
                thumb_url: this.getMovieImageUrl(movie.thumb_url),
                poster_url: this.getMovieImageUrl(movie.poster_url),
                description: movie.content,
                year: movie.year,
                time: movie.time,
                lang: movie.lang,
                quality: movie.quality,
                type: movie.type,
                director: movie.director || [],
                actor: movie.actor || [],
                country: movie.country || [],
                category: movie.category || [],
                episodes: episodes.map(server => ({
                    server_name: server.server_name,
                    items: server.server_data.map(ep => ({
                        name: ep.name,
                        slug: ep.slug,
                        embed: ep.link_embed,
                        m3u8: ep.link_m3u8
                    }))
                })),
                raw_source: source.name
            };
        } else if (source.type === 'nguonc') {
            const movie = raw.movie;
            const episodes = raw.episodes || [];

            return {
                id: movie.id,
                name: movie.name,
                origin_name: movie.origin_name,
                slug: movie.slug,
                thumb_url: movie.thumb_url,
                poster_url: movie.poster_url,
                description: movie.description,
                year: movie.year,
                time: movie.time,
                lang: movie.language,
                quality: movie.quality || 'HD',
                type: movie.type,
                director: movie.director ? [movie.director] : [],
                actor: movie.casts ? movie.casts.split(',') : [],
                country: movie.country ? [{ name: movie.country }] : [],
                category: movie.category?.split(',').map(c => ({ name: c.trim() })) || [],
                episodes: episodes.map(server => ({
                    server_name: server.server_name,
                    items: server.items.map(ep => ({
                        name: ep.name,
                        slug: ep.slug,
                        embed: ep.embed,
                        m3u8: ep.m3u8
                    }))
                })),
                raw_source: source.name
            };
        }
        return raw;
    }

    /**
     * Standardize movie list responses
     */
    normalizeMovieList(raw, source) {
        if (!raw) return { items: [], pagination: {} };

        let items = [];
        let pagination = {};

        if (source.type === 'ophim') {
            // Priority 1: OPhim V1 (raw.data.items)
            // Priority 2: Raw data (raw.items or raw)
            const data = raw.data || raw;
            const rawItems = data.items || (Array.isArray(data) ? data : []);
            
            items = rawItems.map(item => ({
                id: item._id || item.id,
                name: item.name,
                origin_name: item.origin_name,
                slug: item.slug,
                thumb_url: this.getMovieImageUrl(item.thumb_url),
                poster_url: this.getMovieImageUrl(item.poster_url),
                year: item.year,
                type: item.type
            }));
            const pag = data.params?.pagination || raw.pagination || {};
            pagination = {
                ...pag,
                totalPages: pag.totalPages || Math.ceil((pag.totalItems || 0) / (pag.totalItemsPerPage || 10)) || 1
            };
        } else if (source.type === 'nguonc') {
            items = (raw.items || []).map(item => ({
                id: item.id,
                name: item.name,
                origin_name: item.origin_name,
                slug: item.slug,
                thumb_url: item.thumb_url,
                poster_url: item.poster_url,
                year: item.year,
                type: item.type
            }));
            pagination = {
                totalItems: parseInt(raw.pagination?.totalItems || 0),
                totalItemsPerPage: parseInt(raw.pagination?.totalItemsPerPage || 20),
                currentPage: parseInt(raw.pagination?.currentPage || 1),
                totalPages: Math.ceil(parseInt(raw.pagination?.totalItems || 0) / parseInt(raw.pagination?.totalItemsPerPage || 20))
            };
        }

        return { items, pagination };
    }

    async request(endpoint, params = {}, useCache = false, ttl = TTL_MEDIUM) {
        await this.initialize();

        const getTargetUrl = (source) => {
            const query = new URLSearchParams(params).toString();
            if (source.type === 'ophim') {
                return `${source.url}/v1/api${endpoint}${query ? '?' + query : ''}`;
            } else {
                let nguonCEndpoint = endpoint;
                if (endpoint === '/home' || endpoint === '/phim-moi-cap-nhat') nguonCEndpoint = '/films/phim-moi-cap-nhat';
                else if (endpoint.startsWith('/danh-sach/')) nguonCEndpoint = endpoint.replace('/danh-sach/', '/films/danh-sach/');
                else if (endpoint.startsWith('/phim/')) nguonCEndpoint = endpoint.replace('/phim/', '/film/');
                else if (endpoint.startsWith('/the-loai/')) nguonCEndpoint = endpoint.replace('/the-loai/', '/films/the-loai/');
                else if (endpoint.startsWith('/quoc-gia/')) nguonCEndpoint = endpoint.replace('/quoc-gia/', '/films/quoc-gia/');
                else if (endpoint.startsWith('/nam-phat-hanh/')) nguonCEndpoint = endpoint.replace('/nam-phat-hanh/', '/films/nam-phat-hanh/');
                else if (endpoint === '/tim-kiem') nguonCEndpoint = '/films/search';
                
                return `${source.url}/api${nguonCEndpoint}${query ? '?' + query : ''}`;
            }
        };

        const execute = async (retries = 1) => {
            const targetUrl = getTargetUrl(this.activeSource);
            
            if (useCache && cache.has(targetUrl)) {
                const entry = cache.get(targetUrl);
                if (Date.now() < entry.expiry) return entry.data;
                cache.delete(targetUrl);
            }

            try {
                const proxyCallUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
                const res = await api.get(proxyCallUrl);

                let normalizedData;
                if (endpoint.includes('/phim/') || endpoint.includes('/film/')) {
                    normalizedData = this.normalizeMovieData(res, this.activeSource);
                } else {
                    normalizedData = this.normalizeMovieList(res, this.activeSource);
                }

                const result = {
                    success: true,
                    data: normalizedData,
                    raw: res,
                    source: this.activeSource.name
                };

                if (useCache && res) {
                    cache.set(targetUrl, { data: result, expiry: Date.now() + ttl });
                }

                return result;
            } catch (err) {
                console.error(`[MovieService] Request failed: ${targetUrl}`, err);
                if (retries > 0) {
                    await this.rotateSource();
                    return execute(retries - 1);
                }
                return { success: false, error: err.message || "Lỗi kết nối server phim" };
            }
        };

        return execute();
    }

    async getHome() { return this.request('/home', {}, true, TTL_SHORT); }
    async getListBySlug(slug, page = 1) { return this.request(`/danh-sach/${slug}`, { page }, true, TTL_MEDIUM); }
    async search(keyword, page = 1) { 
        const params = this.activeSource.type === 'nguonc' ? { keyword } : { keyword, page };
        return this.request('/tim-kiem', params, false); 
    }
    async getCategories() { return this.request('/the-loai', {}, true, TTL_MEDIUM); }
    async getCountries() { return this.request('/quoc-gia', {}, true, TTL_MEDIUM); }
    async getMovieDetail(slug) { return this.request(`/phim/${slug}`, {}, false); }

    async filter(params = {}) {
        await this.initialize();
        if (this.activeSource.type === 'nguonc') {
            const { genre, country, year, page } = params;
            if (genre) return this.request(`/the-loai/${genre}`, { page }, true);
            if (country) return this.request(`/quoc-gia/${country}`, { page }, true);
            if (year) return this.request(`/nam-phat-hanh/${year}`, { page }, true);
            return this.getHome();
        }
        
        const apiParams = { ...params };
        if (apiParams.category) { apiParams.genre = apiParams.category; delete apiParams.category; }
        const query = new URLSearchParams(apiParams).toString();
        const targetUrl = `/entertainment/filter?${query}`;
        
        try {
            const res = await api.get(targetUrl);
            // Backend filter results also need list normalization
            const normalized = this.normalizeMovieList(res, { type: 'ophim' });
            return { success: true, data: normalized, source: 'proxy-filter' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    getMovieImageUrl(url) {
        if (!url) return "https://via.placeholder.com/300x450?text=No+Image";
        if (url.startsWith('http')) return url;
        const CDN = "https://img.ophim.live/uploads/movies/";
        return `${CDN}${url.replace('uploads/movies/', '')}`;
    }

    selectBestServer(episodes) {
        if (!episodes || episodes.length === 0) return null;
        return episodes.find(s => s.server_name.toUpperCase().includes('VIP')) ||
               episodes.find(s => s.server_name.includes('1')) ||
               episodes[0];
    }
}

export const ophimService = new MovieService();
