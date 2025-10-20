import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseAsyncOperationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export function useAsyncOperation<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  options: UseAsyncOperationOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const execute = useCallback(
    async (...args: T): Promise<R | undefined> => {
      try {
        setLoading(true);
        setError(null);

        const result = await asyncFn(...args);

        if (onSuccess) {
          onSuccess(result);
        }

        if (showSuccessToast && successMessage) {
          toast({
            title: "Sucesso",
            description: successMessage,
          });
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro desconhecido");
        setError(error);

        if (onError) {
          onError(error);
        }

        if (showErrorToast) {
          toast({
            title: "Erro",
            description: errorMessage || error.message,
            variant: "destructive",
          });
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn, onSuccess, onError, successMessage, errorMessage, showSuccessToast, showErrorToast, toast]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    reset,
  };
}

// Hook específico para operações de formulário
export function useFormOperation<T extends Record<string, any>, R>(
  asyncFn: (data: T) => Promise<R>,
  options: UseAsyncOperationOptions & {
    resetForm?: () => void;
    closeDialog?: () => void;
  } = {}
) {
  const { resetForm, closeDialog, ...asyncOptions } = options;

  const operation = useAsyncOperation(asyncFn, {
    ...asyncOptions,
    onSuccess: (data) => {
      if (resetForm) resetForm();
      if (closeDialog) closeDialog();
      if (options.onSuccess) options.onSuccess(data);
    },
  });

  return operation;
}

// Hook para operações de confirmação
export function useConfirmOperation<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  confirmMessage: string,
  options: UseAsyncOperationOptions = {}
) {
  const operation = useAsyncOperation(asyncFn, options);

  const executeWithConfirm = useCallback(
    async (...args: T) => {
      if (window.confirm(confirmMessage)) {
        return operation.execute(...args);
      }
    },
    [operation.execute, confirmMessage]
  );

  return {
    ...operation,
    execute: executeWithConfirm,
  };
}