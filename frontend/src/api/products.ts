import { apiFetch } from "./http";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface ProductCreate {
  name: string;
  category: string;
  price: number;
  stock: number;
}

export function listProducts(category?: string): Promise<Product[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<Product[]>(`/products${query}`);
}

export function getProduct(id: number): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function createProduct(data: ProductCreate): Promise<Product> {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adjustStock(id: number, delta: number): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
  });
}
