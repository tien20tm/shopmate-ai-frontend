# ShopMate AI — Frontend ↔ Backend Integration Guidelines

**Dự án:** ShopMate AI · **Repo frontend:** `shopmate-ai-frontend` · **Repo backend:** [shopmate-ai-backend](https://github.com/tien20tm/shopmate-ai-backend)  
**Phiên bản:** MVP v1.0 · **Cập nhật:** 02/11/2026  
**Phạm vi:** Tài liệu tích hợp React frontend với FastAPI backend. **Không bao gồm code mẫu, hướng dẫn dựng UI, cấu trúc source hay hướng dẫn cài đặt thư viện.**

---

## 1. Nguyên tắc tích hợp

- Frontend chỉ giao tiếp với **một FastAPI backend** qua REST/JSON; không truy cập trực tiếp PostgreSQL, pgvector hoặc OpenAI API.
- Frontend và backend là **hai repository, hai nơi deploy độc lập**. Địa chỉ backend phải được cấu hình theo môi trường; không hardcode domain production.
- Phân tách trách nhiệm: **frontend hiển thị dữ liệu và trạng thái tương tác**, backend xử lý business logic, kiểm soát quyền xem đơn hàng, RAG và LangGraph Agent.
- MVP chỉ có **demo customer do backend xác định**. Frontend **không truyền `customer_id`** và `session_id` không được xem là cơ chế đăng nhập.
- Mọi dữ liệu chính sách, trạng thái đơn hàng và kết luận nghiệp vụ phải lấy từ kết quả API. Frontend không tự kết luận đơn có được hủy/đổi trả hay không.
- `GET` có thể tải lại khi lỗi tạm thời; **`POST /chat` không tự động retry** để tránh tạo lượt hội thoại trùng hoặc gửi nhiều lần tới LLM.

### Môi trường kết nối

| Môi trường | Frontend | Backend API |
|---|---|---|
| Local | React/Vite trên `http://localhost:5173` | FastAPI trên `http://localhost:8000` |
| Production | Cloudflare Static Hosting | HTTPS URL backend được cấu hình riêng |

Frontend phải lấy API base URL từ biến cấu hình build `VITE_API_BASE_URL`. Biến này là public, **không đặt** OpenAI key, database password hay internal service token trong frontend.

Backend cần cho phép CORS từ origin frontend đang dùng, bao gồm origin Cloudflare thực tế sau deployment.

---

## 2. Trạng thái backend cần đối chiếu trước khi tích hợp

Tại thời điểm kiểm tra **nhánh `main` công khai ngày 02/11/2026**, các điểm sau được ghi nhận. Nếu code local có thay đổi chưa push, **ưu tiên tài liệu `/docs` hoặc `/openapi.json` của backend đang chạy**.

| Hạng mục | Trạng thái trên `main` | Ghi chú FE |
|---|---|---|
| `GET /health` | Đã khai báo | Dùng kiểm tra khả năng kết nối |
| `GET /api/v1/products` | Đã khai báo | List sản phẩm; hỗ trợ `limit`, `offset` |
| `GET /api/v1/products/{product_id}` | Đã khai báo | Chi tiết sản phẩm |
| `GET /api/v1/orders` | Đã khai báo | List đơn của demo customer; hỗ trợ `limit`, `offset` |
| `GET /api/v1/orders/{order_id}` | Đã khai báo | Chi tiết đơn hàng |
| `POST /api/v1/chat` | **Bản Day 4** | Chỉ nhận `message`, trả `answer`, `sources`; chưa phải Agent contract Day 5 |
| `GET /api/v1/knowledge/documents` | **Chưa có** | Đề xuất bổ sung nếu cần Knowledge Base browser |
| `GET /api/v1/knowledge/documents/{slug}` | **Chưa có** | Đề xuất bổ sung cho trang chi tiết tài liệu |

**Hai việc backend cần rà soát:**

1. `src/main.py` trên `main` đang include Orders router hai lần; cần giữ một lần duy nhất.
2. Orders router sử dụng `settings.DEMO_CUSTOMER_ID` nhưng `src/config.py` công khai chưa khai báo setting này. Backend cần hoàn thiện cấu hình và xác nhận Orders API chạy được trước khi FE tích hợp.

**Quan trọng:** Việc endpoint được khai báo trong source không đồng nghĩa nó đã hoạt động end-to-end với database/seed data. Xác nhận bằng Swagger hoặc API thực tế.

---

## 3. Danh sách tính năng và API cần gọi

| Tính năng FE | Endpoint BE | Method | Mục đích | Ưu tiên |
|---|---|---|---|---|
| Kiểm tra kết nối | `/health` | GET | Xác minh backend đang chạy | P0 |
| Orders List | `/api/v1/orders` | GET | Danh sách đơn hàng của demo customer | P0 |
| Order Detail | `/api/v1/orders/{order_id}` | GET | Xem thông tin một đơn hàng | P0 |
| Products List | `/api/v1/products` | GET | Danh sách sản phẩm demo | P0 |
| Product Detail | `/api/v1/products/{product_id}` | GET | Xem chi tiết sản phẩm | P1 |
| AI Chat | `/api/v1/chat` | POST | Hỏi FAQ, tra cứu order, hỏi kết hợp Agent + RAG | P0 |
| Knowledge List | `/api/v1/knowledge/documents` | GET | Danh sách FAQ/Policy | P1 — BE bổ sung |
| Knowledge Detail | `/api/v1/knowledge/documents/{slug}` | GET | Nội dung tài liệu được trích dẫn | P1 — BE bổ sung |

**Phạm vi MVP ưu tiên:** Orders + Products + AI Chat. Knowledge Base chi tiết chỉ triển khai khi hai endpoint read-only được backend bổ sung; không nên coi endpoint đề xuất là đã tồn tại.

---

## 4. Quy ước dữ liệu từng API

### 4.1. Orders List

**API:** `GET /api/v1/orders`  
**Query params:** `limit` (mặc định 20, tối đa 100), `offset` (mặc định 0).

**Response hiện theo schema Day 2:** một **mảng Order**, mỗi phần tử có:

| Trường | Ý nghĩa |
|---|---|
| `id` | Mã đơn, ví dụ `ORD-0001` |
| `status` | `pending`, `processing`, `shipped`, `delivered` hoặc `cancelled` |
| `created_at` | Thời điểm tạo, định dạng ISO 8601 |
| `delivered_at` | Thời điểm giao thành công hoặc `null` |
| `items` | Danh sách dòng sản phẩm trong đơn |
| `items[].product` | Thông tin sản phẩm: `id`, `sku`, `name`, `price` |
| `items[].quantity` | Số lượng đã mua |
| `items[].unit_price` | Đơn giá tại thời điểm đặt hàng |

**FE cần xử lý:**

- Hiển thị danh sách đơn và trạng thái, phân trang bằng `limit` / `offset`.
- API hiện chưa trả `total`; đừng giả định đã có tổng số đơn. Khi số dòng trả về ít hơn `limit`, có thể coi là trang cuối.
- Tính tổng tiền từ `quantity × unit_price`, **không dùng** `product.price` hiện tại để tính lịch sử mua hàng.
- Giá decimal có thể được serialize thành chuỗi; cần định dạng hiển thị VND nhất quán.
- Nếu backend trả mảng trống: hiển thị empty state; không coi là lỗi.

### 4.2. Order Detail

**API:** `GET /api/v1/orders/{order_id}`.

Response dùng cùng cấu trúc một Order như mục 4.1. Trường hợp không tìm thấy hoặc đơn không thuộc demo customer, backend trả `404`.

**Luồng tích hợp:** Người dùng chọn một đơn → FE lấy chi tiết → hiển thị sản phẩm, thời điểm, trạng thái → có thể chọn **“Hỏi AI về đơn này”**. Khi chuyển sang Chat, chỉ đưa **mã đơn** vào câu hỏi gợi ý; Agent vẫn phải tự dùng Order Tool để kiểm tra trạng thái.

### 4.3. Products List và Detail

- `GET /api/v1/products`: trả một mảng sản phẩm, hỗ trợ `limit` / `offset` tương tự Orders.
- `GET /api/v1/products/{product_id}`: trả chi tiết một sản phẩm; `404` nếu không có.
- Thông tin sản phẩm gồm `id`, `sku`, `name`, `price`.
- MVP chỉ xem sản phẩm, **không có** giỏ hàng, thanh toán hoặc thao tác sửa dữ liệu.

### 4.4. AI Chat — contract mục tiêu Day 5

**API:** `POST /api/v1/chat`.

**Request mục tiêu:**

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `session_id` | Có | ID ổn định cho cùng một cuộc hội thoại, tối đa 64 ký tự; chỉ chữ, số, `-`, `_` theo hướng dẫn Day 5 |
| `message` | Có | Câu hỏi tiếng Việt, không rỗng; tối đa 2.000 ký tự |

**Response mục tiêu:**

| Trường | Mô tả | FE hiển thị |
|---|---|---|
| `answer` | Nội dung trả lời của Agent | Chat bubble của AI |
| `sources` | Các tài liệu mà RAG đã truy xuất | Danh sách nguồn gắn dưới câu trả lời |
| `sources[].document_id` | ID tài liệu nguồn | Dùng để liên kết sang Knowledge Detail khi BE có API |
| `sources[].title` | Tiêu đề tài liệu | Nhãn nguồn |
| `sources[].chunk_index` | Vị trí đoạn tài liệu | Dùng debug / đối chiếu |
| `sources[].similarity` | Điểm tương đồng vector | Chỉ hiện ở chế độ debug nếu cần |
| `tools_used` | Tên các tools đã thực thi trong lượt hỏi | Nhãn Agent Debug |

**Tool names dự kiến:** `search_knowledge_base`, `get_order_status`.

**Chú ý tính tương thích:** Chat API hiện trên nhánh `main` vẫn theo **Day 4**, chỉ nhận `message`, trả `answer` và `sources` (có thêm `ref`), chưa có `session_id` hay `tools_used`. Chốt và cập nhật backend theo Day 5 **trước khi** triển khai session memory thật trên FE. Không gửi payload Day 5 vào API Day 4 rồi kỳ vọng Agent hoạt động.

**Nguồn RAG:** `sources` ở Day 5 là các đoạn đã được tool truy xuất, **chưa phải bằng chứng xác minh tuyệt đối cho từng câu trong answer**. FE nên ghi “Tài liệu tham khảo”, không ghi “Đã xác minh”.

### 4.5. Knowledge Base — API cần bổ sung

Nếu muốn người dùng mở và đọc tài liệu FAQ/Policy được Agent viện dẫn, cần thống nhất hai endpoint read-only:

- `GET /api/v1/knowledge/documents`: trả danh sách gồm `slug`, `document_id`, `title`, `doc_type` (`faq`/`policy`), `preview`.
- `GET /api/v1/knowledge/documents/{slug}`: trả một tài liệu gồm `slug`, `document_id`, `title`, `doc_type`, `content`.

**Yêu cầu thống nhất với BE:**

- `document_id` khớp với `sources[].document_id` từ Chat API.
- `slug` là định danh URL-safe để FE mở trang chi tiết.
- Nội dung ưu tiên lấy từ Markdown nguồn gốc, tránh ghép các chunks có overlap khiến nội dung trùng lặp.
- Không cần upload, edit, delete hoặc admin CMS trong MVP.

Nếu BE chưa bổ sung hai endpoints, **không gọi chúng từ bản FE release**. Có thể ẩn Knowledge Base hoặc đánh dấu rõ nội dung mock chỉ để thiết kế giao diện.

---

## 5. Luồng tích hợp quan trọng

### Luồng A — Xem đơn hàng và hỏi AI

1. FE tải Orders List từ backend.
2. Người dùng mở Order Detail; FE gọi API chi tiết bằng mã đơn.
3. Người dùng chọn **Hỏi AI về đơn này**.
4. FE điều hướng sang Chat, kèm mã đơn trong câu hỏi gợi ý.
5. Người dùng gửi câu hỏi → FE gọi Chat API.
6. Backend Agent gọi `get_order_status` và, nếu cần, `search_knowledge_base`.
7. FE hiển thị `answer`, `tools_used` và `sources` từ response.

**Không lấy status đang hiển thị ở Orders Detail làm “sự thật” đưa trực tiếp vào kết luận của Agent.** Kết quả từ backend mới là dữ liệu nghiệp vụ hiện tại.

### Luồng B — Hỏi FAQ hoặc chính sách

1. Người dùng nhập câu hỏi về giao hàng, hủy đơn, hoàn tiền, đổi trả hoặc bảo hành.
2. FE gửi tới Chat API.
3. Backend Agent truy xuất knowledge qua RAG tool.
4. FE hiển thị câu trả lời và tiêu đề tài liệu tham khảo.
5. Nếu có Knowledge Detail API, người dùng có thể mở tài liệu liên quan từ `document_id`.

### Luồng C — Multi-turn conversation / Session Memory

1. FE tạo một `session_id` cho cuộc trò chuyện mới.
2. Mọi câu hỏi tiếp theo trong cùng cuộc trò chuyện sử dụng **cùng `session_id`**.
3. Backend LangGraph giữ lịch sử theo session/thread; FE vẫn giữ các message để hiển thị.
4. Khi người dùng chọn **Cuộc hội thoại mới**, FE xóa lịch sử trên màn hình và tạo `session_id` mới.
5. Không giả định chat history sẽ tự khôi phục sau reload/trình duyệt đóng: MVP chưa có API đọc history, và memory Day 5 dùng `InMemorySaver` (mất khi BE restart).

**Quy ước UX:** Khi đang chờ một câu trả lời, chặn gửi thêm trong cùng session để tránh hai request cạnh tranh trên một thread. Nếu cần reload, FE có thể giữ session ID trong tab để tiếp tục nhưng không thể tự đồng bộ đầy đủ lịch sử đã lưu phía BE.

---

## 6. Loading, Error Handling và UX khi gọi API

| Tình huống | Cách xử lý phía FE |
|---|---|
| Đang tải Orders/Products | Hiển thị loading/skeleton |
| Danh sách rỗng | Empty state, không báo lỗi |
| `404` ở Order/Product Detail | Hiển thị “Không tìm thấy dữ liệu” |
| `422` ở Chat | Kiểm tra input, hiển thị validation message; không gửi message rỗng |
| Network error / backend sleep | Thông báo backend chưa sẵn sàng, cho retry thủ công |
| `502`/`503`/`504` hoặc timeout Chat | Giữ nội dung câu hỏi, hiển thị lỗi, cho người dùng gửi lại thủ công |
| `sources` rỗng | Không hiển thị nhãn tài liệu giả |
| `tools_used` rỗng hoặc chưa có | Ẩn Agent Debug; không tự suy đoán tools |
| Backend trả cấu trúc khác contract | Báo lỗi tích hợp và kiểm tra OpenAPI, không silently fabricate dữ liệu |

Các thông báo lỗi trả về cho người dùng nên ngắn gọn, bằng tiếng Việt. Không hiển thị traceback, API key, SQL hay các chi tiết nội bộ.

---

## 7. Quy ước dữ liệu và bảo mật

- Dùng ISO 8601 cho ngày giờ; FE định dạng hiển thị theo múi giờ người dùng.
- Giá tiền có thể được trả bằng chuỗi decimal; hiển thị VND nhất quán.
- Không giả định một `Order` có trường `total` hay `customer_name` nếu schema chưa cung cấp.
- `session_id` chỉ là khóa hội thoại, **không chứng minh danh tính người dùng**.
- Không nhận `customer_id` từ browser làm điều kiện kiểm soát quyền. Backend phải lọc order theo demo customer / user context tin cậy.
- Không gửi secrets trong header hoặc environment public của frontend.
- Không render HTML thô từ câu trả lời LLM hoặc tài liệu RAG.
- Không tự động gửi lại Chat POST khi timeout vì backend có thể đã xử lý request dù FE chưa nhận response.

---

## 8. Thứ tự tích hợp được khuyến nghị

| Giai đoạn | Việc cần làm | Điều kiện hoàn thành |
|---|---|---|
| 1. Backend readiness | Xác nhận `/health`, `/docs`, CORS, API base URL | FE gọi được một GET request thành công |
| 2. Orders | List, Detail, trạng thái và order items | `ORD-0001` hiển thị đúng; `ORD-0006` không lộ cho demo customer 1 |
| 3. Products | List và optional Detail | Dữ liệu hiện đúng SKU/tên/giá |
| 4. Chat API | Kết nối Chat contract Day 5 | Trả `answer`, `sources`, `tools_used` |
| 5. Memory | Gửi cùng session ID ở nhiều lượt chat | Câu hỏi tiếp theo hiểu đúng mã đơn trước đó |
| 6. Knowledge (tùy tiến độ BE) | List / Detail và link từ Chat Sources | Mở đúng tài liệu bằng `document_id` |
| 7. Deploy | Kết nối Cloudflare FE → HTTPS BE | Không lỗi CORS, không lộ secrets, demo chạy end-to-end |

---

## 9. Backend readiness checklist

Trước khi coi frontend tích hợp xong, backend cần xác nhận:

- [ ] Backend chạy và truy cập được `/health`, `/docs`.
- [ ] Products List/Detail API trả dữ liệu demo hợp lệ.
- [ ] Orders List/Detail API trả dữ liệu demo hợp lệ và filter theo `DEMO_CUSTOMER_ID`.
- [ ] Bỏ include Orders router bị trùng trong `main.py`.
- [ ] Khai báo `DEMO_CUSTOMER_ID` trong backend settings.
- [ ] Chat API đã nâng cấp lên Day 5: nhận `session_id`, `message`; trả `answer`, `sources`, `tools_used`.
- [ ] Agent kết hợp được Order Tool và Knowledge Tool cho câu hỏi về điều kiện hủy đơn.
- [ ] CORS cho phép origin của FE local và production.
- [ ] (Tùy chọn) Knowledge List/Detail endpoints đã sẵn sàng nếu muốn duyệt tài liệu trên FE.

## 10. Frontend integration acceptance checklist

- [ ] FE kết nối backend thành công qua base URL môi trường.
- [ ] Trang Orders tải danh sách, phân trang và mở chi tiết được.
- [ ] Trang Products tải đúng dữ liệu.
- [ ] AI Chat gửi câu hỏi và hiển thị câu trả lời tiếng Việt.
- [ ] Chat hiển thị nguồn RAG khi BE cung cấp.
- [ ] Chat hiển thị tools đã thực thi khi BE cung cấp.
- [ ] Hai câu hỏi liên tiếp cùng session giữ đúng ngữ cảnh.
- [ ] Tạo cuộc hội thoại mới không dùng nhầm history cũ.
- [ ] Màn hình không tiết lộ order không thuộc demo customer.
- [ ] Các trạng thái loading, empty, 404, validation và timeout được xử lý.
- [ ] Không có OpenAI API key hoặc database credentials trong build frontend.
- [ ] Bản deploy frontend gọi đúng backend HTTPS URL và không gặp lỗi CORS.

---

## 11. Nguồn đối chiếu backend

- Repo backend: https://github.com/tien20tm/shopmate-ai-backend
- Router Chat: https://github.com/tien20tm/shopmate-ai-backend/blob/main/src/chat/router.py
- Chat schemas: https://github.com/tien20tm/shopmate-ai-backend/blob/main/src/chat/schemas.py
- Router Orders: https://github.com/tien20tm/shopmate-ai-backend/blob/main/src/orders/router.py
- Router Products: https://github.com/tien20tm/shopmate-ai-backend/blob/main/src/products/router.py
- Backend entrypoint: https://github.com/tien20tm/shopmate-ai-backend/blob/main/src/main.py

**Tài liệu này là hướng dẫn tích hợp API, không phải spec UI hay implementation code.** Khi contract backend thay đổi, nên cập nhật mục API và kiểm tra lại OpenAPI trước khi sửa client.
