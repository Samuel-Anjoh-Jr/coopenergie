import { gql } from "@apollo/client";

export const GET_PROPOSALS = gql`
  query GetProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      title
      description
      status
      type
      yesVotes
      noVotes
      txHash
      hasUserVoted
      createdAt
      withdrawalRequest {
        amountXAF
        destinationType
        status
      }
    }
  }
`;
export const GET_PROPOSALS_WITH_VENDOR = gql`
  query GetProposalsWithVendor($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      title
      description
      status
      type
      yesVotes
      noVotes
      txHash
      hasUserVoted
      createdAt
      withdrawalRequest {
        amountXAF
        destinationType
        status
      }
      vendorLink {
        id
        note
        vendor {
          id
          businessName
          logoUrl
        }
        product {
          id
          title
          description
          priceXAF
          unit
        }
      }
    }
  }
`;
