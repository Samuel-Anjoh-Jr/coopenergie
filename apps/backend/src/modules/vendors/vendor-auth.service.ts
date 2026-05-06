import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  Prisma,
  Role,
  VendorAccountStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { LoginVendorDto } from "./dto/login-vendor.dto";
import { RegisterVendorDto } from "./dto/register-vendor.dto";

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerVendor(dto: RegisterVendorDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists.");
    }

    const slug = await this.generateUniqueSlug(dto.businessName);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const platformSettings = await this.prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            email: dto.email,
            passwordHash,
            name: dto.name,
            role: Role.VENDOR,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const vendor = await transaction.vendor.create({
          data: {
            userId: user.id,
            businessName: dto.businessName,
            slug,
            description: dto.description,
            city: dto.city,
            country: dto.country ?? "CM",
            whatsappNumber: dto.whatsappNumber,
            website: dto.website,
            email: dto.contactEmail,
            status: VendorAccountStatus.PENDING_PAYMENT,
            paymentModel: platformSettings.vendorPaymentModel,
          },
        });

        return { user, vendor };
      });

      return {
        ...result,
        paymentRequired: true,
        platformSettings,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Vendor registration failed due to a conflicting record.");
      }

      throw error;
    }
  }

  async loginVendor(dto: LoginVendorDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
        vendor: true,
      },
    });

    if (!user || user.role !== Role.VENDOR || !user.vendor) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      vendor: user.vendor,
      token,
    };
  }

  private async generateUniqueSlug(businessName: string) {
    const baseSlug = businessName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "vendor";

    let slug = baseSlug;
    let suffix = 2;

    while (await this.prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }
}