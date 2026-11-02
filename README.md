# ShopMate AI Frontend

Giao diện demo hỗ trợ khách hàng của ShopMate AI: xem đơn hàng, sản phẩm, chính sách và chat với trợ lý AI. Dùng React, Vite, TypeScript, Tailwind CSS và shadcn/ui.

Frontend chỉ gọi [shopmate-ai-backend](https://github.com/tien20tm/shopmate-ai-backend) qua REST. Mọi kết luận nghiệp vụ đều đến từ backend.

## Chạy cả 2 repo ở local

Backend, trong thư mục `shopmate-ai-backend`:

```bash
cp .env.example .env      # điền OPENAI_API_KEY
make infra                # Postgres + pgvector ở port 5433
uv run alembic upgrade head
uv run python -m scripts.seed_demo
uv run python -m scripts.ingest_knowledge   # gọi OpenAI Embeddings, có tính phí
make run                  # http://localhost:8000
```

Frontend, trong thư mục này:

```bash
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

## Cấu hình

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_BASE_URL` | Địa chỉ backend. Biến này nằm trong bản build và ai cũng đọc được, nên không đặt secret ở đây. |

Khi đổi origin của frontend, cần thêm origin đó vào `CORS_ORIGINS` ở backend.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm test` | Chạy Vitest. Mọi lời gọi API đều được giả lập. |
| `npm run build` | Kiểm tra kiểu rồi build vào `dist/` |

## Kiểm tra trợ lý AI với OpenAI thật

Test tự động không gọi OpenAI, nên hãy thử các câu sau trên `/chat`:

| Câu hỏi | Kết quả mong đợi |
|---|---|
| Đơn ORD-0002 đang giao, tôi có hủy được không? | Dùng cả tra cứu đơn hàng và chính sách, có tài liệu tham khảo |
| Tôi được đổi trả trong bao lâu? | Trả lời 7 ngày từ khi giao, nguồn là chính sách đổi trả |
| Đơn ORD-0006 của tôi thế nào? | Không lộ thông tin, báo không tìm thấy đơn |
| Đơn ORD-0001 thế nào? rồi hỏi tiếp: Đơn đó hủy được không? | Lượt sau vẫn hiểu là ORD-0001 |
| Bấm "Cuộc hội thoại mới" rồi hỏi: Đơn đó hủy được không? | Không còn nhớ đơn trước |

## Giới hạn của bản demo

- Không có đăng nhập. Backend quyết định khách hàng demo, frontend không gửi `customer_id`.
- Lịch sử chat chỉ giữ trong tab hiện tại. Backend restart thì trợ lý quên ngữ cảnh dù màn hình vẫn còn tin nhắn cũ.
