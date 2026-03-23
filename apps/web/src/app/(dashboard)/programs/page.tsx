"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrograms } from "@/hooks/use-programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Loader2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { CreateProgramDialog } from "./create-program-dialog";

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PUBLISHED: "bg-green-100 text-green-800 border-green-200",
  ARCHIVED: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function ProgramsPage() {
  const { data: programs, isLoading, error } = usePrograms();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Programs</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your clinical programs
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Program
        </Button>
      </div>

      {isLoading && <LoadingState />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load programs. Make sure the API server is running.
        </div>
      )}

      {programs && programs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No programs yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first program to get started
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        </div>
      )}

      {programs && programs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">
                      {program.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={statusColors[program.status] || ""}
                    >
                      {program.status.toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {program.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {program.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {program.moduleCount ?? 0} modules
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {program.activeEnrollmentCount ?? 0} active
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProgramDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
