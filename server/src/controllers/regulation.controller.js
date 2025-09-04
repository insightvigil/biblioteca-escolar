// Regulation controller
export const getRegulation = async (_req, res) => {
  const content = process.env.BIB_REGULATION_TEXT || "Reglamento de la biblioteca (pendiente de cargar).";
  res.json({ content, updated_at: new Date().toISOString() });
};
