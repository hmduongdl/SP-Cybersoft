const { PATCH } = require('./.next/server/app/api/posts/[id]/route.js');

async function test() {
  const req = new Request('http://localhost:3000/api/posts/cc930243-7045-40c4-bed1-3d783026aab9', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_archived: true })
  });
  
  const ctx = { params: Promise.resolve({ id: 'cc930243-7045-40c4-bed1-3d783026aab9' }) };
  const res = await PATCH(req, ctx);
  console.log(res.status, await res.text());
}
test();
