const nextConfig = {
  reactStrictMode: true,
  // Tăng giới hạn body cho Server Actions / Route Handlers lớn hơn mặc định 4MB
  // để hỗ trợ upload ảnh chụp màn hình dung lượng cao (tối đa 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'ufs.sh',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '*.facebook.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '*.imgur.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/default-avatar.jpg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/material-symbols-bootstrap.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
