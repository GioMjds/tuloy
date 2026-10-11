import { PrismaPg } from '@prisma/adapter-pg';
import { AppointmentStatus, PrismaClient, TicketSource, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

process.loadEnvFile?.();

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://tuloy:tuloy@localhost:5432/tuloy?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const passwordHash = await bcrypt.hash('password123', 12);

  // Clean existing seed records
  await prisma.appointment.deleteMany();
  await prisma.queueTicket.deleteMany();
  await prisma.queueCounter.deleteMany();
  await prisma.service.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.business.deleteMany();

  // 1. Barbershop (Short services, walk-in + remote mix)
  const barbershop = await prisma.business.create({
    data: {
      slug: 'gupit-master',
      name: 'Gupit Master Barbershop',
      category: 'Barbershop',
      openTime: '09:00',
      closeTime: '19:00',
      timezone: 'Asia/Manila',
      owners: {
        create: {
          email: 'barber@tuloy.ph',
          passwordHash,
          name: 'Mang Tomas',
        },
      },
      services: {
        create: [
          { name: 'Gupit Regular', durationMin: 20, priceCentavos: 12000 },
          { name: 'Gupit + Ahit', durationMin: 30, priceCentavos: 18000 },
          { name: 'Hair Color & Treatment', durationMin: 45, priceCentavos: 35000 },
          { name: 'Gupit Pambata', durationMin: 15, priceCentavos: 10000 },
        ],
      },
    },
    include: { services: true },
  });

  const [regularCut, cutAndShave, hairColor, kidsCut] = barbershop.services;

  await prisma.queueCounter.create({
    data: {
      businessId: barbershop.id,
      queueDate: today,
      lastNumber: 9,
    },
  });

  const barberTickets = [
    { num: 1, code: 'W-001', name: 'Kuya Cardo', status: TicketStatus.DONE, service: regularCut, source: TicketSource.WALK_IN },
    { num: 2, code: 'W-002', name: 'Sir Jojo', status: TicketStatus.DONE, service: cutAndShave, source: TicketSource.WALK_IN },
    { num: 3, code: 'W-003', name: 'Arnel Ramos', status: TicketStatus.SERVING, service: regularCut, source: TicketSource.WALK_IN },
    { num: 4, code: 'A-004', name: 'Mark Bautista', status: TicketStatus.CALLED, service: hairColor, source: TicketSource.REMOTE },
    { num: 5, code: 'W-005', name: 'Baby James', status: TicketStatus.WAITING, service: kidsCut, source: TicketSource.WALK_IN },
    { num: 6, code: 'W-006', name: 'Christian Cruz', status: TicketStatus.WAITING, service: regularCut, source: TicketSource.WALK_IN },
    { num: 7, code: 'A-007', name: 'Dexter Santos', status: TicketStatus.WAITING, service: cutAndShave, source: TicketSource.REMOTE },
    { num: 8, code: 'W-008', name: 'Lito Lapid', status: TicketStatus.SKIPPED, service: regularCut, source: TicketSource.WALK_IN },
    { num: 9, code: 'A-009', name: 'Paolo Reyes', status: TicketStatus.NO_SHOW, service: regularCut, source: TicketSource.REMOTE },
  ];

  for (const t of barberTickets) {
    await prisma.queueTicket.create({
      data: {
        businessId: barbershop.id,
        serviceId: t.service.id,
        number: t.num,
        displayCode: t.code,
        customerName: t.name,
        source: t.source,
        status: t.status,
        queueDate: today,
        calledAt: [TicketStatus.CALLED, TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        servedAt: [TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        completedAt: t.status === TicketStatus.DONE ? new Date() : null,
      },
    });
  }

  // 2. Medical Clinic (Appointment-heavy)
  const clinic = await prisma.business.create({
    data: {
      slug: 'klinika-bulacan',
      name: 'Klinika Bulacan Family Health',
      category: 'Medical Clinic',
      openTime: '08:00',
      closeTime: '17:00',
      timezone: 'Asia/Manila',
      owners: {
        create: {
          email: 'dok@tuloy.ph',
          passwordHash,
          name: 'Dr. Maria Santos',
        },
      },
      services: {
        create: [
          { name: 'General Consultation', durationMin: 20, priceCentavos: 40000 },
          { name: 'Follow-up Checkup', durationMin: 15, priceCentavos: 25000 },
          { name: 'Medical Certificate', durationMin: 10, priceCentavos: 15000 },
          { name: 'Flu Vaccine', durationMin: 15, priceCentavos: 60000 },
        ],
      },
    },
    include: { services: true },
  });

  const [consultation, followup, medCert] = clinic.services;

  await prisma.queueCounter.create({
    data: {
      businessId: clinic.id,
      queueDate: today,
      lastNumber: 8,
    },
  });

  const clinicTickets = [
    { num: 1, code: 'A-001', name: 'Teresa Aquino', status: TicketStatus.DONE, service: consultation, source: TicketSource.REMOTE },
    { num: 2, code: 'W-002', name: 'Tatay Ramon', status: TicketStatus.DONE, service: followup, source: TicketSource.WALK_IN },
    { num: 3, code: 'A-003', name: 'Elena Torres', status: TicketStatus.SERVING, service: consultation, source: TicketSource.REMOTE },
    { num: 4, code: 'W-004', name: 'Grace Lim', status: TicketStatus.CALLED, service: medCert, source: TicketSource.WALK_IN },
    { num: 5, code: 'A-005', name: 'Reynaldo Yap', status: TicketStatus.WAITING, service: consultation, source: TicketSource.REMOTE },
    { num: 6, code: 'A-006', name: 'Ana Patricia', status: TicketStatus.WAITING, service: followup, source: TicketSource.REMOTE },
    { num: 7, code: 'W-007', name: 'Carlos Dizon', status: TicketStatus.WAITING, service: consultation, source: TicketSource.WALK_IN },
    { num: 8, code: 'A-008', name: 'Benigno Cruz', status: TicketStatus.SKIPPED, service: consultation, source: TicketSource.REMOTE },
  ];

  for (const t of clinicTickets) {
    await prisma.queueTicket.create({
      data: {
        businessId: clinic.id,
        serviceId: t.service.id,
        number: t.num,
        displayCode: t.code,
        customerName: t.name,
        source: t.source,
        status: t.status,
        queueDate: today,
        calledAt: [TicketStatus.CALLED, TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        servedAt: [TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        completedAt: t.status === TicketStatus.DONE ? new Date() : null,
      },
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 20);

  await prisma.appointment.create({
    data: {
      businessId: clinic.id,
      serviceId: consultation.id,
      customerName: 'Manuel Roxas',
      phone: '09171234567',
      startsAt: tomorrow,
      endsAt: tomorrowEnd,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // 3. Vulcanizing & Motor Repair (Walk-in heavy)
  const repairShop = await prisma.business.create({
    data: {
      slug: 'bilis-repair',
      name: 'Bilis Vulcanizing & Motor Works',
      category: 'Auto Repair',
      openTime: '07:30',
      closeTime: '18:00',
      timezone: 'Asia/Manila',
      owners: {
        create: {
          email: 'mekaniko@tuloy.ph',
          passwordHash,
          name: 'Mang Boyong',
        },
      },
      services: {
        create: [
          { name: 'Vulcanizing (Tubeless Patch)', durationMin: 15, priceCentavos: 8000 },
          { name: 'Change Oil Motorcycle', durationMin: 20, priceCentavos: 15000 },
          { name: 'Brake Pad Replacement', durationMin: 30, priceCentavos: 25000 },
          { name: 'Tune-up & Carb Cleaning', durationMin: 45, priceCentavos: 35000 },
        ],
      },
    },
    include: { services: true },
  });

  const [patchService, changeOil, brakeService] = repairShop.services;

  await prisma.queueCounter.create({
    data: {
      businessId: repairShop.id,
      queueDate: today,
      lastNumber: 8,
    },
  });

  const repairTickets = [
    { num: 1, code: 'W-001', name: 'Rider Noel', status: TicketStatus.DONE, service: patchService, source: TicketSource.WALK_IN },
    { num: 2, code: 'W-002', name: 'Kuya Bong', status: TicketStatus.DONE, service: changeOil, source: TicketSource.WALK_IN },
    { num: 3, code: 'W-003', name: 'Junjun Delivery', status: TicketStatus.SERVING, service: patchService, source: TicketSource.WALK_IN },
    { num: 4, code: 'W-004', name: 'Rico Motor', status: TicketStatus.CALLED, service: brakeService, source: TicketSource.WALK_IN },
    { num: 5, code: 'W-005', name: 'Mang Tonyo', status: TicketStatus.WAITING, service: changeOil, source: TicketSource.WALK_IN },
    { num: 6, code: 'W-006', name: 'Kuya Bert', status: TicketStatus.WAITING, service: patchService, source: TicketSource.WALK_IN },
    { num: 7, code: 'A-007', name: 'Sir Dante', status: TicketStatus.WAITING, service: changeOil, source: TicketSource.REMOTE },
    { num: 8, code: 'W-008', name: 'Nonoy Angkas', status: TicketStatus.SKIPPED, service: patchService, source: TicketSource.WALK_IN },
  ];

  for (const t of repairTickets) {
    await prisma.queueTicket.create({
      data: {
        businessId: repairShop.id,
        serviceId: t.service.id,
        number: t.num,
        displayCode: t.code,
        customerName: t.name,
        source: t.source,
        status: t.status,
        queueDate: today,
        calledAt: [TicketStatus.CALLED, TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        servedAt: [TicketStatus.SERVING, TicketStatus.DONE].includes(t.status) ? new Date() : null,
        completedAt: t.status === TicketStatus.DONE ? new Date() : null,
      },
    });
  }

  console.log('Seed completed successfully for 3 shops:');
  console.log('1. Gupit Master Barbershop (slug: gupit-master, owner: barber@tuloy.ph)');
  console.log('2. Klinika Bulacan (slug: klinika-bulacan, owner: dok@tuloy.ph)');
  console.log('3. Bilis Vulcanizing & Motor Works (slug: bilis-repair, owner: mekaniko@tuloy.ph)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
