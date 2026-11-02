import { Link } from "react-router-dom";

import { EmptyState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <EmptyState>
      <p className="mb-4 font-medium">Không tìm thấy trang này.</p>
      <Button variant="outline" asChild>
        <Link to="/orders">Về danh sách đơn hàng</Link>
      </Button>
    </EmptyState>
  );
}
