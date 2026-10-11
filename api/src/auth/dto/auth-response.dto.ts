export class AuthOwnerDto {
  id: string;
  email: string;
  businessId: string;
}

export class AuthResponseDto {
  accessToken: string;
  owner: AuthOwnerDto;
}
