import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsUUID()
  @IsOptional()
  folderId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5_000_000)
  content?: string;
}
