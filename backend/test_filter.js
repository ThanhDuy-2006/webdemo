const fetch = require('node-fetch');

async function testFilter() {
    const urls = [
        'http://127.0.0.1:3000/api/entertainment/filter?type=phim-le',
        'http://127.0.0.1:3000/api/entertainment/filter?genre=hanh-dong',
        'http://127.0.0.1:3000/api/entertainment/filter?country=trung-quoc'
    ];

    for (const url of urls) {
        console.log(`\nTesting: ${url}`);
        try {
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            const data = await res.json();
            console.log(`Success: ${data.success}`);
            console.log(`Root Status: ${data.status}`);
            console.log(`Items count: ${data.data?.items?.length}`);
            if (data.data?.items?.length > 0) {
                console.log(`First item: ${data.data.items[0].name}`);
            }
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
}

testFilter();
