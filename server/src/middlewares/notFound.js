// Not found handler
export const notFound = (_req, res) => res.status(404).json({ error: "Ruta no encontrada" });
