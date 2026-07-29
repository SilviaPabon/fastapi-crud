import { apiFetch } from "./http";

export interface Item {
  id: number;
  name: string;
}

export function listItems(): Promise<Item[]> {
  return apiFetch<Item[]>("/resources");
}

export function createItem(name: string): Promise<Item> {
  return apiFetch<Item>("/resources", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
