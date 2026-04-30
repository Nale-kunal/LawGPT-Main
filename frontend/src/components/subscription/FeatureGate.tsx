import React from 'react';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { AccessDeniedOverlay } from './AccessDeniedOverlay';

interface FeatureGateProps {
  feature:  string;
  children: React.ReactNode;
}

/**
 * FeatureGate
 * ───────────
 * Wraps a page and shows AccessDeniedOverlay over the content area only.
 * The overlay is absolute-positioned inside a relative/overflow-hidden
 * wrapper so the sidebar and header remain fully interactive —
 * users can always click away to another page.
 *
 * overflow-hidden clips any wide page content so the centering of the
 * overlay card is always relative to the visible container, not the
 * scrollable canvas.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children }) => {
  const { allowed, requiredPlan } = usePlanAccess(feature);

  return (
    <div
      className="relative w-full"
      // overflow-hidden ensures the absolute overlay stretches only as
      // wide/tall as the visible content pane, not the scrollable canvas.
      style={{ minHeight: '100%', overflow: allowed ? 'visible' : 'hidden' }}
    >
      {/* Render children so the page is mounted (no flash on plan change) */}
      {children}

      {/* Overlay is rendered after children so it paints on top */}
      {!allowed && (
        <AccessDeniedOverlay feature={feature} requiredPlan={requiredPlan} inline />
      )}
    </div>
  );
};
