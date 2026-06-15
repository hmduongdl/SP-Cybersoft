module.exports = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx}',
        './src/components/**/*.{js,ts,jsx,tsx}',
        './src/lib/**/*.{js,ts,jsx,tsx}',
        './src/hooks/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    slate: '#0f172a',
                    slateLight: '#334155',
                    indigo: '#4338ca',
                    blue: '#3b82f6',
                    emerald: '#10b981',
                    rose: '#fb7185',
                    amber: '#f59e0b'
                }
            },
            boxShadow: {
                soft: '0 12px 30px rgba(15, 23, 42, 0.08)'
            }
        }
    },
    plugins: [],
};
