import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt-payload.js';
import { CreateDocumentDto } from './create-document.dto.js';
import { CreateFolderDto } from './create-folder.dto.js';
import { FilesService } from './files.service.js';
import { UpdateDocumentDto } from './update-document.dto.js';
import { UpdateFolderDto } from './update-folder.dto.js';

@Controller({ path: 'files' })
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('tree')
  getTree(@CurrentUser() user: AuthenticatedUser) {
    return this.filesService.getTree(user.id);
  }

  @Post('folder')
  createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto
  ) {
    return this.filesService.createFolder(user.id, dto);
  }

  @Put('folder/:id')
  updateFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto
  ) {
    return this.filesService.updateFolder(user.id, id, dto);
  }

  @Delete('folder/:id')
  deleteFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.filesService.deleteFolder(user.id, id);
  }

  @Post('document')
  createDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto
  ) {
    return this.filesService.createDocument(user.id, dto);
  }

  @Get('document/:id')
  getDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.filesService.getDocument(user.id, id);
  }

  @Put('document/:id')
  updateDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto
  ) {
    return this.filesService.updateDocument(user.id, id, dto);
  }

  @Delete('document/:id')
  deleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.filesService.deleteDocument(user.id, id);
  }
}
