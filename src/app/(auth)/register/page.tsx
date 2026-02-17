"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="flex flex-col items-center pt-8 pb-0">
        <h1 className="text-2xl font-bold">Create Admin Account</h1>
      </CardHeader>
      <CardBody className="px-8 pb-8 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            type="text"
            placeholder="Your full name"
            value={name}
            onValueChange={setName}
            isRequired
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onValueChange={setEmail}
            isRequired
          />
          <Input
            label="Password"
            type="password"
            placeholder="Choose a password"
            value={password}
            onValueChange={setPassword}
            isRequired
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button
            type="submit"
            color="primary"
            className="w-full mt-2"
            isLoading={loading}
          >
            Create Account
          </Button>
          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}
