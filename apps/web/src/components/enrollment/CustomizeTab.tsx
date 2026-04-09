"use client";

import { useState } from "react";
import {
  useOverrides,
  useCreateOverride,
  useDeleteOverride,
  type EnrollmentOverride,
} from "@/hooks/use-enrollment-overrides";
import type { OverrideType } from "@steady/shared";

const OVERRIDE_TYPE_LABELS: Record<OverrideType, string> = {
  HIDE_HOMEWORK_ITEM: "Hide Homework Item",
  ADD_HOMEWORK_ITEM: "Add Homework Item",
  ADD_RESOURCE: "Add Resource",
  CLINICIAN_NOTE: "Clinician Note",
};

interface CustomizeTabProps {
  enrollmentId: string;
  modules: Array<{ id: string; title: string }>;
  parts: Array<{ id: string; title: string; moduleId: string }>;
}

export function CustomizeTab({ enrollmentId, modules, parts }: CustomizeTabProps) {
  const { data: overrides, isLoading } = useOverrides(enrollmentId);
  const createOverride = useCreateOverride(enrollmentId);
  const deleteOverride = useDeleteOverride(enrollmentId);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<OverrideType>("ADD_RESOURCE");
  const [formModuleId, setFormModuleId] = useState("");
  const [formPartId, setFormPartId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formItemType, setFormItemType] = useState("ACTION");

  function resetForm() {
    setFormTitle("");
    setFormUrl("");
    setFormDescription("");
    setFormContent("");
    setFormModuleId("");
    setFormPartId("");
    setFormItemType("ACTION");
    setShowForm(false);
  }

  function handleSubmit() {
    const base: Record<string, any> = { overrideType: formType, payload: {} };

    if (formType === "HIDE_HOMEWORK_ITEM") {
      base.targetPartId = formPartId;
      base.payload = {};
    } else if (formType === "ADD_RESOURCE") {
      base.moduleId = formModuleId;
      base.payload = { title: formTitle, url: formUrl, description: formDescription };
    } else if (formType === "CLINICIAN_NOTE") {
      base.moduleId = formModuleId;
      base.payload = { content: formContent };
    } else if (formType === "ADD_HOMEWORK_ITEM") {
      base.moduleId = formModuleId;
      base.payload = { title: formTitle, description: formDescription, itemType: formItemType };
    }

    createOverride.mutate(base as any, { onSuccess: () => resetForm() });
  }

  function handleDelete(overrideId: string) {
    deleteOverride.mutate(overrideId);
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading overrides...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Customizations</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
        >
          {showForm ? "Cancel" : "Add Override"}
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-lg border p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Override Type</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={formType}
              onChange={(e) => setFormType(e.target.value as OverrideType)}
            >
              <option value="ADD_RESOURCE">Add Resource</option>
              <option value="ADD_HOMEWORK_ITEM">Add Homework Item</option>
              <option value="CLINICIAN_NOTE">Clinician Note</option>
              <option value="HIDE_HOMEWORK_ITEM">Hide Homework Item</option>
            </select>
          </div>

          {formType === "HIDE_HOMEWORK_ITEM" ? (
            <div>
              <label className="text-sm font-medium">Homework Part</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formPartId}
                onChange={(e) => setFormPartId(e.target.value)}
              >
                <option value="">Select a part...</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Module</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formModuleId}
                onChange={(e) => setFormModuleId(e.target.value)}
              >
                <option value="">Select a module...</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(formType === "ADD_RESOURCE" || formType === "ADD_HOMEWORK_ITEM") && (
            <>
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
              </div>
            </>
          )}

          {formType === "ADD_RESOURCE" && (
            <div>
              <label className="text-sm font-medium">URL</label>
              <input
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          )}

          {formType === "CLINICIAN_NOTE" && (
            <div>
              <label className="text-sm font-medium">Note Content</label>
              <textarea
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write a note for the participant..."
              />
            </div>
          )}

          {formType === "ADD_HOMEWORK_ITEM" && (
            <div>
              <label className="text-sm font-medium">Item Type</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formItemType}
                onChange={(e) => setFormItemType(e.target.value)}
              >
                <option value="ACTION">Action</option>
                <option value="RESOURCE_REVIEW">Resource Review</option>
                <option value="JOURNAL_PROMPT">Journal Prompt</option>
                <option value="BRING_TO_SESSION">Bring to Session</option>
                <option value="FREE_TEXT_NOTE">Free Text Note</option>
              </select>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={createOverride.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {createOverride.isPending ? "Saving..." : "Save Override"}
          </button>
        </div>
      )}

      {overrides && overrides.length > 0 ? (
        <div className="space-y-2">
          {overrides.map((o: EnrollmentOverride) => (
            <div
              key={o.id}
              className="flex items-center justify-between bg-card rounded-md border px-4 py-3"
            >
              <div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  {OVERRIDE_TYPE_LABELS[o.overrideType]}
                </span>
                <p className="text-sm mt-1">
                  {o.overrideType === "ADD_RESOURCE" && (o.payload as any).title}
                  {o.overrideType === "CLINICIAN_NOTE" &&
                    ((o.payload as any).content?.substring(0, 80) +
                      ((o.payload as any).content?.length > 80 ? "..." : ""))}
                  {o.overrideType === "ADD_HOMEWORK_ITEM" && (o.payload as any).title}
                  {o.overrideType === "HIDE_HOMEWORK_ITEM" &&
                    `Hidden part: ${o.targetPartId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(o.id)}
                disabled={deleteOverride.isPending}
                className="text-destructive hover:text-destructive/80 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          No customizations yet. Use overrides to personalize this participant's experience.
        </p>
      )}
    </div>
  );
}
