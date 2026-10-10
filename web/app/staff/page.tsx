'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ModeToggle } from '@/components/mode-toggle';

interface Ticket {
  id: string;
  number: string; // e.g. "W-012" or "A-007"
  nickname: string;
  phone?: string;
  service: string;
  price: number;
  durationMinutes: number;
  source: 'staff' | 'qr' | 'online';
  status: 'waiting' | 'called' | 'serving' | 'done' | 'skipped' | 'no_show';
  joinedAt: Date;
  startedAt?: Date;
}

interface OutboxAction {
  id: string;
  type:
    | 'CREATE_WALK_IN'
    | 'CALL_TICKET'
    | 'FINISH_TICKET'
    | 'SKIP_TICKET'
    | 'NO_SHOW_TICKET';
  ticketId: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

const AVAILABLE_SERVICES = [
  { id: 'gupit', name: 'Gupit Klasiko', price: 200, duration: 25 },
  { id: 'gupit-ahit', name: 'Gupit + Ahit', price: 300, duration: 40 },
  { id: 'ahit-shave', name: 'Ahit & Hot Towel', price: 150, duration: 20 },
  { id: 'kulay', name: 'Kulay (Black/Brown)', price: 500, duration: 45 },
  { id: 'bata', name: 'Gupit Pambata', price: 180, duration: 20 },
];

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 't-1',
    number: 'W-014',
    nickname: 'Kuya Mark',
    phone: '0917-555-0192',
    service: 'Gupit Klasiko',
    price: 200,
    durationMinutes: 25,
    source: 'staff',
    status: 'serving',
    joinedAt: new Date(Date.now() - 35 * 60 * 1000),
    startedAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: 't-2',
    number: 'A-008',
    nickname: 'Dennis P.',
    phone: '0928-555-8821',
    service: 'Gupit + Ahit',
    price: 300,
    durationMinutes: 40,
    source: 'qr',
    status: 'waiting',
    joinedAt: new Date(Date.now() - 22 * 60 * 1000),
  },
  {
    id: 't-3',
    number: 'W-015',
    nickname: 'Sir Gary',
    service: 'Ahit & Hot Towel',
    price: 150,
    durationMinutes: 20,
    source: 'staff',
    status: 'waiting',
    joinedAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 't-4',
    number: 'A-009',
    nickname: 'Carlitos',
    service: 'Gupit Pambata',
    price: 180,
    durationMinutes: 20,
    source: 'qr',
    status: 'waiting',
    joinedAt: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: 't-5',
    number: 'W-013',
    nickname: 'Reynaldo',
    service: 'Gupit Klasiko',
    price: 200,
    durationMinutes: 25,
    source: 'staff',
    status: 'skipped',
    joinedAt: new Date(Date.now() - 50 * 60 * 1000),
  },
];

