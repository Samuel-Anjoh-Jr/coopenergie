import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    if (ctx.getType<string>() === "graphql") {
      const gqlContext = GqlExecutionContext.create(ctx);
      return gqlContext.getContext().req?.user;
    }

    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
