"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrograms, useTemplates, useCloneProgram, useClientPrograms } from "@/hooks/use-programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Loader2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { CreateProgramDialog } from "./create-program-dialog";
import { AssignmentModal } from "@/components/assignment";
import { PageHeader } from "@/components/page-header";

type Tab = "my-programs" | "client-programs" | "templates";

export default function ProgramsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = tabParam === "templates" ? "templates" : tabParam === "client-programs" ? "client-programs" : "my-programs";

  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: clientPrograms, isLoading: clientProgramsLoading } = useClientPrograms();
  const cloneProgram = useCloneProgram();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null);

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "my-programs") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.replace(`/programs?${params.toString()}`);
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const result = await cloneProgram.mutateAsync({ id: templateId });
      router.push(`/programs/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = activeTab === "my-programs" ? programsLoading : activeTab === "client-programs" ? clientProgramsLoading : templatesLoading;

  return (
    <div>
      <PageHeader
        title="Programs"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {([
          { key: "my-programs" as Tab, label: "My Programs" },
          { key: "client-programs" as Tab, label: "Client Programs" },
          { key: "templates" as Tab, label: "Template Library" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState />}

      {/* My Programs Tab */}
      {activeTab === "my-programs" && !programsLoading && (
        <>
          {programs && programs.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No programs yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Create one or browse the Template Library.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Program
                </Button>
                <Button variant="outline" onClick={() => setTab("templates")}>
                  Browse Templates
                </Button>
              </div>
            </div>
          )}

          {programs && programs.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <Card key={program.id} className="transition-shadow hover:shadow-md">
                  <Link href={`/programs/${program.id}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">
                        {program.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {program.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {program.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {program.moduleCount ?? 0} modules
                      </div>
                    </CardContent>
                  </Link>
                  <div className="px-6 pb-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        setAssignTemplateId(program.id);
                      }}
                    >
                      Assign to Client
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Client Programs Tab */}
      {activeTab === "client-programs" && !clientProgramsLoading && (
        <>
          {clientPrograms && clientPrograms.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No client programs yet</h3>
              <p className="text-muted-foreground mt-1">
                Assign a program to a client to see it here.
              </p>
            </div>
          )}

          {clientPrograms && clientPrograms.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientPrograms.map((cp) => (
                <Card key={cp.id} className="transition-shadow hover:shadow-md">
                  <Link href={`/programs/${cp.id}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">
                        {cp.title}
                      </CardTitle>
                      {cp.clientName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {cp.clientName}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {cp.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {cp.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {cp.moduleCount} modules
                        </div>
                        {cp.enrollmentStatus && (
                          <span className="capitalize">{cp.enrollmentStatus.toLowerCase()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Template Library Tab */}
      {activeTab === "templates" && !templatesLoading && (
        <>
          {templates && templates.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates available</h3>
            </div>
          )}

          {templates && templates.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-1">
                      {template.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <BookOpen className="h-3.5 w-3.5" />
                      {template.moduleCount} modules
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template.id)}
                        disabled={cloneProgram.isPending}
                      >
                        {cloneProgram.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Use Template
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignTemplateId(template.id)}
                      >
                        Assign to Client
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <CreateProgramDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {assignTemplateId && (
        <AssignmentModal
          open={!!assignTemplateId}
          onOpenChange={(open) => !open && setAssignTemplateId(null)}
          templateId={assignTemplateId}
        />
      )}
    </div>
  );
}
