import { api } from "../../../services/api";

const PROXY_URL = "/entertainment/proxy?url=";

// OTRUYEN API
const COMIC_BASE_API = "https://otruyenapi.com/v1/api";
export const COMIC_IMG_CDN = "https://img.otruyenapi.com/uploads/comics";

// OPHIM/PHIMAPI (New Source)
const MOVIE_BASE_API = "https://ophim1.com";
export const MOVIE_IMG_CDN = "https://img.ophim.live/uploads/movies/";

export const entertainmentService = {
    // COMICS
    // status can be: truyen-moi, dang-cap-nhat, hoan-thanh, sap-ra-mat
    async getComicList(page = 1, type = 'truyen-moi') {
        const url = `${COMIC_BASE_API}/danh-sach/${type}?page=${page}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    async getComicDetail(slug) {
        const url = `${COMIC_BASE_API}/truyen-tranh/${slug}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    async getComicCategories() {
        return api.get('/entertainment/comics/categories');
    },

    async filterComics(params = {}) {
        const query = new URLSearchParams(params).toString();
        return api.get(`/entertainment/comics/filter?${query}`);
    },

    async searchComics(keyword, page = 1) {
        const url = `${COMIC_BASE_API}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    async getChapterDetail(chapterApiUrl) {
        return api.get(`${PROXY_URL}${encodeURIComponent(chapterApiUrl)}`);
    },

    // MOVIES (PhimAPI integration)
    async getMovieList(page = 1) {
        // v3 is more modern and has 24 items per page
        const url = `${MOVIE_BASE_API}/danh-sach/phim-moi-cap-nhat-v3?page=${page}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    async getMovieDetail(slug) {
        const url = `${MOVIE_BASE_API}/phim/${slug}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    async searchMovies(keyword, page = 1) {
        const url = `${MOVIE_BASE_API}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
        return api.get(`${PROXY_URL}${encodeURIComponent(url)}`);
    },

    // FOLLOW
    async followComic(data) {
        return api.post('/follow/follow', data);
    },
    async unfollowComic(slug) {
        return api.delete(`/follow/unfollow/${slug}`);
    },
    async checkFollowing(slug) {
        return api.get(`/follow/is-following/${slug}`);
    },
    async getFollowingList() {
        return api.get('/follow/following');
    },
    async updateLastChapter(slug, lastChapter) {
        return api.patch(`/follow/update-chapter/${slug}`, { lastChapter });
    },
    async toggleFollowNotify(slug, enabled) {
        return api.patch(`/follow/toggle-notify/${slug}`, { enabled });
    }
};
