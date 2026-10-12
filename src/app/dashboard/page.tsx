import type { Metadata } from 'next';
import DashboardContent from './DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard – TaskFlow',
  description: 'Your TaskFlow dashboard. View your teams and recent tasks.',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
