import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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

  @Post("webhook")
  handleWebhook(@Body() body: Record<string, unknown>, @Req() request: any) {
    return this.disbursementService.handleWebhook(
      body,
      request.headers ?? {},
      request.rawBody,
    );
  }
}
