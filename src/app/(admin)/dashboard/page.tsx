"use client";

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

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Forms" value="..." />
        <StatCard title="Total Submissions" value="..." />
        <StatCard title="Failed Submissions" value="..." />
      </div>
    </div>
  );
}
