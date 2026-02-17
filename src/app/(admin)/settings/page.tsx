"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

interface Credential {
  id: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/settings/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? data ?? []);
      }
    } catch {
      // Silently fail if endpoint is not available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBanner(null);

    try {
      const res = await fetch("/api/v1/settings/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, label }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save credentials");
      }

      showBanner("success", "Credentials saved successfully");
      setClientId("");
      setClientSecret("");
      setLabel("");
      fetchCredentials();
    } catch (err) {
      showBanner(
        "error",
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch("/api/v1/settings/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to activate credentials");
      }

      showBanner("success", "Credentials activated");
      fetchCredentials();
    } catch (err) {
      showBanner(
        "error",
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">CMP Credentials</h1>

      {banner && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            banner.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {banner.message}
        </div>
      )}

      <Card className="mb-8">
        <CardHeader className="px-6 pt-5 pb-0">
          <h2 className="text-lg font-semibold">Add New Credentials</h2>
        </CardHeader>
        <CardBody className="px-6 pb-6 pt-4">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Client ID"
                placeholder="Enter client ID"
                value={clientId}
                onValueChange={setClientId}
                isRequired
              />
              <Input
                label="Client Secret"
                type="password"
                placeholder="Enter client secret"
                value={clientSecret}
                onValueChange={setClientSecret}
                isRequired
              />
            </div>
            <Input
              label="Label (optional)"
              placeholder="e.g. Production CMP"
              value={label}
              onValueChange={setLabel}
            />
            <div>
              <Button
                type="submit"
                color="primary"
                isLoading={saving}
              >
                Save Credentials
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="px-6 pt-5 pb-0">
          <h2 className="text-lg font-semibold">Existing Credentials</h2>
        </CardHeader>
        <CardBody className="px-6 pb-6 pt-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading credentials...</p>
          ) : credentials.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No credentials configured yet. Add your first CMP credentials above.
            </p>
          ) : (
            <Table aria-label="CMP Credentials">
              <TableHeader>
                <TableColumn>Label</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Created</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell>{cred.label || "Untitled"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          cred.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {cred.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!cred.isActive && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          onPress={() => handleActivate(cred.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
