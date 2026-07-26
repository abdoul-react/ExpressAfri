import { useEffect, useMemo, useRef, useState } from "react";
import type { CartStoreGroup } from "@/features/cart";
import type { StorePaymentMethod } from "@/infrastructure/data-source/StoreDataSource";

/** Provider du paiement à la livraison, tel que l'API le reconnaît. */
export const COD_PROVIDER = "cash_on_delivery";

/** Groupe des articles dont la boutique est inconnue (paniers d'avant la migration). */
export const UNKNOWN_KEY = "__unknown__";

export type PaymentChoice = {
  provider: string;
  phone: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardName: string;
};

export const EMPTY_CHOICE: Omit<PaymentChoice, "provider"> = {
  phone: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardName: "",
};

export type PaymentSubStep = "method" | "details";

export function detectCardBrand(number: string): string | null {
  const clean = number.replace(/\s/g, "");
  if (/^4/.test(clean)) return "VISA";
  if (/^5[1-5]/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (/^6(?:011|5)/.test(clean)) return "Discover";
  if (/^35(?:2[89]|[3-8])/.test(clean)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(clean)) return "Diners";
  return null;
}

export function formatCardNumber(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

/** Un choix est-il complet pour la méthode retenue ? */
export function isChoiceValid(
  method: StorePaymentMethod | undefined,
  choice: PaymentChoice | undefined,
): boolean {
  if (!method) return false;
  if (method.type === "mobile_money") {
    // L'opérateur EST la méthode sélectionnée : il ne reste que le numéro.
    return (choice?.phone ?? "").replace(/\D/g, "").length >= 8;
  }
  if (method.type === "card") {
    return (
      (choice?.cardNumber ?? "").replace(/\s/g, "").length === 16 &&
      (choice?.cardExpiry ?? "").length === 5 &&
      (choice?.cardCvv ?? "").length >= 3 &&
      (choice?.cardName ?? "").trim().length >= 2
    );
  }
  return true; // COD / wallet : rien à saisir
}

/**
 * Machine à étapes du paiement multi-boutiques : une étape par boutique
 * (« Paiement 1/3 — Boutique X »), deux sous-étapes par boutique (choix de la
 * méthode, puis formulaire adapté au type). Les choix survivent au retour en
 * arrière ; un panier modifié en cours de route remet le flux à zéro.
 */
export function usePaymentFlow(groups: CartStoreGroup[]) {
  const [stepIndex, setStepIndex] = useState(0);
  const [subStep, setSubStep] = useState<PaymentSubStep>("method");
  const [choices, setChoices] = useState<Record<string, PaymentChoice>>({});

  // Empreinte du panier : si les groupes changent (article retiré/ajouté
  // pendant le flux), les montants par boutique ne valent plus rien → reset.
  const signature = useMemo(
    () =>
      groups
        .map(
          (g) =>
            `${g.storeId ?? UNKNOWN_KEY}:${g.items
              .map((i) => `${i.productId}x${i.quantity}`)
              .join(",")}`,
        )
        .join("|"),
    [groups],
  );
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setStepIndex(0);
      setSubStep("method");
    }
  }, [signature]);

  const keyOf = (storeId: string | null) => storeId ?? UNKNOWN_KEY;

  const patch = (storeId: string | null, values: Partial<PaymentChoice>) => {
    const key = keyOf(storeId);
    setChoices((prev) => {
      const base: PaymentChoice = prev[key] ?? { ...EMPTY_CHOICE, provider: "" };
      return { ...prev, [key]: { ...base, ...values } };
    });
  };

  const currentGroup = groups[stepIndex] as CartStoreGroup | undefined;
  const isLastStep = stepIndex >= groups.length - 1;

  const goToDetails = () => setSubStep("details");

  /** Retour d'un cran : détails → méthodes → boutique précédente. */
  const goBack = (): boolean => {
    if (subStep === "details") {
      setSubStep("method");
      return true;
    }
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      setSubStep("details");
      return true;
    }
    return false; // première étape : laisser la navigation quitter l'écran
  };

  const goNext = () => {
    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      setSubStep("method");
    }
  };

  return {
    stepIndex,
    subStep,
    choices,
    currentGroup,
    isLastStep,
    keyOf,
    patch,
    goToDetails,
    goBack,
    goNext,
  };
}
