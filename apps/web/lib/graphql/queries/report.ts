import { gql } from "@apollo/client";

export const GET_REPORT = gql`
  query GetReport($cooperativeId: String!) {
    report(cooperativeId: $cooperativeId) {
      cooperativeName
      walletAddress
      totalCollected
      targetAmount
      completionPercent
      estimatedMonthsToGoal
      totalProposals
      approvedProposals
      rejectedProposals
      generatedAt
    }
  }
`;
