import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class TokenPipe implements PipeTransform {
  private static readonly TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
  
  transform(value: string): string {
    if (typeof value !== "string" || !TokenPipe.TOKEN_REGEX.test(value)) {
      throw new BadRequestException("Invalid token format");
    }
    return value;
  }
}