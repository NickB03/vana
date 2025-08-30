// Hook that wraps Sonner toast for compatibility
import { toast } from 'sonner'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toastFn = ({ title, description, variant }: ToastProps) => {
    if (variant === 'destructive') {
      toast.error(title || description || 'An error occurred')
    } else {
      toast.success(title || description || 'Success')
    }
  }

  return {
    toast: toastFn,
    dismiss: toast.dismiss,
  }
}

// For backward compatibility
export { toast }