"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface FormListItem {
  id: string;
  title: string;
  cmpTemplateName: string;
  accessType: "OPEN_URL" | "ONE_TIME_URL";
  isActive: boolean;
  createdAt: string;
  _count: {
    formUrls: number;
    submissions: number;
  };
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForms() {
      try {
        const res = await fetch("/api/v1/forms");
        if (!res.ok) {
          throw new Error("Failed to fetch forms");
        }
        const data = await res.json();
        setForms(data.forms ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading forms..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Public Forms</h1>
        <Button asChild>
          <Link href="/forms/new">Create Form</Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            No forms yet. Create your first form to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Access Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>URLs</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow
                key={form.id}
                className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => window.location.href = `/forms/${form.id}`}
              >
                <TableCell className="font-medium">{form.title}</TableCell>
                <TableCell>{form.cmpTemplateName}</TableCell>
                <TableCell>
                  {form.accessType === "OPEN_URL"
                    ? "Open URL"
                    : "One-Time URL"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={form.isActive ? "default" : "secondary"}
                    className={form.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                  >
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{form._count.formUrls}</TableCell>
                <TableCell>{form._count.submissions}</TableCell>
                <TableCell>
                  {new Date(form.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
