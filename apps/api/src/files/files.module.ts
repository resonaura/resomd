import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from './document.entity.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { Folder } from './folder.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, Document])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [TypeOrmModule, FilesService],
})
export class FilesModule {}
