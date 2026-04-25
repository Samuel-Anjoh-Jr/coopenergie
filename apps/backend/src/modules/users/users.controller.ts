import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { UnregisterDeviceTokenDto } from "./dto/unregister-device-token.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  updateMe(
    @CurrentUser() user: { userId: string },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("device-token")
  async registerDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() registerDeviceTokenDto: RegisterDeviceTokenDto,
  ) {
    await this.usersService.registerDeviceToken(
      user.userId,
      registerDeviceTokenDto.token,
      registerDeviceTokenDto.platform,
    );

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("device-token")
  async unregisterDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() unregisterDeviceTokenDto: UnregisterDeviceTokenDto,
  ) {
    await this.usersService.unregisterDeviceToken(
      user.userId,
      unregisterDeviceTokenDto.token,
    );

    return { success: true };
  }
}
