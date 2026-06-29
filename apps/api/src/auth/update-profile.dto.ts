import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  displayName?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  avatarUrl?: string;
}
