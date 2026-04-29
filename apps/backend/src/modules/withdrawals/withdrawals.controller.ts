import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateWithdrawalProposalDto } from "./dto/create-withdrawal-proposal.dto";
import { DisbursementService } from "./disbursement.service";
import { WithdrawalsService } from "./withdrawals.service";

@Controller("withdrawals")
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly disbursementService: DisbursementService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("propose")
  createWithdrawalProposal(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateWithdrawalProposalDto,
  ) {
    return this.withdrawalsService.createWithdrawalProposal(
      user.userId,
      dto.cooperativeId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("cooperative/:cooperativeId")
  findByCooperative(@Param("cooperativeId") cooperativeId: string) {
    return this.withdrawalsService.findByCooperative(cooperativeId);
  }

  @Get("webhook")
  handleWebhookGet(
    @Query() query: Record<string, unknown>,
    @Req() request: any,
  ) {
    return this.disbursementService.handleWebhook(
      this.normalizePayload(query),
      request.headers ?? {},
      undefined,
    );
  }

  @Post("webhook")
  handleWebhook(@Body() body: Record<string, unknown>, @Req() request: any) {
    return this.disbursementService.handleWebhook(
      this.normalizePayload(body),
      request.headers ?? {},
      request.rawBody,
    );
  }

  private normalizePayload(payload: Record<string, unknown>) {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload || {})) {
      normalized[key] = Array.isArray(value) ? value[0] : value;
    }

    return normalized;
  }
}
