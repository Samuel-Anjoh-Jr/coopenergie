import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ProposalStatus,
  ProposalType,
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { CreateVendorReviewDto } from "./dto/create-vendor-review.dto";

type ReviewEligibilityResult = {
  eligible: boolean;
  proposalId?: string;
  reason?: string;
};

@Injectable()
export class VendorReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkReviewEligibility(
    reviewerId: string,
    vendorId: string,
    cooperativeId: string,
  ): Promise<ReviewEligibilityResult> {
    const proposals = await this.prisma.proposal.findMany({
      where: {
        type: ProposalType.VENDOR_PURCHASE,
        status: ProposalStatus.APPROVED,
        cooperativeId,
        vendorLink: {
          is: {
            vendorId,
          },
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (proposals.length === 0) {
      return {
        eligible: false,
        reason: "No approved vendor purchase proposal was found for this vendor in the cooperative.",
      };
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: reviewerId,
          cooperativeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return {
        eligible: false,
        reason: "Reviewer is not a member of this cooperative.",
      };
    }

    const existingReviews = await this.prisma.vendorReview.findMany({
      where: {
        reviewerId,
        proposalId: {
          in: proposals.map((proposal) => proposal.id),
        },
      },
      select: {
        proposalId: true,
      },
    });

    const reviewedProposalIds = new Set(
      existingReviews.map((review) => review.proposalId),
    );
    const nextEligibleProposal = proposals.find(
      (proposal) => !reviewedProposalIds.has(proposal.id),
    );

    if (!nextEligibleProposal) {
      return {
        eligible: false,
        reason: "Reviewer already submitted a review for the available approved vendor purchase proposal(s).",
      };
    }

    return {
      eligible: true,
      proposalId: nextEligibleProposal.id,
    };
  }

  async createReview(reviewerId: string, dto: CreateVendorReviewDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: {
        id: dto.vendorId,
      },
      select: {
        id: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    const eligibility = await this.checkReviewEligibility(
      reviewerId,
      dto.vendorId,
      dto.cooperativeId,
    );

    if (!eligibility.eligible || !eligibility.proposalId) {
      throw new ForbiddenException(eligibility.reason ?? "Review is not allowed.");
    }

    const review = await this.prisma.vendorReview.create({
      data: {
        vendorId: dto.vendorId,
        reviewerId,
        cooperativeId: dto.cooperativeId,
        proposalId: eligibility.proposalId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.updateVendorRatingCache(dto.vendorId);
    await this.updateVendorRankScore(dto.vendorId);

    return review;
  }

  async getReviewsForVendor(vendorId: string, cooperativeId?: string) {
    const reviews = await this.prisma.vendorReview.findMany({
      where: {
        vendorId,
        ...(cooperativeId ? { cooperativeId } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const reviewerIds = [...new Set(reviews.map((review) => review.reviewerId))];
    const users = reviewerIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: reviewerIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

    const reviewerNameById = new Map(users.map((user) => [user.id, user.name]));

    return reviews.map((review) => ({
      ...review,
      rating: review.rating / 10,
      reviewerName: reviewerNameById.get(review.reviewerId) ?? "Anonymous",
    }));
  }

  async updateVendorRatingCache(vendorId: string) {
    const aggregate = await this.prisma.vendorReview.aggregate({
      where: {
        vendorId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const totalReviews = aggregate._count.id;
    const avgRaw = aggregate._avg.rating ?? 0;
    const avgRating = Number((avgRaw / 10).toFixed(2));

    await this.prisma.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        avgRating,
        totalReviews,
      },
    });
  }

  async updateVendorRankScore(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        id: true,
        createdAt: true,
        avgRating: true,
        totalReviews: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    const totalAcceptedProposals = await this.prisma.proposalVendorLink.count({
      where: {
        vendorId,
        proposal: {
          type: ProposalType.VENDOR_PURCHASE,
          status: ProposalStatus.APPROVED,
        },
      },
    });

    const W = 10;
    const C = 3.0;
    const bayesianScore =
      (W * C + vendor.totalReviews * vendor.avgRating) /
      (W + vendor.totalReviews);

    const daysSinceCreation =
      (Date.now() - vendor.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = daysSinceCreation < 90 ? 0.2 : 0;
    const activityScore = Math.min(totalAcceptedProposals * 0.05, 0.5);

    const rankScore = Number(
      (bayesianScore + recencyBonus + activityScore).toFixed(4),
    );

    await this.prisma.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        rankScore,
      },
    });
  }
}
