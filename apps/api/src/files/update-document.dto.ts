import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  @IsOptional()
  folderId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(5_000_000)
  content?: string;
}
