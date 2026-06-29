import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity.js';
import type { LoginDto } from './login.dto.js';
import type { RegisterDto } from './register.dto.js';
import type { UpdateProfileDto } from './update-profile.dto.js';

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  private signToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      displayName: dto.displayName ?? null,
      avatarUrl: null,
      role: 'user',
    });
    await this.users.save(user);

    return { accessToken: this.signToken(user), user: this.toPublic(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { accessToken: this.signToken(user), user: this.toPublic(user) };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    await this.users.save(user);
    return this.toPublic(user);
  }

  async deleteAccount(userId: string) {
    await this.users.delete({ id: userId });
  }
}
