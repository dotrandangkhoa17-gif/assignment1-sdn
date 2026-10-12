import type { Metadata } from 'next';
import TeamDetailContent from './TeamDetailContent';

export const metadata: Metadata = {
  title: 'Team Details – TaskFlow',
  description: 'View team details, manage members, and track tasks.',
};

export default function TeamDetailPage() {
  return <TeamDetailContent />;
}
