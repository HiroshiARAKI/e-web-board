// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CreditCard,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsageDashboard } from "@/components/dashboard/UsageDashboard";
import type { EffectivePlan } from "@/lib/billing";
import type { MessageKey } from "@/lib/i18n";
import type { OwnerUsage } from "@/lib/owner-usage";
import type { PlanBoardSelectionState } from "@/lib/plan-board-selection";
import type { BillingInterval, PaidPlanCode, PlanCode } from "@/lib/plans";

type BillingNotice =
  | "checkout-success"
  | "checkout-cancelled"
  | "portal-return"
  | null;

interface PlanDisplay {
  code: Exclude<PlanCode, "self_hosted" | "unlimited">;
  name: string;
  audienceKey: MessageKey;
  monthlyPrice: string;
  yearlyPrice: string;
  boards: string;
  storageKey: MessageKey;
  resolution: string;
  videoKey: MessageKey;
  maxUpload: string;
  watermarkKey: MessageKey;
}

const PLAN_DISPLAYS: PlanDisplay[] = [
  {
    code: "free",
    name: "Free",
    audienceKey: "billing.plan.free.audience",
    monthlyPrice: "¥0",
    yearlyPrice: "¥0",
    boards: "1",
    storageKey: "billing.plan.free.storage",
    resolution: "1920px",
    videoKey: "billing.value.unsupported",
    maxUpload: "5MB",
    watermarkKey: "billing.value.included",
  },
  {
    code: "lite",
    name: "Lite",
    audienceKey: "billing.plan.lite.audience",
    monthlyPrice: "¥600",
    yearlyPrice: "¥6,600",
    boards: "10",
    storageKey: "billing.plan.lite.storage",
    resolution: "1920px",
    videoKey: "billing.value.fhd",
    maxUpload: "20MB",
    watermarkKey: "billing.value.none",
  },
  {
    code: "standard",
    name: "Standard",
    audienceKey: "billing.plan.standard.audience",
    monthlyPrice: "¥1,300",
    yearlyPrice: "¥14,300",
    boards: "100",
    storageKey: "billing.plan.standard.storage",
    resolution: "3840px",
    videoKey: "billing.value.fourK",
    maxUpload: "500MB",
    watermarkKey: "billing.value.none",
  },
  {
    code: "standard_plus",
    name: "Standard+",
    audienceKey: "billing.plan.standardPlus.audience",
    monthlyPrice: "¥3,600",
    yearlyPrice: "¥39,600",
    boards: "300",
    storageKey: "billing.plan.standardPlus.storage",
    resolution: "3840px",
    videoKey: "billing.value.fourK",
    maxUpload: "2GB",
    watermarkKey: "billing.value.none",
  },
];

const NEXT_PLAN: Partial<Record<PlanCode, PaidPlanCode>> = {
  free: "lite",
  lite: "standard",
  standard: "standard_plus",
};

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  none: "billing.status.none",
  incomplete: "billing.status.incomplete",
  trialing: "billing.status.trialing",
  active: "billing.status.active",
  past_due: "billing.status.pastDue",
  canceled: "billing.status.canceled",
  unpaid: "billing.status.unpaid",
  paused: "billing.status.paused",
};

function getPlanName(planCode: PaidPlanCode) {
  return PLAN_DISPLAYS.find((plan) => plan.code === planCode)?.name ?? planCode;
}

function formatMonthlyPrice(plan: PlanDisplay, t: (key: MessageKey, vars?: Record<string, string | number>) => string) {
  if (plan.code === "free") return plan.monthlyPrice;
  return t("billing.price.monthly", { price: plan.monthlyPrice });
}

function formatYearlyPrice(plan: PlanDisplay, t: (key: MessageKey, vars?: Record<string, string | number>) => string) {
  if (plan.code === "free") return plan.yearlyPrice;
  return t("billing.price.yearly", { price: plan.yearlyPrice });
}

