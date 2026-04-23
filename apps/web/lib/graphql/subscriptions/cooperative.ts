import { gql } from "@apollo/client";

export const SUBSCRIPTION_ON_CONTRIBUTION = gql`
  subscription OnContribution($cooperativeId: String!) {
    onContribution(cooperativeId: $cooperativeId) {
      id
      amountXAF
      status
      createdAt
      txHash
    }
  }
`;

export const SUBSCRIPTION_ON_VOTE = gql`
  subscription OnVote($cooperativeId: String!) {
    onVote(cooperativeId: $cooperativeId) {
      vote {
        id
        choice
        createdAt
      }
      proposal {
        id
        title
        status
        yesVotes
        noVotes
      }
    }
  }
`;

export const SUBSCRIPTION_ON_PROPOSAL = gql`
  subscription OnProposal($cooperativeId: String!) {
    onProposal(cooperativeId: $cooperativeId) {
      id
      title
      status
      createdAt
    }
  }
`;
