import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { VendorGuard } from "../../common/guards/vendor.guard";
import { S3Service } from "../../common/services/s3.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProposalsService } from "../proposals/proposals.service";
import { CreateVendorProductDto } from "./dto/create-vendor-product.dto";
import { CreateVendorReviewDto } from "./dto/create-vendor-review.dto";
import { GetActiveVendorsQueryDto } from "./dto/get-active-vendors-query.dto";
import { InitiateVendorRegistrationPaymentDto } from "./dto/initiate-vendor-registration-payment.dto";
import { InitiateVendorSubscriptionDto } from "./dto/initiate-vendor-subscription.dto";
import { LoginVendorDto } from "./dto/login-vendor.dto";
import { ReorderVendorProductsDto } from "./dto/reorder-vendor-products.dto";
import { RegisterVendorDto } from "./dto/register-vendor.dto";
import { UpdateVendorContactDto } from "./dto/update-vendor-contact.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { UpdateVendorProductDto } from "./dto/update-vendor-product.dto";
import { VendorAuthService } from "./vendor-auth.service";
import { VendorPaymentsService } from "./vendor-payments.service";
import { VendorProductsService } from "./vendor-products.service";
import { VendorReviewsService } from "./vendor-reviews.service";
import { VendorsService } from "./vendors.service";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller("vendors")
export class VendorsController {
  constructor(
    private readonly vendorAuthService: VendorAuthService,
    private readonly vendorPaymentsService: VendorPaymentsService,
    private readonly vendorProductsService: VendorProductsService,
    private readonly vendorReviewsService: VendorReviewsService,
    private readonly vendorsService: VendorsService,
    private readonly proposalsService: ProposalsService,
    private readonly s3Service: S3Service,
  ) {}

  @Post("register")
  registerVendor(@Body() dto: RegisterVendorDto) {
    return this.vendorAuthService.registerVendor(dto);
  }

  @Post("login")
  loginVendor(@Body() dto: LoginVendorDto) {
    return this.vendorAuthService.loginVendor(dto);
  }

  @Get()
  getActiveVendors(@Query() query: GetActiveVendorsQueryDto) {
    return this.vendorsService.getActiveVendors(query);
  }

  @UseGuards(JwtAuthGuard, VendorGuard)
  @Post("payment/register")
  initiateRegistrationPayment(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: InitiateVendorRegistrationPaymentDto,
  ) {
    return this.vendorPaymentsService.initiateOneTimeRegistrationPayment(
      user.vendorId,
      dto.phoneNumber,
    );
  }

