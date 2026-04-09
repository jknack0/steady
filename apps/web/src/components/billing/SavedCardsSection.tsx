"use client";

import { useState } from "react";
import { useSavedCards, useRemoveCard } from "@/hooks/use-saved-cards";
import { useStripeConnectionStatus } from "@/hooks/use-stripe-payments";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Trash2 } from "lucide-react";

interface SavedCard {
  id: string;
  cardBrand: string;
  cardLastFour: string;
  expiryMonth: number;
  expiryYear: number;
}

export function SavedCardsSection({
  participantId,
}: {
  participantId: string;
}) {
  const { data: connectionStatus } = useStripeConnectionStatus();
  const { data: cards, isLoading, error } = useSavedCards(participantId);
  const removeCard = useRemoveCard();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Don't render if Stripe not configured
  if (!connectionStatus?.connected) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Payment Methods
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          Unable to load payment methods
        </p>
      ) : !cards || (cards as SavedCard[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cards on file. Cards are saved when clients pay an invoice online.
        </p>
      ) : (
        <div className="space-y-2">
          {(cards as SavedCard[]).map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {card.cardBrand}
                </span>
                <span className="text-muted-foreground">
                  ····{card.cardLastFour}
                </span>
                <span className="text-sm text-muted-foreground">
                  Exp {String(card.expiryMonth).padStart(2, "0")}/
                  {String(card.expiryYear).slice(-2)}
                </span>
              </div>

              {confirmingId === card.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Remove?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      removeCard.mutate(
                        { participantId, cardId: card.id },
                        { onSettled: () => setConfirmingId(null) },
                      );
                    }}
                    disabled={removeCard.isPending}
                  >
                    {removeCard.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                  >
                    Keep
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingId(card.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
