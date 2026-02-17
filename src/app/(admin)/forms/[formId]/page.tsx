"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Chip,
  Input,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

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
  cmpWorkflowId: string | null;
  cmpWorkflowName: string | null;
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

function getUrlStatusColor(status: string) {
  if (status === "used") return "default" as const;
  if (status === "expired") return "warning" as const;
  return "success" as const;
}

function getSubmissionStatusColor(status: Submission["status"]) {
  switch (status) {
    case "SUBMITTED":
      return "success" as const;
    case "PENDING":
    case "RETRYING":
      return "warning" as const;
    case "FAILED":
      return "danger" as const;
    default:
      return "default" as const;
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
  const { isOpen, onOpen, onClose } = useDisclosure();
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
      onOpen();
      return;
    }

    // For OPEN_URL, generate a single URL directly.
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/forms/${formId}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          expiresAt: expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate URLs");
      await fetchForm();
      onClose();
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
          <Chip
            size="sm"
            color={form.isActive ? "success" : "default"}
            variant="flat"
          >
            {form.isActive ? "Active" : "Inactive"}
          </Chip>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span>Template. {form.cmpTemplateName}</span>
          <span>|</span>
          <span>
            Access.{" "}
            {form.accessType === "OPEN_URL" ? "Open URL" : "One-Time URL"}
          </span>
          {form.cmpWorkflowName && (
            <>
              <span>|</span>
              <span>Workflow. {form.cmpWorkflowName}</span>
            </>
          )}
        </div>
        {form.description && (
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            {form.description}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 text-sm">
          {error}
        </div>
      )}

      {/* Section B. URLs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">URLs</h2>
          <Button
            color="primary"
            size="sm"
            isLoading={generating}
            onPress={handleGenerateUrls}
          >
            Generate URLs
          </Button>
        </div>

        {form.formUrls.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No URLs generated yet. Click the button above to create one.
          </p>
        ) : (
          <Table aria-label="Form URLs">
            <TableHeader>
              <TableColumn>Token</TableColumn>
              <TableColumn>Full URL</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Expires</TableColumn>
              <TableColumn>Actions</TableColumn>
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
                      <Chip
                        size="sm"
                        color={getUrlStatusColor(status)}
                        variant="flat"
                      >
                        {status}
                      </Chip>
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
                        variant="flat"
                        onPress={() => copyToClipboard(url.token)}
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

      {/* One-Time URL Generation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Generate One-Time URLs</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                type="number"
                label="Number of URLs"
                placeholder="Enter count (max 500)"
                value={urlCount}
                onValueChange={setUrlCount}
                min={1}
                max={500}
              />
              <Input
                type="date"
                label="Expiry Date (optional)"
                placeholder="Select an expiry date"
                value={expiryDate}
                onValueChange={setExpiryDate}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={generating}
              isDisabled={
                !urlCount ||
                parseInt(urlCount, 10) < 1 ||
                parseInt(urlCount, 10) > 500
              }
              onPress={handleGenerateOneTimeUrls}
            >
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Section C. Submissions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Submissions</h2>

        {submissions.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No submissions yet.
          </p>
        ) : (
          <Table aria-label="Form submissions">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Work Request ID</TableColumn>
              <TableColumn>Submitted At</TableColumn>
              <TableColumn>Error Message</TableColumn>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-sm">
                    {truncate(sub.id, 12)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={getSubmissionStatusColor(sub.status)}
                      variant="flat"
                    >
                      {sub.status}
                    </Chip>
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
