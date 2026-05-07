import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, VendorAccountStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { S3Service } from "../../common/services/s3.service";
import { GetActiveVendorsQueryDto } from "./dto/get-active-vendors-query.dto";
import { UpdateVendorContactDto } from "./dto/update-vendor-contact.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";

type VendorListItem = Prisma.VendorGetPayload<{
  include: {
    products: {
      include: {
        images: true;
      };
    };
  };
}>;

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async getPublicProfile(vendorIdOrSlug: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        status: { not: VendorAccountStatus.SUSPENDED },
        OR: [{ id: vendorIdOrSlug }, { slug: vendorIdOrSlug }],
      },
      include: {
        products: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    return this.resolveVendorMediaUrls(vendor);
  }

  async getActiveVendors(filters: GetActiveVendorsQueryDto = {}) {
    const where: Prisma.VendorWhereInput = {
      status: VendorAccountStatus.ACTIVE,
    };

    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
        {
          products: {
            some: {
              title: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: "insensitive" };
    }

    if (
      typeof filters.minRating === "number" &&
      !Number.isNaN(filters.minRating)
    ) {
      where.avgRating = { gte: filters.minRating };
    }

    if (
      typeof filters.minPriceXAF === "number" ||
      typeof filters.maxPriceXAF === "number"
    ) {
      where.products = {
        some: {
          priceXAF: {
            ...(typeof filters.minPriceXAF === "number"
              ? { gte: filters.minPriceXAF }
              : {}),
            ...(typeof filters.maxPriceXAF === "number"
              ? { lte: filters.maxPriceXAF }
              : {}),
          },
        },
      };
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      include: {
        products: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: this.getOrderBy(filters.sortBy),
    });

    const sorted = this.sortVendors(vendors, filters.sortBy);
    return Promise.all(
      sorted.map((vendor) => this.resolveVendorMediaUrls(vendor)),
    );
  }

  async updateProfile(vendorId: string, dto: UpdateVendorProfileDto) {
    await this.ensureVendorExists(vendorId);

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        businessName: dto.businessName,
        description: dto.description,
        logoUrl: dto.logoUrl,
        coverImageUrl: dto.coverImageUrl,
        city: dto.city,
        country: dto.country,
      },
    });
  }

  async updateContactInfo(vendorId: string, dto: UpdateVendorContactDto) {
    await this.ensureVendorExists(vendorId);

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        email: dto.email,
        whatsappNumber: dto.whatsappNumber,
        website: dto.website,
        facebookUrl: dto.facebookUrl,
        instagramUrl: dto.instagramUrl,
        twitterUrl: dto.twitterUrl,
        linkedinUrl: dto.linkedinUrl,
      },
    });
  }

  async updateLogo(vendorId: string, logoUrl: string) {
    const currentVendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, logoUrl: true },
    });

    if (!currentVendor) {
      throw new NotFoundException("Vendor not found.");
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { logoUrl },
    });

    return this.resolveVendorMediaUrls(updated);
  }

  async updateCover(vendorId: string, coverImageUrl: string) {
    const currentVendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, coverImageUrl: true },
    });

    if (!currentVendor) {
      throw new NotFoundException("Vendor not found.");
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { coverImageUrl },
    });

    return this.resolveVendorMediaUrls(updated);
  }

  async getVendorMediaUrls(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { logoUrl: true, coverImageUrl: true },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    return this.resolveVendorMediaUrls(vendor);
  }

  private async resolveVendorMediaUrls<
    T extends {
      logoUrl?: string | null;
      coverImageUrl?: string | null;
      products?: Array<{
        images?: Array<{
          url: string;
        }>;
      }>;
    },
  >(vendor: T) {
    const logoUrl = vendor.logoUrl
      ? await this.s3Service.getAccessibleUrl(vendor.logoUrl)
      : vendor.logoUrl;
    const coverImageUrl = vendor.coverImageUrl
      ? await this.s3Service.getAccessibleUrl(vendor.coverImageUrl)
      : vendor.coverImageUrl;

    const products = vendor.products
      ? await Promise.all(
          vendor.products.map(async (product) => ({
            ...product,
            images: product.images
              ? await Promise.all(
                  product.images.map(async (image) => ({
                    ...image,
                    url: await this.s3Service.getAccessibleUrl(image.url),
                  })),
                )
              : product.images,
          })),
        )
      : vendor.products;

    return {
      ...vendor,
      logoUrl,
      coverImageUrl,
      products,
    };
  }

  async getDashboardStats(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        status: true,
        avgRating: true,
        totalReviews: true,
        _count: {
          select: {
            products: true,
            proposalLinks: true,
          },
        },
        subscriptions: {
          orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            expiresAt: true,
          },
        },
        proposalLinks: {
          where: {
            proposal: {
              status: "APPROVED",
            },
          },
          select: { id: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    return {
      totalProducts: vendor._count.products,
      totalProposalsReceived: vendor._count.proposalLinks,
      totalAcceptedProposals: vendor.proposalLinks.length,
      avgRating: vendor.avgRating,
      totalReviews: vendor.totalReviews,
      accountStatus: vendor.status,
      subscriptionExpiresAt: vendor.subscriptions[0]?.expiresAt ?? null,
    };
  }

  async getSubscriptionHistory(vendorId: string) {
    await this.ensureVendorExists(vendorId);

    return this.prisma.vendorSubscriptionRecord.findMany({
      where: { vendorId },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  private async ensureVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }
  }

  private getOrderBy(
    sortBy?: GetActiveVendorsQueryDto["sortBy"],
  ):
    | Prisma.VendorOrderByWithRelationInput
    | Prisma.VendorOrderByWithRelationInput[] {
    switch (sortBy) {
      case "rating":
        return [{ avgRating: "desc" }, { rankScore: "desc" }];
      case "name":
        return { businessName: "asc" };
      case "newest":
        return { createdAt: "desc" };
      case "price_asc":
      case "price_desc":
      case "ranking":
      default:
        return [{ rankScore: "desc" }, { avgRating: "desc" }];
    }
  }

  private sortVendors(
    vendors: VendorListItem[],
    sortBy?: GetActiveVendorsQueryDto["sortBy"],
  ) {
    if (sortBy !== "price_asc" && sortBy !== "price_desc") {
      return vendors;
    }

    return [...vendors].sort((left, right) => {
      const leftPrice = this.getVendorPriceBoundary(left, sortBy);
      const rightPrice = this.getVendorPriceBoundary(right, sortBy);

      return sortBy === "price_asc"
        ? leftPrice - rightPrice
        : rightPrice - leftPrice;
    });
  }

  private getVendorPriceBoundary(
    vendor: VendorListItem,
    sortBy: "price_asc" | "price_desc",
  ) {
    const prices = vendor.products.map((product) => product.priceXAF);

    if (prices.length === 0) {
      return sortBy === "price_asc" ? Number.MAX_SAFE_INTEGER : 0;
    }

    return sortBy === "price_asc" ? Math.min(...prices) : Math.max(...prices);
  }
}
