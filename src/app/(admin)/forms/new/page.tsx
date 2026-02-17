"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

interface Template {
  id: string;
  title: string;
  description?: string;
}

interface Workflow {
  id: string;
  title?: string;
  name?: string;
  description?: string;
}

export default function NewFormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  // Step 2 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("OPEN_URL");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/v1/cmp/templates");
        if (!res.ok) throw new Error("Failed to fetch templates");
        const data = await res.json();
        setTemplates(data.templates ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load templates",
        );
      } finally {
        setLoadingTemplates(false);
      }
    }

    fetchTemplates();
  }, []);

  useEffect(() => {
    if (step === 2) {
      setLoadingWorkflows(true);
      async function fetchWorkflows() {
        try {
          const res = await fetch("/api/v1/cmp/workflows");
          if (!res.ok) throw new Error("Failed to fetch workflows");
          const data = await res.json();
          setWorkflows(data.workflows ?? []);
        } catch {
          // Workflows are optional, so we silently continue.
        } finally {
          setLoadingWorkflows(false);
        }
      }

      fetchWorkflows();
    }
  }, [step]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTitle(template.title || "");
  };

  const handleNext = () => {
    if (!selectedTemplate) return;
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          cmpTemplateId: selectedTemplate.id,
          accessType,
          cmpWorkflowId: selectedWorkflowId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message ?? "Failed to create form",
        );
      }

      const data = await res.json();
      router.push(`/forms/${data.form.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Form</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 1
              ? "bg-primary text-primary-foreground"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
          }`}
        >
          1
        </div>
        <div
          className={`flex-1 h-0.5 ${
            step >= 2
              ? "bg-primary"
              : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        />
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 2
              ? "bg-primary text-primary-foreground"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
          }`}
        >
          2
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1. Select Template */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Select Template</h2>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" label="Loading templates..." />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 py-12 text-center">
              No templates found. Check that your CMP credentials are configured
              in Settings and that your CMP instance has active templates.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="px-4 py-3">
                    <p className="font-medium">{template.title}</p>
                    {template.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {template.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              disabled={!selectedTemplate}
              onClick={handleNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2. Configure Form */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Configure Form</h2>

          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter form title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this form"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Access Type</Label>
              <RadioGroup
                value={accessType}
                onValueChange={setAccessType}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OPEN_URL" id="open-url" />
                  <Label htmlFor="open-url" className="font-normal">
                    Open URL (anyone with the link)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ONE_TIME_URL" id="one-time-url" />
                  <Label htmlFor="one-time-url" className="font-normal">
                    One-Time URL (single use per link)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {loadingWorkflows ? (
              <Spinner size="sm" label="Loading workflows..." />
            ) : workflows.length > 0 ? (
              <div className="space-y-2">
                <Label>Workflow (optional)</Label>
                <Select
                  value={selectedWorkflowId}
                  onValueChange={setSelectedWorkflowId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        {wf.title || wf.name || wf.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button
              disabled={submitting || !(title ?? "").trim()}
              onClick={handleSubmit}
            >
              {submitting && <Spinner size="sm" />}
              Create Form
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
