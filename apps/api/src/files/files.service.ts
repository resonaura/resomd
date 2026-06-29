import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateDocumentDto } from './create-document.dto.js';
import type { CreateFolderDto } from './create-folder.dto.js';
import { Document } from './document.entity.js';
import { Folder } from './folder.entity.js';
import type { UpdateDocumentDto } from './update-document.dto.js';
import type { UpdateFolderDto } from './update-folder.dto.js';

export interface FileTreeFolder {
  id: string;
  type: 'folder';
  name: string;
  parentId: string | null;
  children: FileTreeNode[];
}

export interface FileTreeDocument {
  id: string;
  type: 'document';
  name: string;
  folderId: string | null;
  updatedAt: Date;
}

export type FileTreeNode = FileTreeFolder | FileTreeDocument;

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(Folder) private readonly folders: Repository<Folder>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>
  ) {}

  async getTree(ownerId: string): Promise<FileTreeNode[]> {
    const [folders, documents] = await Promise.all([
      this.folders.find({ where: { ownerId } }),
      this.documents.find({ where: { ownerId } }),
    ]);

    const folderNodes = new Map<string, FileTreeFolder>(
      folders.map(folder => [
        folder.id,
        {
          id: folder.id,
          type: 'folder' as const,
          name: folder.name,
          parentId: folder.parentId,
          children: [],
        },
      ])
    );

    const roots: FileTreeNode[] = [];

    for (const folder of folderNodes.values()) {
      if (folder.parentId && folderNodes.has(folder.parentId)) {
        folderNodes.get(folder.parentId)!.children.push(folder);
      } else {
        roots.push(folder);
      }
    }

    for (const doc of documents) {
      const node: FileTreeDocument = {
        id: doc.id,
        type: 'document',
        name: doc.name,
        folderId: doc.folderId,
        updatedAt: doc.updatedAt,
      };
      if (doc.folderId && folderNodes.has(doc.folderId)) {
        folderNodes.get(doc.folderId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createFolder(ownerId: string, dto: CreateFolderDto) {
    if (dto.parentId) {
      await this.assertFolderOwnership(ownerId, dto.parentId);
    }
    const folder = this.folders.create({
      name: dto.name,
      parentId: dto.parentId ?? null,
      ownerId,
    });
    return this.folders.save(folder);
  }

  async updateFolder(ownerId: string, id: string, dto: UpdateFolderDto) {
    const folder = await this.assertFolderOwnership(ownerId, id);
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new ForbiddenException('A folder cannot be its own parent');
      }
      if (dto.parentId) {
        await this.assertFolderOwnership(ownerId, dto.parentId);
      }
      folder.parentId = dto.parentId;
    }
    if (dto.name !== undefined) folder.name = dto.name;
    return this.folders.save(folder);
  }

  async createDocument(ownerId: string, dto: CreateDocumentDto) {
    if (dto.folderId) {
      await this.assertFolderOwnership(ownerId, dto.folderId);
    }
    const document = this.documents.create({
      name: dto.name,
      content: dto.content ?? '',
      folderId: dto.folderId ?? null,
      ownerId,
    });
    return this.documents.save(document);
  }

  async getDocument(ownerId: string, id: string) {
    return this.assertDocumentOwnership(ownerId, id);
  }

  async updateDocument(ownerId: string, id: string, dto: UpdateDocumentDto) {
    const document = await this.assertDocumentOwnership(ownerId, id);
    if (dto.folderId !== undefined) {
      if (dto.folderId) {
        await this.assertFolderOwnership(ownerId, dto.folderId);
      }
      document.folderId = dto.folderId;
    }
    if (dto.name !== undefined) document.name = dto.name;
    if (dto.content !== undefined) document.content = dto.content;
    return this.documents.save(document);
  }

  async deleteFolder(ownerId: string, id: string) {
    await this.assertFolderOwnership(ownerId, id);
    await this.deleteFolderRecursive(ownerId, id);
  }

  async deleteDocument(ownerId: string, id: string) {
    await this.assertDocumentOwnership(ownerId, id);
    await this.documents.delete({ id, ownerId });
  }

  private async deleteFolderRecursive(ownerId: string, folderId: string) {
    const childFolders = await this.folders.find({
      where: { ownerId, parentId: folderId },
    });
    for (const child of childFolders) {
      await this.deleteFolderRecursive(ownerId, child.id);
    }
    await this.documents.delete({ ownerId, folderId });
    await this.folders.delete({ id: folderId, ownerId });
  }

  private async assertFolderOwnership(ownerId: string, id: string) {
    const folder = await this.folders.findOne({ where: { id, ownerId } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  private async assertDocumentOwnership(ownerId: string, id: string) {
    const document = await this.documents.findOne({ where: { id, ownerId } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }
}
