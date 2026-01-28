import { UnisenderTestButton } from '@/components/extensions/unisender-go/UnisenderTestButton';

const UNISENDER_API_URL = 'https://functions.poehali.dev/d80779ed-ebd5-4d70-a58e-f229bb09a18d';

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <UnisenderTestButton apiUrl={UNISENDER_API_URL} />
    </div>
  );
}