/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yallashop/ui", "@yallashop/api-client"],
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
};

module.exports = nextConfig;
