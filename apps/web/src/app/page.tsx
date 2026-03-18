import { APP_NAME } from "@steady/shared";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <p className="text-muted-foreground text-lg">Clinician Dashboard & Clinical Assessment System</p>
      <Button>Get Started</Button>
    </main>
  );
}
