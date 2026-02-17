"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCsrfToken } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FormUrl {
  id: string;
  token: string;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Submission {
  id: string;
  status: "PENDING" | "SUBMITTED" | "FAILED" | "RETRYING";
  cmpWorkRequestId: string | null;
  errorMessage: string | null;
  submittedAt: string;
}

interface FormDetail {
  id: string;
  title: string;
  description: string | null;
  cmpTemplateId: string;
  cmpTemplateName: string;
  accessType: "OPEN_URL" | "ONE_TIME_URL";
  isActive: boolean;
  createdAt: string;
  formUrls: FormUrl[];
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function getUrlStatus(url: FormUrl) {
  if (url.isUsed) return "used";
  if (url.expiresAt && new Date(url.expiresAt) < new Date()) return "expired";
  return "available";
}

function getUrlStatusVariant(status: string) {
  if (status === "used") return "secondary" as const;
  if (status === "expired") return "outline" as const;
  return "default" as const;
}

function getUrlStatusClasses(status: string) {
  if (status === "available") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status === "expired") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "";
}

function getSubmissionStatusVariant(status: Submission["status"]) {
  switch (status) {
    case "SUBMITTED":
      return "default" as const;
    case "PENDING":
    case "RETRYING":
      return "outline" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function getSubmissionStatusClasses(status: Submission["status"]) {
  switch (status) {
    case "SUBMITTED":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "PENDING":
    case "RETRYING":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "";
  }
}

function truncate(str: string, len: number) {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

export default function FormDetailPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL generation state
  const [modalOpen, setModalOpen] = useState(false);
  const [urlCount, setUrlCount] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/forms/${formId}`);
      if (!res.ok) throw new Error("Failed to fetch form details");
      const data = await res.json();
      setForm(data.form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [formId]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/forms/${formId}/submissions`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch {
      // Non-critical, submissions list may just be empty.
    }
  }, [formId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchForm(), fetchSubmissions()]);
      setLoading(false);
    }
    load();
  }, [fetchForm, fetchSubmissions]);

  const handleGenerateUrls = async () => {
    if (!form) return;

    if (form.accessType === "ONE_TIME_URL") {
      setModalOpen(true);
      return;
    }

    // For OPEN_URL, generate a single URL directly.
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/forms/${formId}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ count: 1 }),
      });
      if (!res.ok) throw new Error("Failed to generate URL");
      await fetchForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate URL");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateOneTimeUrls = async () => {
    const count = parseInt(urlCount, 10);
    if (isNaN(count) || count < 1 || count > 500) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/forms/${formId}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({
          count,
          expiresAt: expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate URLs");
      await fetchForm();
      setModalOpen(false);
      setUrlCount("1");
      setExpiryDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate URLs");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const fullUrl = `${getBaseUrl()}/f/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Clipboard access may be denied in some environments.
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading form details..." />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-8">
      {/* Section A. Form Info Header */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold">{form.title}</h1>
          <Badge
            variant={form.isActive ? "default" : "secondary"}
            className={form.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
          >
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span>Template. {form.cmpTemplateName}</span>
          <span>|</span>
          <span>
            Access.{" "}
            {form.accessType === "OPEN_URL" ? "Open URL" : "One-Time URL"}
          </span>
        </div>
        {form.description && (
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            {form.description}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Section B. URLs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">URLs</h2>
          <Button
            size="sm"
            disabled={generating}
            onClick={handleGenerateUrls}
          >
            {generating && <Spinner size="sm" />}
            Generate URLs
          </Button>
        </div>

        {form.formUrls.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No URLs generated yet. Click the button above to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Full URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.formUrls.map((url) => {
                const status = getUrlStatus(url);
                const fullUrl = `${getBaseUrl()}/f/${url.token}`;

                return (
                  <TableRow key={url.id}>
                    <TableCell className="font-mono text-sm">
                      {truncate(url.token, 12)}
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-xs truncate">
                      {truncate(fullUrl, 50)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getUrlStatusVariant(status)}
                        className={getUrlStatusClasses(status)}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(url.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {url.expiresAt
                        ? new Date(url.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(url.token)}
                      >
                        {copiedToken === url.token ? "Copied!" : "Copy URL"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* One-Time URL Generation Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate One-Time URLs</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url-count">Number of URLs</Label>
              <Input
                id="url-count"
                type="number"
                placeholder="Enter count (max 500)"
                value={urlCount}
                onChange={(e) => setUrlCount(e.target.value)}
                min={1}
                max={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry-date">Expiry Date (optional)</Label>
              <Input
                id="expiry-date"
                type="date"
                placeholder="Select an expiry date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                generating ||
                !urlCount ||
                parseInt(urlCount, 10) < 1 ||
                parseInt(urlCount, 10) > 500
              }
              onClick={handleGenerateOneTimeUrls}
            >
              {generating && <Spinner size="sm" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section C. Submissions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Submissions</h2>

        {submissions.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No submissions yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Work Request ID</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-sm">
                    {truncate(sub.id, 12)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getSubmissionStatusVariant(sub.status)}
                      className={getSubmissionStatusClasses(sub.status)}
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {sub.cmpWorkRequestId
                      ? truncate(sub.cmpWorkRequestId, 16)
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Date(sub.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {sub.errorMessage ?? "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
