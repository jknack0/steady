"use client";

import type { SaveBillingProfileData } from "@/hooks/use-rtm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { US_STATES, PLACE_OF_SERVICE_SELECT_OPTIONS } from "@/lib/billing-constants";

const PLACE_OF_SERVICE_OPTIONS = PLACE_OF_SERVICE_SELECT_OPTIONS;

export interface BillingProfileCardProps {
  form: SaveBillingProfileData;
  errors: Record<string, string>;
  showTaxId: boolean;
  onToggleTaxId: () => void;
  onFieldChange: (field: keyof SaveBillingProfileData, value: string) => void;
  isLoading: boolean;
  hasProfile: boolean;
}

export function BillingProfileCard({
  form,
  errors,
  showTaxId,
  onToggleTaxId,
  onFieldChange,
  isLoading,
  hasProfile,
}: BillingProfileCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Profile</CardTitle>
          <CardDescription>
            Required for generating superbills and insurance claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading billing profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Billing Profile</CardTitle>
        <CardDescription>
          Required for generating superbills and insurance claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasProfile && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Complete your billing profile to generate superbills for insurance billing.
            </p>
          </div>
        )}

        {/* Provider Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Provider Information</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-providerName">Provider Name</Label>
            <Input
              id="bp-providerName"
              placeholder="Full legal name for billing"
              value={form.providerName}
              onChange={(e) => onFieldChange("providerName", e.target.value)}
              maxLength={200}
              className={errors.providerName ? "border-destructive" : ""}
            />
            {errors.providerName && (
              <p className="text-sm text-destructive">{errors.providerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-credentials">Credentials</Label>
            <Input
              id="bp-credentials"
              placeholder='e.g., PhD, LCSW, MD'
              value={form.credentials}
              onChange={(e) => onFieldChange("credentials", e.target.value)}
              maxLength={50}
              className={errors.credentials ? "border-destructive" : ""}
            />
            {errors.credentials && (
              <p className="text-sm text-destructive">{errors.credentials}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-npiNumber">NPI Number</Label>
            <Input
              id="bp-npiNumber"
              placeholder="1234567890"
              value={form.npiNumber}
              onChange={(e) => onFieldChange("npiNumber", e.target.value)}
              maxLength={10}
              className={errors.npiNumber ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">10-digit National Provider Identifier</p>
            {errors.npiNumber && (
              <p className="text-sm text-destructive">{errors.npiNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-taxId">Tax ID (EIN/SSN)</Label>
            <div className="relative">
              <Input
                id="bp-taxId"
                type={showTaxId ? "text" : "password"}
                placeholder="123456789"
                value={form.taxId}
                onChange={(e) => onFieldChange("taxId", e.target.value)}
                maxLength={9}
                className={`pr-10 ${errors.taxId ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={onToggleTaxId}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showTaxId ? "Hide Tax ID" : "Show Tax ID"}
              >
                {showTaxId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">9 digits, no dashes</p>
            {errors.taxId && (
              <p className="text-sm text-destructive">{errors.taxId}</p>
            )}
          </div>
        </div>

        {/* Practice Address */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Practice Address</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceName">Practice Name</Label>
            <Input
              id="bp-practiceName"
              placeholder="Your practice name"
              value={form.practiceName}
              onChange={(e) => onFieldChange("practiceName", e.target.value)}
              maxLength={200}
              className={errors.practiceName ? "border-destructive" : ""}
            />
            {errors.practiceName && (
              <p className="text-sm text-destructive">{errors.practiceName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceAddress">Street Address</Label>
            <Input
              id="bp-practiceAddress"
              placeholder="123 Main St"
              value={form.practiceAddress}
              onChange={(e) => onFieldChange("practiceAddress", e.target.value)}
              maxLength={500}
              className={errors.practiceAddress ? "border-destructive" : ""}
            />
            {errors.practiceAddress && (
              <p className="text-sm text-destructive">{errors.practiceAddress}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceCity">City</Label>
            <Input
              id="bp-practiceCity"
              placeholder="Portland"
              value={form.practiceCity}
              onChange={(e) => onFieldChange("practiceCity", e.target.value)}
              maxLength={200}
              className={errors.practiceCity ? "border-destructive" : ""}
            />
            {errors.practiceCity && (
              <p className="text-sm text-destructive">{errors.practiceCity}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp-practiceState">State</Label>
              <Select
                value={form.practiceState}
                onValueChange={(v) => onFieldChange("practiceState", v)}
              >
                <SelectTrigger
                  id="bp-practiceState"
                  className={errors.practiceState ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.practiceState && (
                <p className="text-sm text-destructive">{errors.practiceState}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-practiceZip">ZIP Code</Label>
              <Input
                id="bp-practiceZip"
                placeholder="12345 or 12345-6789"
                value={form.practiceZip}
                onChange={(e) => onFieldChange("practiceZip", e.target.value)}
                maxLength={10}
                className={errors.practiceZip ? "border-destructive" : ""}
              />
              {errors.practiceZip && (
                <p className="text-sm text-destructive">{errors.practiceZip}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practicePhone">Phone Number</Label>
            <Input
              id="bp-practicePhone"
              placeholder="(503) 555-0123"
              value={form.practicePhone}
              onChange={(e) => onFieldChange("practicePhone", e.target.value)}
              maxLength={20}
              className={errors.practicePhone ? "border-destructive" : ""}
            />
            {errors.practicePhone && (
              <p className="text-sm text-destructive">{errors.practicePhone}</p>
            )}
          </div>
        </div>

        {/* Licensing */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Licensing</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-licenseNumber">License Number</Label>
            <Input
              id="bp-licenseNumber"
              placeholder="C12345"
              value={form.licenseNumber}
              onChange={(e) => onFieldChange("licenseNumber", e.target.value)}
              maxLength={100}
              className={errors.licenseNumber ? "border-destructive" : ""}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-destructive">{errors.licenseNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-licenseState">License State</Label>
            <Select
              value={form.licenseState}
              onValueChange={(v) => onFieldChange("licenseState", v)}
            >
              <SelectTrigger
                id="bp-licenseState"
                className={errors.licenseState ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.licenseState && (
              <p className="text-sm text-destructive">{errors.licenseState}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-placeOfService">Place of Service</Label>
            <Select
              value={form.placeOfServiceCode}
              onValueChange={(v) => onFieldChange("placeOfServiceCode", v)}
            >
              <SelectTrigger id="bp-placeOfService">
                <SelectValue placeholder="Select place of service" />
              </SelectTrigger>
              <SelectContent>
                {PLACE_OF_SERVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
