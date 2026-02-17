"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PublicFormConfig } from "@/types";
import DynamicForm from "@/components/public/DynamicForm";

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [formConfig, setFormConfig] = useState<PublicFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch(`/api/v1/public/forms/${token}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setFormConfig(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            This form is not available
          </h1>
          <p className="text-gray-500">
            The link may have expired or is no longer valid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <DynamicForm formConfig={formConfig} token={token} />
      </div>
    </div>
  );
}
