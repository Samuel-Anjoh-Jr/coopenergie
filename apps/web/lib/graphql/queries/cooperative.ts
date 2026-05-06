import { gql } from "@apollo/client";

export const GET_MY_COOPERATIVES = gql`
  query GetMyCooperatives {
    myCooperatives {
      id
      name
      slug
      targetAmountXAF
      confirmedBalanceXAF
      vaultAddress
      createdAt
      membership {
        role
      }
    }
  }
`;

export const GET_COOPERATIVE_DETAIL = gql`
  query GetCooperativeDetail($id: String!) {
    cooperative(id: $id) {
      id
      name
      slug
      baseTargetXAF
      targetAmountXAF
      vaultAddress
      celoScanUrl
      progress
      totalCollected
      memberCount
      members {
        id
        name
        email
        role
        joinedAt
        totalContributed
      }
      recentActivity {
        id
        type
        payload
        txHash
        blockNumber
        celoScanUrl
        createdAt
      }
    }
  }
`;

export const GET_COOPERATIVE_REPORT = gql`
  query GetCooperativeReport($cooperativeId: String!) {
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
