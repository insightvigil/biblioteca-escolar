// Book model
export const BookShape = {
  id: Number,
  title: String,
  author: String,
  isbn10: String,
  isbn13: String,
  editorial: String,
  volume: String,   // volumen / tomo
  pages: Number,
  language: String,
  synopsis: String,
  coverUrl: String, // portada
  shelf: String,    // estante físico
  level: String,    // nivel físico
  stock: Number,
  category_id: Number,
  category: Object, // expand=category
};

// Category model
export const CategoryShape = {
  id: Number,
  name: String,
};
