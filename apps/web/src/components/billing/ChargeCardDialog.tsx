"use client";

import { useState } from "react";
import { useChargeCard } from "@/hooks/use-stripe-payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";

interface SavedCard {
  id: string;
  cardBrand: string;
  cardLastFour: string;
  expiryMonth: number;
  expiryYear: number;
}

interface ChargeCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  amountCents: number;
  cards: SavedCard[];
}

export function ChargeCardDialog({
  open,
  onOpenChange,
  invoiceId,
  amountCents,
  cards,
}: ChargeCardDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const chargeCard = useChargeCard();

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const amount = (amountCents / 100).toFixed(2);

  const handleCharge = async () => {
    setError(null);
    try {
      await chargeCard.mutateAsync({
        invoiceId,
        savedPaymentMethodId: selectedCardId,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Payment failed";
      setError(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={chargeCard.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Charge Card on File</DialogTitle>
          <DialogDescription>
            Confirm the charge details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Amount
            </label>
            <p className="text-2xl font-bold">${amount}</p>
          </div>

          {/* Card selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Payment method
            </label>
            {cards.length === 1 ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border p-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {selectedCard?.cardBrand}
                </span>
                <span className="text-muted-foreground">
                  ····{selectedCard?.cardLastFour}
                </span>
                <span className="text-sm text-muted-foreground">
                  Exp{" "}
                  {String(selectedCard?.expiryMonth).padStart(2, "0")}/
                  {String(selectedCard?.expiryYear).slice(-2)}
                </span>
              </div>
            ) : (
              <select
                className="mt-1 w-full rounded-lg border p-3"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                disabled={chargeCard.isPending}
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.cardBrand} ····{card.cardLastFour} (Exp{" "}
                    {String(card.expiryMonth).padStart(2, "0")}/
                    {String(card.expiryYear).slice(-2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          {error ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              {!chargeCard.isPending && (
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleCharge}
                disabled={chargeCard.isPending || !selectedCardId}
              >
                {chargeCard.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Charge"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
