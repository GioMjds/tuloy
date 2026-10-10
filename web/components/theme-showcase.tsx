"use client";

import * as React from "react";
import { toast } from "sonner";
import { SparklesIcon, BellIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function ThemeShowcase() {
  const [ticketNumber, setTicketNumber] = React.useState(15);

  const handleIssueTicket = () => {
    const nextNum = ticketNumber + 1;
    setTicketNumber(nextNum);
    toast.success(`Na-isyu ang ticket W-0${nextNum}!`, {
      description: "Kasama na sa waiting queue stream ng barbershop.",
    });
  };

  return (
    <Card className="w-full border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Shadcn & Theming Preview</CardTitle>
          <Badge variant="secondary">Dark Mode Ready</Badge>
        </div>
        <CardDescription>
          Mga handang gamiting UI components para sa counter tablet, queue display, at customer portal.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Component Tabs */}
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets">Queue Status</TabsTrigger>
            <TabsTrigger value="toasts">Toast (Sonner)</TabsTrigger>
            <TabsTrigger value="dialog">Modal (Dialog)</TabsTrigger>
          </TabsList>

          {/* Tab 1: Queue Status Badges */}
          <TabsContent value="tickets" className="flex flex-col gap-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Mga status badges na may mataas na contrast para sa shop lighting:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Serving (W-014)</Badge>
              <Badge variant="secondary">Waiting (4 katao)</Badge>
              <Badge variant="outline">A-008 (Online)</Badge>
              <Badge variant="destructive">No-show</Badge>
            </div>
          </TabsContent>

          {/* Tab 2: Toast Feedback */}
          <TabsContent value="toasts" className="flex flex-col gap-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Subukan ang instant feedback toasts kapag may aksyon sa pila:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleIssueTicket}>
                <SparklesIcon data-icon="inline-start" />
                Mag-isyu ng W-0{ticketNumber + 1}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.info("Online Synced", {
                    description: "Lahat ng outbox items ay matagumpay na na-sync.",
                  })
                }
              >
                <BellIcon data-icon="inline-start" />
                Subukan ang Sync Toast
              </Button>
            </div>
          </TabsContent>

          {/* Tab 3: Dialog Modal */}
          <TabsContent value="dialog" className="flex flex-col gap-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Accessible dialog para sa staff action confirmation o customer ticket view:
            </p>
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="secondary" className="w-fit">
                    Buksan ang Sample Dialog
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kumpirmahin ang Pag-call</DialogTitle>
                  <DialogDescription>
                    Tawagin si <strong>Kuya Mark (W-014)</strong> sa Station 1 para sa Gupit Klasiko?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline">Kanselahin</Button>} />
                  <DialogClose
                    render={
                      <Button
                        onClick={() =>
                          toast.success("Tinawag si Kuya Mark (W-014)!")
                        }
                      >
                        <CheckIcon data-icon="inline-start" />
                        Tawagin Na
                      </Button>
                    }
                  />
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Lahat ng components ay gumagamit ng semantic design tokens (bg-background, text-foreground, border-border).
      </CardFooter>
    </Card>
  );
}
