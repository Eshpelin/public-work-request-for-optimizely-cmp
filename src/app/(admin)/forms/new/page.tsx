"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/csrf-client";
import {
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";

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
              ? "bg-primary-500 text-white"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
          }`}
        >
          1
        </div>
        <div
          className={`flex-1 h-0.5 ${
            step >= 2
              ? "bg-primary-500"
              : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        />
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 2
              ? "bg-primary-500 text-white"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
          }`}
        >
          2
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 text-sm">
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
                  isPressable
                  onPress={() => handleSelectTemplate(template)}
                  className={`transition-all ${
                    selectedTemplate?.id === template.id
                      ? "ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : ""
                  }`}
                >
                  <CardBody className="px-4 py-3">
                    <p className="font-medium">{template.title}</p>
                    {template.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {template.description}
                      </p>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              color="primary"
              isDisabled={!selectedTemplate}
              onPress={handleNext}
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
            <Input
              label="Title"
              placeholder="Enter form title"
              value={title}
              onValueChange={setTitle}
              isRequired
            />

            <Textarea
              label="Description"
              placeholder="Optional description for this form"
              value={description}
              onValueChange={setDescription}
            />

            <RadioGroup
              label="Access Type"
              value={accessType}
              onValueChange={setAccessType}
            >
              <Radio value="OPEN_URL">
                Open URL (anyone with the link)
              </Radio>
              <Radio value="ONE_TIME_URL">
                One-Time URL (single use per link)
              </Radio>
            </RadioGroup>

            {loadingWorkflows ? (
              <Spinner size="sm" label="Loading workflows..." />
            ) : workflows.length > 0 ? (
              <Select
                label="Workflow (optional)"
                placeholder="Select a workflow"
                selectedKeys={selectedWorkflowId ? [selectedWorkflowId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setSelectedWorkflowId(selected ? String(selected) : "");
                }}
              >
                {workflows.map((wf) => (
                  <SelectItem key={wf.id}>{wf.title || wf.name || wf.id}</SelectItem>
                ))}
              </Select>
            ) : null}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="flat" onPress={handleBack}>
              Back
            </Button>
            <Button
              color="primary"
              isLoading={submitting}
              isDisabled={!(title ?? "").trim()}
              onPress={handleSubmit}
            >
              Create Form
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
