import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import Cta from '@/components/home/Cta';

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <Features />
      <Cta />
    </div>
  );
}
