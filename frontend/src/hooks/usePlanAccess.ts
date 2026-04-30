import { usePlan, FEATURE_MAP, PLAN_HIERARCHY, planCanAccess, type Plan } from '@/contexts/PlanContext';

interface PlanAccessResult {
  allowed:      boolean;
  requiredPlan: Plan;
  currentPlan:  Plan;
}

/**
 * usePlanAccess
 * ─────────────
 * Returns whether the current user's plan can access a given feature,
 * along with the required and current plan tiers.
 *
 * @example
 * const { allowed, requiredPlan } = usePlanAccess('documents');
 * if (!allowed) return <AccessDeniedOverlay feature="documents" requiredPlan={requiredPlan} />;
 */
export function usePlanAccess(feature: string): PlanAccessResult {
  const { plan } = usePlan();
  const requiredPlan = (FEATURE_MAP[feature] ?? 'free') as Plan;
  const allowed = planCanAccess(plan, requiredPlan);
  return { allowed, requiredPlan, currentPlan: plan };
}

export { PLAN_HIERARCHY };
export type { Plan };
