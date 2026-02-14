const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3000/api/products/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: [] })
        });
        console.log('Status:', res.status);
        console.log('Headers:', res.headers.get('content-type'));
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
