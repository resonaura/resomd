import { Database, Resource } from '@adminjs/typeorm';
import AdminJS, { type ResourceWithOptions } from 'adminjs';
import { validate } from 'class-validator';

import { Document } from '../files/document.entity.js';
import { Folder } from '../files/folder.entity.js';
import { User } from '../users/user.entity.js';

AdminJS.registerAdapter({ Database, Resource });
Resource.validate = validate;

export const ADMIN_ENTITIES = [User, Folder, Document];

// Must be called only after every entity in ADMIN_ENTITIES has been bound to
// a DataSource via `useDataSource()` — AdminJS's TypeORM adapter resolves
// each resource's metadata through that binding at construction time.
export function createAdminPanel(): AdminJS {
  const resources: ResourceWithOptions[] = [
    {
      resource: User,
      options: {
        parent: { name: 'Accounts', icon: 'Users' },
        properties: {
          passwordHash: { isVisible: false },
          email: { isTitle: true },
        },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },
    {
      resource: Folder,
      options: {
        parent: { name: 'Files', icon: 'Folder' },
        properties: { name: { isTitle: true } },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },
    {
      resource: Document,
      options: {
        parent: { name: 'Files', icon: 'FileText' },
        properties: {
          name: { isTitle: true },
          content: { type: 'textarea' },
        },
        sort: { sortBy: 'updatedAt', direction: 'desc' },
      },
    },
  ];

  return new AdminJS({
    resources,
    rootPath: '/admin',
    branding: { companyName: 'ResoMD Admin' },
  });
}
