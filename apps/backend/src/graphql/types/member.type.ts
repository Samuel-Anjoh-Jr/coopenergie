import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class MemberType {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field(() => Date)
  joinedAt!: Date;

  @Field(() => Int)
  totalContributed!: number;
}
