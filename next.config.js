module.exports = {
  trailingSlash: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true, // Allow build to proceed with warnings
  },
  typescript: {
    // Disable TypeScript checking during build if you're not using TypeScript
    ignoreBuildErrors: true,
  },
  webpack(config, { isServer }) {
    // Ignore Node.js built-in modules in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        child_process: false,
      };
    }

    config.module.rules.push({
      test: /\.(ttf|eot|woff|woff2)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      ],
    });

    config.module.rules.push({
      test: /\.(ttf|eot|woff|woff2)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      ],
    });


    return config;
  },
  images: {
    domains: ['niwtiaalvvivyjqtgznw.supabase.co'], // Add your Supabase URL here
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};