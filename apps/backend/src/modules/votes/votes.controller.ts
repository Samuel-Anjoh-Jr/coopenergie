import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CastVoteDto } from "./dto/cast-vote.dto";
import { VotesService } from "./votes.service";

@Controller("votes")
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  cast(
    @CurrentUser() user: { userId: string },
    @Body() castVoteDto: CastVoteDto,
  ) {
    return this.votesService.cast(
      user.userId,
      castVoteDto.proposalId,
      castVoteDto.choice,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("proposal/:proposalId")
  getByProposal(@Param("proposalId") proposalId: string) {
    return this.votesService.getByProposal(proposalId);
  }
}
