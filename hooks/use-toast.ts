import { useState, useCallback } from "react";
import type { ToastType } from "@/components/segtec/Toast";

export function useToast() {
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
