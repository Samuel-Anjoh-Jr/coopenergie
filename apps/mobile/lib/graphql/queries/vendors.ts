import { gql } from "@apollo/client";

export const CREATE_VENDOR_PROPOSAL_QUERY = gql`
  mutation MobileCreateVendorProposal(
    $cooperativeId: String!
    $title: String!
    $description: String!
    $vendorId: String!
    $productId: String
    $vendorNote: String
  ) {
    createProposal(
      cooperativeId: $cooperativeId
      title: $title
      description: $description
      vendorId: $vendorId
      productId: $productId
      vendorNote: $vendorNote
    ) {
      id
      title
      type
      status
      createdAt
      vendorLink {
        id
        note
        vendor {
          id
          businessName
          logoUrl
          city
          avgRating
          totalReviews
        }
        product {
          id
          title
          priceXAF
          unit
        }
      }
    }
  }
`;

export const GET_VENDORS = gql`
  query MobileGetVendors(
    $search: String
    $sortBy: String
    $city: String
    $minRating: Float
  ) {
    vendors(search: $search, sortBy: $sortBy, city: $city, minRating: $minRating) {
      id
      businessName
      description
      logoUrl
      city
      avgRating
      totalReviews
      products {
        id
        title
        description
        priceXAF
        unit
        images {
          id
          url
          altText
        }
      }
    }
  }
`;

export const GET_VENDOR_DETAIL = gql`
  query MobileGetVendorDetail($id: String!) {
    vendor(id: $id) {
      id
      businessName
      description
      logoUrl
      coverImageUrl
      city
      country
      email
      whatsappNumber
      website
      avgRating
      totalReviews
      products {
        id
        title
        description
        priceXAF
        unit
        images {
          id
          url
          altText
        }
      }
      reviews {
        id
        reviewerName
        rating
        comment
        createdAt
      }
    }
  }
`;

export const GET_APPROVED_VENDOR_PROPOSALS = gql`
  query MobileGetApprovedVendorProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      type
      status
      createdAt
      vendorLink {
        id
        vendor {
          id
          businessName
          logoUrl
          avgRating
          totalReviews
        }
        product {
          id
          title
          priceXAF
          unit
        }
      }
    }
  }
`;

export const GET_REVIEW_ELIGIBILITY = gql`
  query MobileGetReviewEligibility($vendorId: String!, $cooperativeId: String!) {
    vendorReviewEligibility(vendorId: $vendorId, cooperativeId: $cooperativeId) {
      eligible
      reason
    }
  }
`;
