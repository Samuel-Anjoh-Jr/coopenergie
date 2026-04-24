import { ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GqlJwtAuthGuard extends AuthGuard("jwt") {
  getRequest(context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context);
    const contextValue = gqlContext.getContext();

    if (contextValue?.req) {
      return contextValue.req;
    }

    if (contextValue?.extra?.request) {
      return contextValue.extra.request;
    }

    const connectionParams =
      contextValue?.connectionParams ??
      contextValue?.extra?.connectionParams ??
      {};
    const authorization =
      this.readAuthHeader(connectionParams.authorization) ??
      this.readAuthHeader(connectionParams.Authorization) ??
      this.readAuthHeader(connectionParams.authToken) ??
      this.readAuthHeader(connectionParams.token);

    return {
      headers: authorization ? { authorization } : {},
    };
  }

  private readAuthHeader(value: unknown) {
    return typeof value === "string" && value ? value : undefined;
  }
}
