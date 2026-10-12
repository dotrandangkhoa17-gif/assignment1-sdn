import type { Metadata } from 'next';
import TeamsContent from './TeamsContent';

export const metadata: Metadata = {
  title: 'Teams – TaskFlow',
  description: 'Manage your teams and collaborate effectively.',
};

export default function TeamsPage() {
  return <TeamsContent />;
}
