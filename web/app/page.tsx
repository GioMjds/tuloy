import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeShowcase } from "@/components/theme-showcase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRightIcon, TabletIcon, MonitorIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors">
      {/* Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg shadow-xs">
              T
            </div>
            <span className="font-bold text-lg tracking-tight">Tuloy</span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              v0.1.0
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button render={<Link href="/staff" />} size="sm">
              Buksan ang Staff Counter
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 flex flex-col justify-center gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Filipino Walk-in Queue System</Badge>
            <Badge variant="outline">Offline-First</Badge>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Tuloy na po. Walang aberyang pila sa barbershop at salon.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Pinalitan ang notebook at Messenger thread ng live queue. Nag-iisyu ng{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground font-bold">
              W-
            </code>{" "}
            tickets para sa walk-in at{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground font-bold">
              A-
            </code>{" "}
            tickets sa QR scan. Gumagana kahit mawalan ng internet ang tindahan.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border hover:border-foreground/30 transition-all flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  <TabletIcon data-icon="inline-start" />
                  Shop Device
                </Badge>
                <span className="text-xs font-bold text-muted-foreground font-mono">
                  /staff
                </span>
              </div>
              <CardTitle className="text-xl pt-2">Staff Queue Screen</CardTitle>
              <CardDescription>
                Counter tablet UI para tawagin ang susunod, mag-register ng walk-ins, at mag-ipon ng offline actions sa outbox.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 flex items-center justify-between text-xs font-bold">
              <Button render={<Link href="/staff" />} variant="outline" className="w-full">
                Buksan ang Counter Tablet
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-dashed border-border bg-card/60 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  <MonitorIcon data-icon="inline-start" />
                  Shop Wall / TV
                </Badge>
                <span className="text-xs font-bold text-muted-foreground font-mono">
                  Planned
                </span>
              </div>
              <CardTitle className="text-xl pt-2 text-muted-foreground">
                Public Now-Serving Display
              </CardTitle>
              <CardDescription>
                Malaking display para sa waiting room o salamin ng shop na nagpapakita kung sino ang kasalukuyang sineserbisyuhan.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 text-xs font-semibold text-muted-foreground">
              Handa nang i-shape gamit ang /impeccable shape
            </CardFooter>
          </Card>
        </div>

        {/* Shadcn UI & Theming Showcase */}
        <ThemeShowcase />

        {/* System Invariants Highlights */}
        <Card className="bg-muted/40 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Mga Tuntunin ng Disenyo at Arkitektura (Invariants)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs text-muted-foreground">
            <div>
              <strong className="text-foreground block mb-0.5">2 Number Sequences:</strong>
              <code className="font-mono text-foreground font-bold">W-</code> sa staff tablet,{" "}
              <code className="font-mono text-foreground font-bold">A-</code> sa online server.
            </div>
            <div>
              <strong className="text-foreground block mb-0.5">Offline-First Resilience:</strong>
              May outbox queue ang tablet kapag nag-drop ang Wi-Fi o data.
            </div>
            <div>
              <strong className="text-foreground block mb-0.5">Zero Account Friction:</strong>
              Walang app download o password para sa mga kostumer.
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground bg-card">
        Tuloy · Gwapito Barbershop Pilot · Asia/Manila Timezone
      </footer>
    </div>
  );
}
