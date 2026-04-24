import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@UseGuards(JwtAuthGuard)
	@Post("initiate")
	initiate(
		@CurrentUser() user: { userId: string },
		@Body() body: InitiatePaymentDto,
	) {
		return this.paymentsService.initiate(
			user.userId,
			body.cooperativeId,
			body.idempotencyKey,
			body.amountXAF,
			body.phoneNumber,
		);
	}
}

@Controller("payments/webhook")
export class PaymentsWebhookController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@Post()
	handleWebhook(@Req() request: any) {
		const rawBodyBuffer: Buffer | undefined = request.body;
		const rawBody = rawBodyBuffer?.toString("utf8") || "";
		let payload: Record<string, unknown> = {};

		if (rawBody) {
			try {
				payload = JSON.parse(rawBody) as Record<string, unknown>;
			} catch {
				throw new BadRequestException("Invalid webhook payload.");
			}
		}

		const signature =
			request.headers?.["x-campay-signature"] ||
			request.headers?.["campay-signature"] ||
			request.headers?.["x-signature"] ||
			"";

		return this.paymentsService.handleWebhook(
			payload,
			String(signature),
			rawBody,
		);
	}
}
