import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GeneratePdfDto {
  /** Rendered innerHTML of the markdown preview (not raw markdown). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000_000)
  html!: string;

  /** Concatenated CSS text (Tailwind + index.css) the client resolved client-side. */
  @IsString()
  @IsOptional()
  @MaxLength(2_000_000)
  css?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  filename?: string;
}
