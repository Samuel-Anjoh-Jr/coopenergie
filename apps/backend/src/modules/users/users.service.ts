import { Injectable, NotFoundException } from "@nestjs/common";
import { DevicePlatform } from "@prisma/client";
import { plainToInstance } from "class-transformer";

import { PrismaService } from "../../prisma/prisma.service";
import { UserResponseDto } from "./dto/user-response.dto";

type ProfileUpdateInput = {
  name: string;
  celoAddress?: string;
  preferredWithdrawalMethod?: string;
  withdrawalPhone?: string;
  withdrawalBankName?: string;
  withdrawalBankAccount?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        celoAddress: true,
        createdAt: true,
        updatedAt: true,
        withdrawalPhone: true,
        withdrawalOperator: true,
        withdrawalBankName: true,
        withdrawalBankAccount: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(id: string, data: ProfileUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        celoAddress: data.celoAddress,
        withdrawalOperator: data.preferredWithdrawalMethod,
        withdrawalPhone: data.withdrawalPhone,
        withdrawalBankName: data.withdrawalBankName,
        withdrawalBankAccount: data.withdrawalBankAccount,
      },
      select: {
        id: true,
        email: true,
        name: true,
        celoAddress: true,
        createdAt: true,
        updatedAt: true,
        withdrawalPhone: true,
        withdrawalOperator: true,
        withdrawalBankName: true,
        withdrawalBankAccount: true,
      },
    });
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async storeCeloKey(id: string, encryptedKey: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        celoKeyEncrypted: encryptedKey,
      },
      select: {
        id: true,
        email: true,
        name: true,
        celoAddress: true,
        createdAt: true,
        updatedAt: true,
        withdrawalPhone: true,
        withdrawalOperator: true,
        withdrawalBankName: true,
        withdrawalBankAccount: true,
      },
    });
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
      },
      create: {
        userId,
        token,
        platform,
      },
    });
  }

  async unregisterDeviceToken(userId: string, token: string) {
    return this.prisma.deviceToken.deleteMany({
      where: {
        token,
        userId,
      },
    });
  }

  async removeStaleToken(token: string) {
    return this.prisma.deviceToken.deleteMany({
      where: {
        token,
      },
    });
  }
}
