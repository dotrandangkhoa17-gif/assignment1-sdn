import { Suspense } from 'react';
import type { Metadata } from 'next';
import TeamDetailContent from './TeamDetailContent';

export const metadata: Metadata = {
  title: 'Team Details – TaskFlow',
  description: 'View team details, manage members, and track tasks.',
};

export default function TeamDetailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      }
    >
      <TeamDetailContent />
    </Suspense>
  );
}
