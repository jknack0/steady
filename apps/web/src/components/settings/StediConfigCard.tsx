"use client";

import { useState } from "react";
import { useStediConfig, useSetStediKey, useTestStediConnection } from "@/hooks/use-stedi-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StripeStatusBadge } from "@/components/billing/StripeStatusBadge";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";

export function StediConfigCard() {
  const { data: stediConfig, isLoading } = useStediConfig();
  const setKey = useSetStediKey();
  const testConnection = useTestStediConnection();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isConfigured = stediConfig?.configured;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    try {
      await setKey.mutateAsync(apiKey.trim());
      setApiKey("");
      setShowKey(false);
      setSaveSuccess(true);
      setTestResult(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // mutation error handled by TanStack Query
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await testConnection.mutateAsync();
      setTestResult({ ok: true, message: "Connection successful" });
    } catch {
      setTestResult({ ok: false, message: "Connection failed. Check your API key." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Integrations</CardTitle>
        <CardDescription>
          Connect external services for insurance billing and claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div>
          <Label className="text-sm font-medium">Stedi (Insurance / EDI)</Label>
          {isLoading ? (
            <div className="flex items-center gap-2 mt-1" aria-busy="true">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking...</span>
            </div>
          ) : isConfigured ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm">Connected</span>
              {stediConfig?.keyLastFour && (
                <span className="text-xs text-muted-foreground">
                  (key ····{stediConfig.keyLastFour})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span className="text-sm text-muted-foreground">Not configured</span>
            </div>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="stediApiKey">
            {isConfigured ? "Update API Key" : "API Key"}
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="stediApiKey"
                type={showKey ? "text" : "password"}
                placeholder={isConfigured ? "Enter new key to update" : "Enter your Stedi API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                maxLength={500}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || setKey.isPending}
              size="sm"
            >
              {setKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> API key saved
            </span>
          )}
          {setKey.isError && (
            <span className="text-sm text-destructive">
              Failed to save API key. Please try again.
            </span>
          )}
        </div>

        {/* Test Connection */}
        {isConfigured && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult && (
              <p className={`text-sm ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                {testResult.ok && <Check className="h-4 w-4 inline mr-1" />}
                {testResult.message}
              </p>
            )}
          </div>
        )}

        {/* Stripe Online Payments */}
        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-medium mb-2 block">Online Payments (Stripe)</Label>
          <StripeStatusBadge />
        </div>
      </CardContent>
    </Card>
  );
}
