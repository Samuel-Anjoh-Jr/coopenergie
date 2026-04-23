import { gql } from "@apollo/client";

export const GET_CONTRIBUTIONS = gql`
  query GetContributions($cooperativeId: String!) {
    contributions(cooperativeId: $cooperativeId) {
      id
      amountXAF
      txHash
      status
      createdAt
      userName
    }
  }
`;
