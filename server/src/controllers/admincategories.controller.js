import { pool } from "../db/pool.js"
import { toNull, toIntOrNull } from '../utils/sql-helpers.js';

// controllers/categories.controller.js

export const getCategoriesWithCount = async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(b.id) AS book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `
    const { rows } = await pool.query(sql)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener categorías' })
  }
}


// Obtener una categoría específica con conteo de libros
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(b.id) AS book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id;
    `

    const { rows } = await pool.query(sql, [id])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('Error al obtener categoría:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// LIST (para poblar el select del BookForm)
export const listCategories = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description
       FROM public.categories
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al listar categorías' });
  }
};



// CREATE
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO public.categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description`,
      [toNull(name), toNull(description)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al crear categoría' });
  }
};

// UPDATE (sobrescribe con lo que llegue; si falta → NULL)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE public.categories
       SET name=$1, description=$2
       WHERE id=$3
       RETURNING id, name, description`,
      [toNull(name), toNull(description), id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al actualizar categoría' });
  }
};

// DELETE
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `DELETE FROM public.categories WHERE id=$1 RETURNING id`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json({ id: rows[0].id, deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al eliminar categoría' });
  }
};