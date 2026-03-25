"use client";

import { useParams } from "next/navigation";
import { useSuperbillData } from "@/hooks/use-rtm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";

export default function SuperbillPage() {
  const params = useParams<{ enrollmentId: string; periodId: string }>();
  const { data, isLoading, error } = useSuperbillData(params.periodId);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Superbill" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to generate superbill. Please ensure your billing profile is configured."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar — hidden when printing */}
      <div className="print:hidden">
        <PageHeader
          title="Superbill"
          subtitle={data.client.name}
          actions={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print Superbill
            </Button>
          }
        />
      </div>

      {/* Superbill content */}
      <div className="max-w-4xl mx-auto print:max-w-none">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8 space-y-6">
            {/* Header — Practice Info */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold">{data.provider.practiceName}</h1>
              <p className="text-muted-foreground">
                {data.provider.address}
                <br />
                {data.provider.city}, {data.provider.state} {data.provider.zip}
              </p>
              <p className="text-muted-foreground">{data.provider.phone}</p>
              <div className="flex justify-center gap-6 mt-2 text-sm">
                <span>
                  <span className="font-medium">NPI:</span> {data.provider.npi}
                </span>
                <span>
                  <span className="font-medium">Tax ID:</span> {data.provider.taxId}
                </span>
                <span>
                  <span className="font-medium">License:</span>{" "}
                  {data.provider.licenseNumber} ({data.provider.licenseState})
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-semibold">SUPERBILL</h2>
              <p className="text-sm text-muted-foreground">
                Remote Therapeutic Monitoring — Billing Period:{" "}
                {formatDate(data.period.startDate)} to {formatDate(data.period.endDate)}
              </p>
            </div>

            {/* Client and Insurance Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Client Information
                </h3>
                <p className="font-medium">{data.client.name}</p>
                {data.diagnosisCodes.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">
                      Diagnosis (ICD-10):
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.diagnosisCodes.map((code, i) => (
                        <Badge key={code} variant="secondary">
                          {String.fromCharCode(65 + i)}: {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Insurance Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Payer:</span>{" "}
                    {data.insurance.payerName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Subscriber ID:</span>{" "}
                    {data.insurance.subscriberId}
                  </p>
                  {data.insurance.groupNumber && (
                    <p>
                      <span className="text-muted-foreground">Group:</span>{" "}
                      {data.insurance.groupNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Service Lines Table */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Services Rendered
              </h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                      <th className="text-left px-4 py-2 font-medium">CPT Code</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                      <th className="text-left px-4 py-2 font-medium">ICD-10</th>
                      <th className="text-center px-4 py-2 font-medium">Mod</th>
                      <th className="text-center px-4 py-2 font-medium">Units</th>
                      <th className="text-right px-4 py-2 font-medium">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lineItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No eligible billing codes for this period.
                        </td>
                      </tr>
                    ) : (
                      data.lineItems.map((item, i) => (
                        <tr
                          key={`${item.cptCode}-${i}`}
                          className="border-t"
                        >
                          <td className="px-4 py-2">
                            {formatDate(item.dateOfService)}
                          </td>
                          <td className="px-4 py-2 font-mono">
                            {item.cptCode}
                          </td>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2">
                            {item.diagnosisPointer}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.modifier || "--"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.units}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            ${item.chargeAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.lineItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-right font-semibold"
                        >
                          Total Charges:
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-lg">
                          ${data.totalCharges.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <Separator />

            {/* Supporting Documentation */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Supporting Documentation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p>
                    <span className="text-muted-foreground">
                      Engagement days:
                    </span>{" "}
                    <span className="font-medium">
                      {data.period.engagementDays} out of 30
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Clinician monitoring time:
                    </span>{" "}
                    <span className="font-medium">
                      {data.period.clinicianMinutes} minutes
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <span className="text-muted-foreground">
                      Interactive communication:
                    </span>{" "}
                    <span className="font-medium">
                      {data.period.hasInteractiveCommunication
                        ? formatDate(data.period.interactiveCommunicationDate!)
                        : "None recorded"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Platform:</span>{" "}
                    <span className="font-medium">
                      STEADY (Remote Therapeutic Monitoring)
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Place of Service:
                    </span>{" "}
                    <span className="font-medium">
                      {data.provider.placeOfService === "02"
                        ? "02 — Telehealth"
                        : data.provider.placeOfService}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Provider Signature */}
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-8">
                I certify that the services listed above were medically necessary
                and were provided as described.
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-medium italic">
                    Electronically signed by {data.provider.name},{" "}
                    {data.provider.credentials}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.generatedAt.split("T")[0])}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Generated by STEADY Platform — RTM Billing Documentation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
