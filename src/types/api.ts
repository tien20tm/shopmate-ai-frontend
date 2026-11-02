export interface Product {
  id: number;
  sku: string;
  name: string;
  price: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  unit_price: string;
}

export interface Order {
  id: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  items: OrderItem[];
}

export interface ChatSource {
  document_id: string;
  title: string;
  chunk_index: number;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  tools_used: string[];
}

export interface KnowledgeDocumentSummary {
  slug: string;
  document_id: string;
  title: string;
  doc_type: string;
  preview: string;
}

export interface KnowledgeDocument {
  slug: string;
  document_id: string;
  title: string;
  doc_type: string;
  content: string;
}
