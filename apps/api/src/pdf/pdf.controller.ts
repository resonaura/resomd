import { Body, Controller, Header, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';

import { GeneratePdfDto } from './generate-pdf.dto.js';
import { PdfService } from './pdf.service.js';

@Controller({ path: 'pdf' })
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'application/pdf')
  // Each request launches a real headless Chromium page — much more
  // expensive than a typical REST call, so this gets its own tight limit
  // instead of relying on the API-wide default.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async generate(
    @Body() dto: GeneratePdfDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const filename = (dto.filename ?? 'document.pdf').replace(
      /[^a-z0-9._-]/gi,
      '_'
    );
    const pdf = await this.pdfService.generate(
      dto.html,
      dto.css ?? '',
      filename
    );

    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return pdf;
  }
}