export default function StaffQueuePage() {
  const [, startTransition] = useTransition();
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [isOffline, setIsOffline] = useState(false);
  const [outbox, setOutbox] = useState<OutboxAction[]>([]);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'skipped'>(
    'waiting',
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Walk-in form state
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedService, setSelectedService] = useState(AVAILABLE_SERVICES[0]);
  const [nextWalkInCount, setNextWalkInCount] = useState(16);

  // Counter elapsed timer
  const [elapsedMinutes, setElapsedMinutes] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMinutes((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const servingTicket = tickets.find((t) => t.status === 'serving');

  const waitingTickets = tickets.filter((t) => {
    if (filter === 'waiting')
      return t.status === 'waiting' || t.status === 'called';
    if (filter === 'skipped') return t.status === 'skipped';
    return t.status !== 'done' && t.status !== 'no_show';
  });

  const recordAction = (
    type: OutboxAction['type'],
    ticketId: string,
    payload?: Record<string, unknown>,
  ) => {
    if (isOffline) {
      const newAction: OutboxAction = {
        id: crypto.randomUUID(),
        type,
        ticketId,
        payload,
        timestamp: new Date().toISOString(),
      };
      setOutbox((prev) => [...prev, newAction]);
    }
  };

  const handleFinishCurrent = () => {
    if (!servingTicket) return;
    startTransition(() => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === servingTicket.id ? { ...t, status: 'done' } : t,
        ),
      );
      recordAction('FINISH_TICKET', servingTicket.id);
      setElapsedMinutes(0);
    });
  };

  const handleCallNext = (targetId?: string) => {
    startTransition(() => {
      let nextTicket: Ticket | undefined;
      if (targetId) {
        nextTicket = tickets.find((t) => t.id === targetId);
      } else {
        nextTicket = tickets.find(
          (t) => t.status === 'waiting' || t.status === 'called',
        );
      }

      if (!nextTicket) return;

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === nextTicket!.id) {
            return { ...t, status: 'serving', startedAt: new Date() };
          }
          if (servingTicket && t.id === servingTicket.id) {
            return { ...t, status: 'done' };
          }
          return t;
        }),
      );
      recordAction('CALL_TICKET', nextTicket.id);
      setElapsedMinutes(0);
    });
  };

  const handleSkipCurrent = () => {
    if (!servingTicket) return;
    startTransition(() => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === servingTicket.id ? { ...t, status: 'skipped' } : t,
        ),
      );
      recordAction('SKIP_TICKET', servingTicket.id);
      setElapsedMinutes(0);
    });
  };

  const handleRequeue = (id: string) => {
    startTransition(() => {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'waiting' } : t)),
      );
      recordAction('CALL_TICKET', id, { action: 'requeue' });
    });
  };

  const handleNoShow = () => {
    if (!servingTicket) return;
    startTransition(() => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === servingTicket.id ? { ...t, status: 'no_show' } : t,
        ),
      );
      recordAction('NO_SHOW_TICKET', servingTicket.id);
      setElapsedMinutes(0);
    });
  };

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const formattedNumber = `W-${String(nextWalkInCount).padStart(3, '0')}`;
    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      number: formattedNumber,
      nickname: nickname.trim(),
      phone: phone.trim() || undefined,
      service: selectedService.name,
      price: selectedService.price,
      durationMinutes: selectedService.duration,
      source: 'staff',
      status: 'waiting',
      joinedAt: new Date(),
    };

    startTransition(() => {
      setTickets((prev) => [...prev, newTicket]);
      setNextWalkInCount((c) => c + 1);
      recordAction('CREATE_WALK_IN', newTicket.id, {
        number: newTicket.number,
        nickname: newTicket.nickname,
        service: newTicket.service,
      });
      setNickname('');
      setPhone('');
      setIsDrawerOpen(false);
    });
  };

  const handleToggleOffline = () => {
    if (isOffline) {
      // Reconnecting -> Sync outbox
      const count = outbox.length;
      setIsOffline(false);
      setOutbox([]);
      setSyncToast(
        count > 0
          ? `Nag-sync ang ${count} offline na galaw sa database.`
          : 'Konektado na muli sa server.',
      );
      setTimeout(() => setSyncToast(null), 4000);
    } else {
      setIsOffline(true);
      setSyncToast(
        'Naka-offline mode. Ang mga galaw ay mase-save sa lokal na tablet.',
      );
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          setIsLocked(false);
          setPinInput('');
          setPinError(false);
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput('');
            setPinError(false);
          }, 800);
        }
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 select-none">
      {/* Top Counter Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[oklch(0.48_0.16_269)] text-white font-bold tracking-tight text-lg shadow-sm">
            T
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
              Tuloy Counter
              <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Gwapito Barbershop
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Shop ID: #MNL-001 · Staff: Kuya Jun
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleToggleOffline}
            title="I-toggle ang online/offline simulation"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isOffline
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>
              {isOffline
                ? `Offline (${outbox.length} pending)`
                : 'Online Synced'}
            </span>
          </button>

          <ModeToggle />

          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="flex items-center justify-center h-10 px-3 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 active:bg-slate-200"
            title="I-lock ang screen gamit ang PIN"
          >
            Lock (PIN)
          </button>
        </div>
      </header>

      {/* Sync Toast Alert */}
      {syncToast && (
        <div className="bg-slate-800 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-medium shadow-md">
          {syncToast}
        </div>
      )}

      {/* Offline Outbox Banner */}
      {isOffline && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs font-medium text-amber-950 flex items-center justify-between">
          <span>
            Naka-offline ang counter tablet. Gumagana pa rin ang pag-issue ng{' '}
            <strong>W-</strong> tickets at pagtawag. Magsi-sync ito pagbalik ng
            internet.
          </span>
          <span className="font-bold bg-amber-200 px-2 py-0.5 rounded text-amber-900">
            {outbox.length} outbox queue
          </span>
        </div>
      )}

      {/* Main Split Layout: Serving Hero (Left) + Queue Stream (Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* LEFT / TOP: NOW SERVING HERO */}
        <section
          aria-labelledby="now-serving-heading"
          className="lg:col-span-7 flex flex-col justify-between bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span
                id="now-serving-heading"
                className="text-xs font-bold tracking-wider uppercase text-slate-500"
              >
                Kasalukuyang Sineserbisyuhan (Now Serving)
              </span>
              {servingTicket && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Nasa Upuan (In Chair)
                </span>
              )}
            </div>

            {servingTicket ? (
              <div className="py-6 sm:py-8 flex flex-col gap-4">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="text-6xl sm:text-7xl font-extrabold tracking-tight text-slate-950 font-mono">
                    {servingTicket.number}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">
                      Oras sa upuan
                    </span>
                    <span className="text-lg font-bold text-slate-700 font-mono">
                      {elapsedMinutes} minuto
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {servingTicket.nickname}
                    </h2>
                    <p className="text-sm font-medium text-slate-600 mt-0.5">
                      {servingTicket.service} · ₱{servingTicket.price} (
                      {servingTicket.durationMinutes}m)
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                      servingTicket.source === 'staff'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {servingTicket.source === 'staff'
                      ? 'Walk-in (Counter)'
                      : 'QR Online Join'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 text-2xl font-bold mb-3">
                  -
                </div>
                <h2 className="text-xl font-bold text-slate-700">
                  Walang kasalukuyang sineserbisyuhan
                </h2>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  Pindutin ang &ldquo;Tawagin ang Susunod&rdquo; o magdagdag ng
                  bagong walk-in customer.
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleFinishCurrent}
                disabled={!servingTicket}
                className="h-14 sm:h-16 px-6 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 bg-[oklch(0.48_0.16_269)] hover:bg-[oklch(0.42_0.16_269)] text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span>Tapusin (Done)</span>
                <span className="text-xs font-normal opacity-80 hidden sm:inline">
                  ↵
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCallNext()}
                disabled={waitingTickets.length === 0}
                className="h-14 sm:h-16 px-6 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span>Tawagin ang Susunod (Next)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleSkipCurrent}
                disabled={!servingTicket}
                className="h-12 px-4 rounded-lg font-semibold text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none active:bg-slate-100"
              >
                I-skip (Nasa labas pa)
              </button>

              <button
                type="button"
                onClick={handleNoShow}
                disabled={!servingTicket}
                className="h-12 px-4 rounded-lg font-semibold text-sm border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-40 disabled:pointer-events-none active:bg-red-200"
              >
                No-Show (Umalis na)
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT / BOTTOM: QUEUE STREAM & WALK-IN BAR */}
        <section
          aria-labelledby="queue-stream-heading"
          className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Header & Sticky Add Walk-In Button */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="queue-stream-heading"
                className="text-sm font-bold text-slate-800"
              >
                Susunod sa Pila (Waiting Queue)
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {waitingTickets.length} katao
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-full h-12 rounded-lg font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
            >
              <span className="text-lg leading-none">+</span>
              <span>Magrehistro ng Walk-in (W-)</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 bg-white text-xs font-semibold px-4 pt-2 gap-4">
            <button
              type="button"
              onClick={() => setFilter('waiting')}
              className={`pb-2 border-b-2 transition-colors ${
                filter === 'waiting'
                  ? 'border-[oklch(0.48_0.16_269)] text-[oklch(0.48_0.16_269)] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Naghihintay (
              {tickets.filter((t) => t.status === 'waiting').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('skipped')}
              className={`pb-2 border-b-2 transition-colors ${
                filter === 'skipped'
                  ? 'border-[oklch(0.48_0.16_269)] text-[oklch(0.48_0.16_269)] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Na-skip ({tickets.filter((t) => t.status === 'skipped').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`pb-2 border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-[oklch(0.48_0.16_269)] text-[oklch(0.48_0.16_269)] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Lahat (
              {
                tickets.filter(
                  (t) => t.status !== 'done' && t.status !== 'no_show',
                ).length
              }
              )
            </button>
          </div>

          {/* Queue Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {waitingTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-medium">
                  Walang nakapila sa kategoryang ito.
                </p>
              </div>
            ) : (
              waitingTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-400 w-4 text-center">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-slate-950">
                          {ticket.number}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">
                          {ticket.nickname}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {ticket.service} · ₱{ticket.price}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ticket.status === 'skipped' ? (
                      <button
                        type="button"
                        onClick={() => handleRequeue(ticket.id)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                      >
                        Ibalik sa Pila
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCallNext(ticket.id)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                      >
                        Tawagin Na
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* WALK-IN DRAWER / MODAL */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="walkin-drawer-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
        >
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3
                  id="walkin-drawer-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Magrehistro ng Walk-in
                </h3>
                <p className="text-xs text-slate-500">
                  Mabibigyan ng ticket number:{' '}
                  <strong className="font-mono text-slate-800">
                    W-{String(nextWalkInCount).padStart(3, '0')}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWalkIn} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="walkin-nickname"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Pangalan o Nickname <span className="text-red-500">*</span>
                </label>
                <input
                  id="walkin-nickname"
                  type="text"
                  required
                  autoFocus
                  placeholder="Hal. Kuya Dennis, Boss Jun"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[oklch(0.48_0.16_269)]"
                />
              </div>

              <div>
                <label
                  htmlFor="walkin-phone"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Telepono (Opsyonal)
                </label>
                <input
                  id="walkin-phone"
                  type="tel"
                  placeholder="Hal. 0917-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[oklch(0.48_0.16_269)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Piliin ang Serbisyo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SERVICES.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        selectedService.id === service.id
                          ? 'border-[oklch(0.48_0.16_269)] bg-indigo-50/50 ring-1 ring-[oklch(0.48_0.16_269)]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-900">
                        {service.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ₱{service.price} · {service.duration} mins
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="h-12 px-5 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-700"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-lg text-sm font-bold bg-[oklch(0.48_0.16_269)] hover:bg-[oklch(0.42_0.16_269)] text-white shadow-sm"
                >
                  I-issue ang Ticket (W-
                  {String(nextWalkInCount).padStart(3, '0')})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN LOCK OVERLAY */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-white"
        >
          <div className="flex flex-col items-center gap-6 max-w-xs w-full text-center">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[oklch(0.48_0.16_269)] mx-auto flex items-center justify-center text-xl font-bold mb-3">
                T
              </div>
              <h3 id="lock-title" className="text-xl font-bold">
                Naka-lock ang Counter
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                I-enter ang PIN para ma-access ang queue (Default: 1234)
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-3 my-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border border-slate-600 transition-all ${
                    pinInput.length > index
                      ? 'bg-white scale-110'
                      : 'bg-transparent'
                  } ${pinError ? 'border-red-500 bg-red-500' : ''}`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs font-bold text-red-400">
                Maling PIN. Subukan muli.
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinDigit(num)}
                  className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xl font-bold border border-slate-700 transition-colors"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="h-16 rounded-xl bg-slate-900 text-xs font-semibold text-slate-400 border border-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xl font-bold border border-slate-700 transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPinInput((p) => p.slice(0, -1))}
                className="h-16 rounded-xl bg-slate-900 text-xs font-semibold text-slate-400 border border-slate-800"
              >
                Del
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