export function BillingClient({
  effectivePlan,
  usage,
  boardSelection,
  billingNotice,
}: {
  effectivePlan: EffectivePlan;
  usage: OwnerUsage;
  boardSelection: PlanBoardSelectionState;
  billingNotice: BillingNotice;
}) {
  const { t, formatDate } = useLocale();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardSelectionState, setBoardSelectionState] = useState(boardSelection);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(
    () => new Set(
      boardSelection.pendingActiveBoardIds
        ?? boardSelection.boards
          .filter((board) => board.status === "active")
          .map((board) => board.id),
    ),
  );
  const [boardSelectionMessage, setBoardSelectionMessage] = useState<string | null>(null);
  const currentPlanCode = effectivePlan.plan.code;
  const subscription = effectivePlan.subscription;
  const isBillingActive =
    effectivePlan.billingMode === "stripe"
    && effectivePlan.planEnforcementMode === "billing";
  const isUnlimitedMode =
    effectivePlan.planEnforcementMode === "unlimited"
    || currentPlanCode === "unlimited";
  const isPaidPlan =
    currentPlanCode === "lite"
    || currentPlanCode === "standard"
    || currentPlanCode === "standard_plus";
  const recommendedPlan = NEXT_PLAN[currentPlanCode];

  const currentPlanDisplay = useMemo(() => {
    if (currentPlanCode === "unlimited" || currentPlanCode === "self_hosted") {
      return {
        name: t("billing.value.unlimited"),
        audience: t("billing.selfHostedAudience"),
      };
    }

    const plan = PLAN_DISPLAYS.find((item) => item.code === currentPlanCode) ?? PLAN_DISPLAYS[0];
    return {
      name: plan.name,
      audience: t(plan.audienceKey),
    };
  }, [currentPlanCode, t]);

  const notice = billingNotice ? t(`billing.notice.${billingNotice}` as MessageKey) : null;
  const statusKey = STATUS_LABEL_KEYS[subscription?.status ?? "none"] ?? "billing.status.none";
  const boardLimit = boardSelectionState.limit;
  const selectedBoardCount = selectedBoardIds.size;
  const shouldShowBoardSelection =
    boardLimit !== null
    && boardSelectionState.totalBoards > 0
    && (
      boardSelectionState.selectionMode === "pending"
      || boardSelectionState.totalBoards > boardLimit
      || boardSelectionState.inactiveDueToPlanBoards > 0
    );
  const boardSelectionOverLimit =
    boardLimit !== null && selectedBoardCount > boardLimit;

  async function redirectFromApi(
    url: string,
    body?: Record<string, string>,
  ) {
    setError(null);
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.url !== "string") {
      const code = typeof data.code === "string" ? data.code : "unknown";
      const key = `billing.error.${code}` as MessageKey;
      const translated = t(key);
      throw new Error(translated === key ? t("billing.error.redirectFallback") : translated);
    }
    window.location.href = data.url;
  }

  async function startCheckout(planCode: PaidPlanCode, interval: BillingInterval) {
    const actionKey = `checkout:${planCode}:${interval}`;
    setLoadingAction(actionKey);
    try {
      await redirectFromApi("/api/billing/checkout", { planCode, interval });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("billing.error.checkoutFailed"));
      setLoadingAction(null);
    }
  }

  async function openPortal() {
    setLoadingAction("portal");
    try {
      await redirectFromApi("/api/billing/portal");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("billing.error.portalFailed"));
      setLoadingAction(null);
    }
  }

  function toggleBoardSelection(boardId: string) {
    setBoardSelectionMessage(null);
    setSelectedBoardIds((current) => {
      const next = new Set(current);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  }

  function autoSelectBoards() {
    if (boardLimit === null) return;
    setBoardSelectionMessage(null);
    setSelectedBoardIds(new Set(
      boardSelectionState.boards.slice(0, boardLimit).map((board) => board.id),
    ));
  }

  async function saveBoardSelection() {
    if (boardLimit !== null && selectedBoardIds.size > boardLimit) {
      setBoardSelectionMessage(t("billing.boardSelectionLimitError", { limit: boardLimit }));
      return;
    }

    setLoadingAction("board-selection");
    setError(null);
    setBoardSelectionMessage(null);
    try {
      const response = await fetch("/api/billing/board-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedBoardIds: Array.from(selectedBoardIds) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = typeof data.code === "string" ? data.code : "unknown";
        if (code === "board_selection_limit_exceeded" && boardLimit !== null) {
          throw new Error(t("billing.boardSelectionLimitError", { limit: boardLimit }));
        }
        throw new Error(t("billing.boardSelectionSaveFailed"));
      }

      const nextState = data as PlanBoardSelectionState;
      setBoardSelectionState(nextState);
      setSelectedBoardIds(new Set(
        nextState.pendingActiveBoardIds
          ?? nextState.boards
            .filter((board) => board.status === "active")
            .map((board) => board.id),
      ));
      setBoardSelectionMessage(t("billing.boardSelectionSaved"));
    } catch (caught) {
      setBoardSelectionMessage(
        caught instanceof Error ? caught.message : t("billing.boardSelectionSaveFailed"),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("billing.description")}
          </p>
        </div>
        {isBillingActive && isPaidPlan && (
          <Button onClick={openPortal} disabled={loadingAction === "portal"}>
            <CreditCard className="size-4" />
            {t("billing.manageButton")}
            <ExternalLink className="size-3.5" />
          </Button>
        )}
      </div>

      {notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          {notice}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{t("billing.currentPlan")}</h2>
              <Badge variant={isUnlimitedMode ? "secondary" : "default"}>
                {currentPlanDisplay.name}
              </Badge>
              <Badge variant="outline">{t(statusKey)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentPlanDisplay.audience}
            </p>
          </div>

          <dl className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:min-w-96">
            <div>
              <dt className="text-muted-foreground">{t("billing.billingInterval")}</dt>
              <dd className="font-medium">
                {subscription?.billingInterval === "monthly"
                  ? t("billing.interval.monthly")
                  : subscription?.billingInterval === "yearly"
                    ? t("billing.interval.yearly")
                    : t("billing.value.unset")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("billing.nextRenewal")}</dt>
              <dd className="font-medium">
                {subscription?.currentPeriodEnd
                  ? formatDate(subscription.currentPeriodEnd, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                  : t("billing.value.unset")}
              </dd>
            </div>
          </dl>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            {t("billing.cancelAtPeriodEnd")}
          </div>
        )}

        {subscription?.status === "past_due" && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            {t("billing.pastDue")}
          </div>
        )}

        {isUnlimitedMode && (
          <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t("billing.unlimitedModeNotice")}
          </div>
        )}
      </section>

      <UsageDashboard
        effectivePlan={effectivePlan}
        usage={usage}
        showUpgradeAction
      />

      {shouldShowBoardSelection && boardLimit !== null && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <AlertCircle className="size-4 text-amber-600" />
                <h2 className="font-semibold">{t("billing.boardSelectionTitle")}</h2>
                {boardSelectionState.requiresSelection && (
                  <Badge variant="destructive">{t("billing.boardSelectionRequired")}</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {boardSelectionState.selectionMode === "pending"
                  ? t("billing.boardSelectionPendingDescription", {
                    plan: boardSelectionState.selectionPlanName,
                    limit: boardLimit,
                    total: boardSelectionState.totalBoards,
                  })
                  : t("billing.boardSelectionDescription", {
                    limit: boardLimit,
                    total: boardSelectionState.totalBoards,
                  })}
              </p>
              {boardSelectionState.selectionMode === "pending" && boardSelectionState.pendingPlanEffectiveAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("billing.boardSelectionPendingEffectiveAt", {
                    date: formatDate(boardSelectionState.pendingPlanEffectiveAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }),
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={autoSelectBoards}
                disabled={loadingAction === "board-selection"}
              >
                {t("billing.boardSelectionAuto")}
              </Button>
              <Button
                type="button"
                onClick={saveBoardSelection}
                disabled={loadingAction === "board-selection" || boardSelectionOverLimit}
              >
                {loadingAction === "board-selection"
                  ? t("common.saving")
                  : t("billing.boardSelectionSave")}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={boardSelectionOverLimit ? "destructive" : "outline"}>
              {t("billing.boardSelectionCount", {
                selected: selectedBoardCount,
                limit: boardLimit,
              })}
            </Badge>
            {boardSelectionState.inactiveDueToPlanBoards > 0 && (
              <Badge variant="secondary">
                {t("billing.boardSelectionInactiveCount", {
                  count: boardSelectionState.inactiveDueToPlanBoards,
                })}
              </Badge>
            )}
          </div>

          {(boardSelectionOverLimit || boardSelectionMessage) && (
            <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              boardSelectionOverLimit
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100"
            }`}
            >
              {boardSelectionOverLimit
                ? t("billing.boardSelectionLimitError", { limit: boardLimit })
                : boardSelectionMessage}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {boardSelectionState.boards.map((board) => {
              const checked = selectedBoardIds.has(board.id);
              const inactiveDueToPlan = board.status === "inactive_due_to_plan";
              return (
                <label
                  key={board.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={checked}
                    onChange={() => toggleBoardSelection(board.id)}
                    disabled={loadingAction === "board-selection"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{board.name}</span>
                      {inactiveDueToPlan && (
                        <Badge variant="secondary">
                          {t("billing.boardStatusInactiveDueToPlan")}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("common.updatedAt")}: {formatDate(board.updatedAt)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {recommendedPlan && isBillingActive && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-semibold">{t("billing.recommendedTitle")}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("billing.recommendedDescription", { plan: getPlanName(recommendedPlan) })}
              </p>
            </div>
            {isPaidPlan ? (
              <Button variant="outline" onClick={openPortal} disabled={loadingAction === "portal"}>
                {t("billing.portalChange")}
                <ExternalLink className="size-3.5" />
              </Button>
            ) : (
              <Button
                onClick={() => startCheckout(recommendedPlan, "monthly")}
                disabled={loadingAction !== null}
              >
                {t("billing.startMonthly")}
                <ExternalLink className="size-3.5" />
              </Button>
            )}
          </div>
        </section>
      )}

      <section id="plan-comparison">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t("billing.comparisonTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("billing.comparisonDescription")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {PLAN_DISPLAYS.map((plan) => {
            const isCurrentPlan = plan.code === currentPlanCode;
            const paidCode = plan.code === "free" ? null : plan.code;
            const isRecommended = plan.code === recommendedPlan;
            return (
              <article
                key={plan.code}
                className="rounded-lg border bg-card p-5 text-card-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {isCurrentPlan && <Badge>{t("billing.current")}</Badge>}
                      {isRecommended && <Badge variant="secondary">{t("billing.recommended")}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t(plan.audienceKey)}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMonthlyPrice(plan, t)}</div>
                    <div className="text-xs text-muted-foreground">{formatYearlyPrice(plan, t)}</div>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.boards")}</dt>
                    <dd className="font-medium">{t("billing.value.boards", { count: plan.boards })}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.storage")}</dt>
                    <dd className="font-medium">{t(plan.storageKey)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.resolution")}</dt>
                    <dd className="font-medium">{plan.resolution}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.video")}</dt>
                    <dd className="font-medium">{t(plan.videoKey)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.maxUpload")}</dt>
                    <dd className="font-medium">{plan.maxUpload}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("billing.feature.watermark")}</dt>
                    <dd className="font-medium">{t(plan.watermarkKey)}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isCurrentPlan && (
                    <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm text-muted-foreground">
                      <Check className="size-3.5" />
                      {t("billing.inUse")}
                    </div>
                  )}

                  {!isCurrentPlan && paidCode && isBillingActive && !isPaidPlan && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => startCheckout(paidCode, "monthly")}
                        disabled={loadingAction !== null}
                      >
                        {t("billing.chooseMonthly")}
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startCheckout(paidCode, "yearly")}
                        disabled={loadingAction !== null}
                      >
                        {t("billing.chooseYearly")}
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </>
                  )}

                  {!isCurrentPlan && paidCode && isBillingActive && isPaidPlan && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openPortal}
                      disabled={loadingAction !== null}
                    >
                      {t("billing.portalChange")}
                      <ExternalLink className="size-3.5" />
                    </Button>
                  )}

                  {!isBillingActive && paidCode && (
                    <span className="text-sm text-muted-foreground">
                      {t("billing.availableWhenEnabled")}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
