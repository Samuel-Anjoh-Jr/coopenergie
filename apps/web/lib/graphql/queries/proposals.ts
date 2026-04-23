import { gql } from "@apollo/client";

export const GET_PROPOSALS = gql`
  query GetProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      title
      description
      status
      yesVotes
      noVotes
      txHash
      hasUserVoted
      createdAt
    }
  }
`;
