import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
      });

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

      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = await this.generateToken(user.id, user.email);

    return {
      user,
      token,
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

  private sanitizeUser<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
