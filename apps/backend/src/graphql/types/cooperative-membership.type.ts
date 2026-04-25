import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CooperativeMembershipType {
  @Field()
  role!: string;
}
