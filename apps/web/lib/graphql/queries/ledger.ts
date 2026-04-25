import { gql } from "@apollo/client";

export const GET_LEDGER = gql`
  query GetLedger(
    $cooperativeId: String!
    $type: String
    $limit: Int
    $offset: Int
  ) {
    ledger(
      cooperativeId: $cooperativeId
      type: $type
      limit: $limit
      offset: $offset
    ) {
      id
      type
      payload
      txHash
      blockNumber
      celoScanUrl
      createdAt
    }
  }
`;
