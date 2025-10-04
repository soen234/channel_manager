module.exports = async (req, res) => {
  // Vercel serverless function handler
  const app = require('../dist/index').default;
  return app(req, res);
};
