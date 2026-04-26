import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { plainToInstance } from "class-transformer";

import { PrismaService } from "../../prisma/prisma.service";
import { UserResponseDto } from "../users/dto/user-response.dto";
import { UsersService } from "../users/users.service";
import { WalletService } from "../../blockchain/wallet.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
  ) {}

  async register(email: string, password: string, name: string) {
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      // Generate Celo wallet
      const wallet = this.walletService.generateWallet();

      // Create user with wallet details
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          celoAddress: wallet.address,
          celoKeyEncrypted: wallet.encryptedPrivateKey,
        },
      });

      this.logger.log(`User registered with wallet: ${wallet.address}`);

      // Store encrypted key via users service (for audit trail if needed)
      await this.usersService.storeCeloKey(user.id, wallet.encryptedPrivateKey);

      const token = await this.generateToken(user.id, user.email);

      return {
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A user with this email already exists.");
      }

      this.logger.error("Registration failed", error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isPlatformAdmin: true },
    });

    const token = await this.generateToken(user.id, user.email);

    return {
      user,
      token,
      isPlatformAdmin: dbUser?.isPlatformAdmin ?? false,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async generateToken(userId: string, email: string) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
    });
  }

  private sanitizeUser(user: Record<string, unknown>): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
