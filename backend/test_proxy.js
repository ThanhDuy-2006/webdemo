async function test() {
    const url = 'https://otruyenapi.com/v1/api/danh-sach/truyen-moi?page=1';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data Status:", data.status);
        console.log("Items Count:", data.data?.items?.length);
    } catch (e) {
        console.error("Test Error:", e.message);
    }
}
test();
