import { Controller, Get } from "@nestjs/common";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date(),
    };
  }

  @Get("startup")
  getStartupHealth() {
    return this.healthService.getStartupHealth();
  }
}
