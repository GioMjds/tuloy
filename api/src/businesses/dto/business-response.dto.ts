export class ServiceResponseDto {
  id: string;
  name: string;
  durationMin: number;
  priceCentavos: number;
}

// Owner's own shop returned by GET /businesses/mine, used for share links.
export class MyBusinessDto {
  name: string;
  slug: string;
}

// Public shop profile returned by GET /businesses/:slug.
export class BusinessResponseDto {
  name: string;
  slug: string;
  category: string;
  openTime: string; // HH:mm, business tz
  closeTime: string; // HH:mm, business tz
  timezone: string;
  services: ServiceResponseDto[];
}
