import { gql } from "@apollo/client";

export const GET_WITHDRAWAL_ELIGIBILITY = gql`
  query GetWithdrawalEligibility($proposalId: String!) {
    withdrawalEligibility(proposalId: $proposalId) {
      canVote
      reason
      eligibleVoterCount
      currentYesVotes
      currentNoVotes
      threshold
      yesPercent
      quorumReached
    }
  }
`;

export const GET_PLATFORM_SETTINGS = gql`
  query GetPlatformSettings {
    platformSettings {
      withdrawalThresholdDefault
      withdrawalThresholdMin
      withdrawalThresholdMax
      maintenanceMode
    }
  }
`;

export const GET_COOPERATIVE_SETTINGS = gql`
  query GetCooperativeSettings($cooperativeId: String!) {
    cooperativeSettings(cooperativeId: $cooperativeId) {
      cooperativeId
      withdrawalThreshold
    }
  }
`;

export const GET_WITHDRAWALS = gql`
  query GetWithdrawals($cooperativeId: String!) {
    withdrawals(cooperativeId: $cooperativeId) {
      id
      amountXAF
      destinationType
      recipientName
      status
      disbursedAt
      campayReference
      createdAt
      celoTxUrl
    }
  }
`;
