const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
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
};

module.exports = nextConfig;
