/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist ships as .mjs; webpack's default strict-ESM handling breaks its
    // interop ("Object.defineProperty called on non-object"). Treat node_modules
    // .mjs as auto so react-pdf / pdfjs bundle correctly.
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    // pdfjs optionally requires the Node "canvas" package; not needed in the browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
