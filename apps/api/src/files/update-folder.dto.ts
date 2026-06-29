import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;
}
