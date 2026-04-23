import { Injectable, NotFoundException } from "@nestjs/common";
import { DevicePlatform } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

type ProfileUpdateInput = {
  name: string;
  celoAddress?: string;
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
        celoKeyEncrypted: true,
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

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(id: string, data: ProfileUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        celoAddress: data.celoAddress,
      },
      select: {
        id: true,
        email: true,
        name: true,
        celoAddress: true,
        celoKeyEncrypted: true,
        createdAt: true,
        updatedAt: true,
        withdrawalPhone: true,
        withdrawalOperator: true,
        withdrawalBankName: true,
        withdrawalBankAccount: true,
      },
    });
  }

  async storeCeloKey(id: string, encryptedKey: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        celoKeyEncrypted: encryptedKey,
      },
      select: {
        id: true,
        email: true,
        name: true,
        celoAddress: true,
        celoKeyEncrypted: true,
        createdAt: true,
        updatedAt: true,
        withdrawalPhone: true,
        withdrawalOperator: true,
        withdrawalBankName: true,
        withdrawalBankAccount: true,
      },
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
