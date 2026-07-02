const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const post = await prisma.post.findFirst();
    if (!post) {
        console.log("No post found");
        return;
    }
    console.log("Found post:", post.id, post.is_archived);
    
    const res = await fetch(`http://localhost:3000/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Cookie": "..." // I don't have the auth cookie, so this will return 401
        },
        body: JSON.stringify({ is_archived: !post.is_archived })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}
main();
