async function test() {
    const url = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
    try {
        console.log("Testing URL:", url);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Data Status:", data.status);
            console.log("Items Count:", data.items?.length);
        } else {
            const text = await res.text();
            console.log("Error Body:", text.substring(0, 200));
        }
    } catch (e) {
        console.error("Test Error:", e.message);
    }
}
test();
