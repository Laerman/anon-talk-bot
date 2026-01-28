import { UnisenderTestButton } from '@/components/extensions/unisender-go/UnisenderTestButton';

const UNISENDER_API_URL = 'https://functions.poehali.dev/247d5464-e31c-4337-ad41-850d8829f826';

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <UnisenderTestButton apiUrl={UNISENDER_API_URL} />
    </div>
  );
}
