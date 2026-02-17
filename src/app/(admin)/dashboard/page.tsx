"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";

interface StatCardProps {
  title: string;
  value: string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card className="flex-1">
      <CardHeader className="pb-0 pt-4 px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
      </CardHeader>
      <CardBody className="pt-2 px-6 pb-5">
        <p className="text-3xl font-bold">{value}</p>
      </CardBody>
    </Card>
  );
}

interface Stats {
  totalForms: number;
  totalSubmissions: number;
  failedSubmissions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/v1/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Stats will remain null and display a dash as a fallback.
      }
    }

    fetchStats();
  }, []);

  const display = (value: number | undefined) =>
    value !== undefined ? String(value) : "–";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Forms" value={display(stats?.totalForms)} />
        <StatCard title="Total Submissions" value={display(stats?.totalSubmissions)} />
        <StatCard title="Failed Submissions" value={display(stats?.failedSubmissions)} />
      </div>
    </div>
  );
}
