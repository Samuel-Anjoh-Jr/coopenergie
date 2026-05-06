import { gql } from "@apollo/client";

export const GET_MONETISATION_SETTINGS = gql`
  query GetMonetisationSettings {
    monetisationSettings {
      withdrawalFeePercent
      vendorPaymentModel
      vendorOneTimeFeeXAF
      vendorMonthlyFeeXAF
      vendorYearlyFeeXAF
    }
  }
`;

export const GET_MARKETING_VENDORS = gql`
  query GetMarketingVendors {
    vendors {
      id
      businessName
      description
      logoUrl
      rankScore
      products {
        id
        title
      }
    }
  }
`;
