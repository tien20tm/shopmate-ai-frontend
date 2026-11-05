import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { shouldRetry } from "@/lib/api";
import { reportSessionStart } from "@/lib/session";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false },
  },
});

reportSessionStart();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ChatProvider>
          <App />
        </ChatProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
