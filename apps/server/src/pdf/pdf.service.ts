import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

import {
  injectEmojiImages,
  LOBEHUB_EMOJI_CDN_BASE,
  waitForImagesToSettle,
} from './inject-emoji.js';
import { PDF_PRINT_STYLES } from './print-styles.js';
import { sanitizeRenderedHtml } from './sanitize-html.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;

  async onModuleInit() {
    await this.initBrowser();
  }

  private async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Puppeteer browser launched');

      this.browser.on('disconnected', () => {
        this.logger.warn('Puppeteer browser disconnected!');
        this.browser = null;
      });
    } catch (err) {
      this.logger.error('Failed to launch Puppeteer:', err);
      this.browser = null;
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generate(html: string, css: string, title: string): Promise<Buffer> {
    if (!this.browser || !this.browser.connected) {
      this.logger.warn(
        'Puppeteer browser is missing or disconnected. Re-initializing...'
      );
      await this.initBrowser();
    }

    if (!this.browser) {
      throw new Error('Puppeteer browser is not available');
    }

    const safeHtml = sanitizeRenderedHtml(html);
    const documentHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
<style>${PDF_PRINT_STYLES}</style>
</head>
<body>
<div class="markdown-preview">${safeHtml}</div>
</body>
</html>`;

    const page = await this.browser.newPage();
    try {
      await page.setContent(documentHtml, {
        waitUntil: 'load',
        timeout: 30_000,
      });
      await page.evaluate(injectEmojiImages, LOBEHUB_EMOJI_CDN_BASE);
      await page.evaluate(waitForImagesToSettle);
      await page.evaluate(() => document.fonts.ready);

      const pdf = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
      });

      return Buffer.from(pdf);
    } finally {
      await page.close().catch(err => {
        this.logger.debug?.(
          `Failed to close page (browser might be down): ${err.message}`
        );
      });
    }
  }
}