  @UseGuards(JwtAuthGuard, VendorGuard)
  @Post("payment/subscribe")
  initiateSubscription(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: InitiateVendorSubscriptionDto,
  ) {
    return this.vendorPaymentsService.initiateSubscription(
      user.vendorId,
      dto.phoneNumber,
      dto.billingCycle,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("reviews")
  createReview(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateVendorReviewDto,
  ) {
    return this.vendorReviewsService.createReview(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("reviews/eligibility")
  checkReviewEligibility(
    @CurrentUser() user: { userId: string },
    @Query("vendorId") vendorId: string,
    @Query("cooperativeId") cooperativeId: string,
  ) {
    return this.vendorReviewsService.checkReviewEligibility(
      user.userId,
      vendorId,
      cooperativeId,
    );
  }

  @Get(":vendorId/reviews")
  getReviewsForVendor(
    @Param("vendorId") vendorId: string,
    @Query("cooperativeId") cooperativeId?: string,
  ) {
    return this.vendorReviewsService.getReviewsForVendor(vendorId, cooperativeId);
  }

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("proposals/cooperative/:cooperativeId/approved-vendor-proposals")
  getApprovedVendorProposals(
    @Param("cooperativeId") cooperativeId: string,
  ) {
    return this.proposalsService.getVendorProposalsForCooperative(cooperativeId);
  }

  @UseGuards(VendorGuard)
  @UseInterceptors(FilesInterceptor("images", 5, uploadOptions))
  @Post("products")
  createProduct(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: CreateVendorProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.vendorProductsService.createProduct(user.vendorId, dto, files);
  }

  @UseGuards(VendorGuard)
  @Patch("products/reorder")
  reorderProducts(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: ReorderVendorProductsDto,
  ) {
    return this.vendorProductsService.reorderProducts(user.vendorId, dto.orderedIds);
  }

  @UseGuards(VendorGuard)
  @UseInterceptors(FilesInterceptor("newImages", 5, uploadOptions))
  @Patch("products/:productId")
  updateProduct(
    @CurrentUser() user: { vendorId: string },
    @Param("productId") productId: string,
    @Body() dto: UpdateVendorProductDto,
    @UploadedFiles() newFiles?: Express.Multer.File[],
  ) {
    return this.vendorProductsService.updateProduct(
      user.vendorId,
      productId,
      dto,
      newFiles,
    );
  }

  @UseGuards(VendorGuard)
  @Delete("products/:productId/images/:imageId")
  deleteProductImage(
    @CurrentUser() user: { vendorId: string },
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
  ) {
    return this.vendorProductsService.deleteProductImage(
      user.vendorId,
      productId,
      imageId,
    );
  }

  @UseGuards(VendorGuard)
  @Delete("products/:productId")
  deleteProduct(
    @CurrentUser() user: { vendorId: string },
    @Param("productId") productId: string,
  ) {
    return this.vendorProductsService.deleteProduct(user.vendorId, productId);
  }

  @UseGuards(VendorGuard)
  @Get("dashboard/me")
  getDashboardStats(
    @CurrentUser() user: { vendorId: string },
  ) {
    return this.vendorsService.getDashboardStats(user.vendorId);
  }

  @UseGuards(VendorGuard)
  @Get("subscriptions")
  getSubscriptionHistory(
    @CurrentUser() user: { vendorId: string },
  ) {
    return this.vendorsService.getSubscriptionHistory(user.vendorId);
  }

  @UseGuards(VendorGuard)
  @UseInterceptors(FileInterceptor("logo", uploadOptions))
  @Post("logo")
  async uploadLogo(
    @CurrentUser() user: { vendorId: string },
    @UploadedFile() logo: Express.Multer.File,
  ) {
    const previousMedia = await this.vendorsService.getVendorMediaUrls(user.vendorId);
    const logoUrl = await this.s3Service.uploadFile(logo, "vendor-logos");

    if (previousMedia.logoUrl) {
      await this.s3Service.deleteFile(previousMedia.logoUrl);
    }

    return this.vendorsService.updateLogo(user.vendorId, logoUrl);
  }

  @UseGuards(VendorGuard)
  @UseInterceptors(FileInterceptor("cover", uploadOptions))
  @Post("cover")
  async uploadCover(
    @CurrentUser() user: { vendorId: string },
    @UploadedFile() cover: Express.Multer.File,
  ) {
    const previousMedia = await this.vendorsService.getVendorMediaUrls(user.vendorId);
    const coverImageUrl = await this.s3Service.uploadFile(cover, "vendor-covers");

    if (previousMedia.coverImageUrl) {
      await this.s3Service.deleteFile(previousMedia.coverImageUrl);
    }

    return this.vendorsService.updateCover(user.vendorId, coverImageUrl);
  }

  @UseGuards(VendorGuard)
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: UpdateVendorProfileDto,
  ) {
    return this.vendorsService.updateProfile(user.vendorId, dto);
  }

  @UseGuards(VendorGuard)
  @Patch("contact")
  updateContactInfo(
    @CurrentUser() user: { vendorId: string },
    @Body() dto: UpdateVendorContactDto,
  ) {
    return this.vendorsService.updateContactInfo(user.vendorId, dto);
  }

  @Get(":slugOrId/products")
  async getProductsByVendor(@Param("slugOrId") slugOrId: string) {
    const vendor = await this.vendorsService.getPublicProfile(slugOrId);

    return this.vendorProductsService.getProductsByVendor(vendor.id, true);
  }

  @Get(":slugOrId")
  getPublicProfile(@Param("slugOrId") slugOrId: string) {
    return this.vendorsService.getPublicProfile(slugOrId);
  }
}