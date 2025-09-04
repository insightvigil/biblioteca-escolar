// Error handler
export const errorHandler = (err, _req, res, _next) => {
  const code = err.status || 500;
  res.status(code).json({ error: err.message || "Internal Error" });
};
