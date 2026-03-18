"use client";

import { useState } from "react";
import {
  useEnrollments,
  useCreateEnrollment,
  useUpdateEnrollment,
  useDeleteEnrollment,
} from "@/hooks/use-enrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  INVITED: "bg-blue-100 text-blue-800 border-blue-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  PAUSED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
  DROPPED: "bg-red-100 text-red-800 border-red-200",
};

export function EnrollmentSection({
  programId,
  programStatus,
}: {
  programId: string;
  programStatus: string;
}) {
  const { data: enrollments, isLoading } = useEnrollments(programId);
  const createEnrollment = useCreateEnrollment(programId);
  const updateEnrollment = useUpdateEnrollment(programId);
  const deleteEnrollment = useDeleteEnrollment(programId);

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createEnrollment.mutateAsync({
        participantEmail: email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setAdding(false);
    } catch (err: any) {
      setError(err.message || "Failed to invite participant");
    }
  };

  const handleRemove = (id: string) => {
    if (confirm("Remove this enrollment?")) {
      deleteEnrollment.mutate(id);
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Enrollments
          {enrollments && (
            <span className="text-sm font-normal text-muted-foreground">
              ({enrollments.length})
            </span>
          )}
        </h2>
        {!adding && programStatus === "PUBLISHED" && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Participant
          </Button>
        )}
      </div>

      {programStatus !== "PUBLISHED" && !enrollments?.length && (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground">
            Publish this program to start enrolling participants
          </p>
        </div>
      )}

      {adding && (
        <form onSubmit={handleInvite} className="mb-4 rounded-lg border p-4 space-y-3">
          <div className="space-y-2">
            <Label>Participant Email</Label>
            <Input
              type="email"
              placeholder="participant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name (optional)</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name (optional)</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createEnrollment.isPending}>
              {createEnrollment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : enrollments && enrollments.length > 0 ? (
        <div className="rounded-lg border divide-y">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="flex items-center justify-between p-3">
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {enrollment.participant.firstName} {enrollment.participant.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{enrollment.participant.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={enrollment.status}
                  onValueChange={(status) =>
                    updateEnrollment.mutate({ id: enrollment.id, status })
                  }
                >
                  <SelectTrigger className="w-32 h-8">
                    <Badge variant="outline" className={STATUS_COLORS[enrollment.status] || ""}>
                      {enrollment.status.toLowerCase()}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="DROPPED">Dropped</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => handleRemove(enrollment.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : programStatus === "PUBLISHED" ? (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No participants enrolled yet</p>
        </div>
      ) : null}
    </div>
  );
}
