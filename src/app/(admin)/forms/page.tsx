"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
} from "@heroui/react";

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
        <Button as={Link} href="/forms/new" color="primary">
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            No forms yet. Create your first form to get started.
          </p>
        </div>
      ) : (
        <Table aria-label="Public forms list">
          <TableHeader>
            <TableColumn>Title</TableColumn>
            <TableColumn>Template</TableColumn>
            <TableColumn>Access Type</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>URLs</TableColumn>
            <TableColumn>Submissions</TableColumn>
            <TableColumn>Created</TableColumn>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow
                key={form.id}
                as={Link}
                href={`/forms/${form.id}`}
                className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <TableCell className="font-medium">{form.title}</TableCell>
                <TableCell>{form.cmpTemplateName}</TableCell>
                <TableCell>
                  {form.accessType === "OPEN_URL"
                    ? "Open URL"
                    : "One-Time URL"}
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={form.isActive ? "success" : "default"}
                    variant="flat"
                  >
                    {form.isActive ? "Active" : "Inactive"}
                  </Chip>
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
