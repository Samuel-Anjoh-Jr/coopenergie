import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { S3Service } from "../../common/services/s3.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVendorProductDto } from "./dto/create-vendor-product.dto";
import { UpdateVendorProductDto } from "./dto/update-vendor-product.dto";

@Injectable()
export class VendorProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createProduct(
    vendorId: string,
    dto: CreateVendorProductDto,
    files: Express.Multer.File[] = [],
  ) {
    await this.ensureVendorOwnership(vendorId);

    const product = await this.prisma.vendorProduct.create({
      data: {
        vendorId,
        title: dto.title,
        description: dto.description,
        priceXAF: dto.priceXAF,
        unit: dto.unit,
        inStock: dto.inStock ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    for (const [index, file] of files.entries()) {
      const url = await this.s3Service.uploadFile(file, "vendor-products");
      await this.prisma.vendorProductImage.create({
        data: {
          productId: product.id,
          url,
          sortOrder: index,
        },
      });
    }

    return this.prisma.vendorProduct.findUnique({
      where: { id: product.id },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  async updateProduct(
    vendorId: string,
    productId: string,
    dto: UpdateVendorProductDto,
    newFiles: Express.Multer.File[] = [],
  ) {
    const product = await this.ensureProductOwnership(vendorId, productId);

    if (dto.deleteImageIds?.length) {
      const imagesToDelete = await this.prisma.vendorProductImage.findMany({
        where: {
          id: { in: dto.deleteImageIds },
          productId,
        },
      });

      for (const image of imagesToDelete) {
        await this.s3Service.deleteFile(image.url);
      }

      await this.prisma.vendorProductImage.deleteMany({
        where: {
          id: { in: imagesToDelete.map((image) => image.id) },
        },
      });
    }

    await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: {
        title: dto.title,
        description: dto.description,
        priceXAF: dto.priceXAF,
        unit: dto.unit,
        inStock: dto.inStock,
        sortOrder: dto.sortOrder,
      },
    });

    const existingImageCount = await this.prisma.vendorProductImage.count({
      where: { productId },
    });

    for (const [index, file] of newFiles.entries()) {
      const url = await this.s3Service.uploadFile(file, "vendor-products");
      await this.prisma.vendorProductImage.create({
        data: {
          productId: product.id,
          url,
          sortOrder: existingImageCount + index,
        },
      });
    }

    return this.prisma.vendorProduct.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  async deleteProduct(vendorId: string, productId: string) {
    const product = await this.ensureProductOwnership(vendorId, productId);

    for (const image of product.images) {
      await this.s3Service.deleteFile(image.url);
    }

    await this.prisma.vendorProduct.delete({
      where: { id: productId },
    });

    return { success: true };
  }

  async deleteProductImage(vendorId: string, productId: string, imageId: string) {
    const product = await this.ensureProductOwnership(vendorId, productId);
    const image = product.images.find((productImage) => productImage.id === imageId);

    if (!image) {
      throw new NotFoundException("Product image not found.");
    }

    await this.s3Service.deleteFile(image.url);
    await this.prisma.vendorProductImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }

  async reorderProducts(vendorId: string, orderedIds: string[]) {
    await this.ensureVendorOwnership(vendorId);

    const products = await this.prisma.vendorProduct.findMany({
      where: {
        vendorId,
        id: { in: orderedIds },
      },
      select: { id: true },
    });

    if (products.length !== orderedIds.length) {
      throw new ForbiddenException("One or more products do not belong to this vendor.");
    }

    await this.prisma.$transaction(
      orderedIds.map((productId, index) =>
        this.prisma.vendorProduct.update({
          where: { id: productId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getProductsByVendor(vendorId);
  }

  async getProductsByVendor(vendorId: string, publicOnly = false) {
    await this.ensureVendorOwnership(vendorId);

    return this.prisma.vendorProduct.findMany({
      where: {
        vendorId,
        ...(publicOnly ? { inStock: true } : {}),
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  private async ensureVendorOwnership(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new ForbiddenException("Vendor access is required.");
    }

    return vendor;
  }

  private async ensureProductOwnership(vendorId: string, productId: string) {
    const product = await this.prisma.vendorProduct.findFirst({
      where: {
        id: productId,
        vendorId,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Vendor product not found.");
    }

    return product;
  }
}