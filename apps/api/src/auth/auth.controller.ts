import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './jwt-payload.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';
import { UpdateProfileDto } from './update-profile.dto.js';

@Controller({ path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.deleteAccount(user.id);
  }
}
