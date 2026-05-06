"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/shared/StarRating";

// ─────────────────────── GraphQL ────────────────────────
const GET_BROWSER_VENDORS = gql`
  query GetBrowserVendors(
    $search: String
    $city: String
    $minRating: Float
    $minPriceXAF: Float
    $maxPriceXAF: Float
    $sortBy: VendorSortBy
  ) {
    vendors(
      search: $search
      city: $city
      minRating: $minRating
      minPriceXAF: $minPriceXAF
      maxPriceXAF: $maxPriceXAF
      sortBy: $sortBy
    ) {
      id
      businessName
      description
      logoUrl
      city
      avgRating
      totalReviews
      rankScore
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

// ─────────────────────── Types ────────────────────────
export type VendorBrowserVendor = {
  id: string;
  businessName: string;
  description: string;
  logoUrl?: string | null;
  city?: string | null;
  avgRating: number;
  totalReviews: number;
  rankScore: number;
  products: {
    id: string;
    title: string;
    description: string;
    priceXAF: number;
    unit?: string | null;
    images: { id: string; url: string; altText?: string | null }[];
  }[];
};

export type VendorSelection = {
  vendor: VendorBrowserVendor;
  product?: VendorBrowserVendor["products"][number] | null;
};

type SortOption =
  | "ranking"
  | "rating"
  | "name"
  | "priceAsc"
  | "priceDesc"
  | "recent";

const SORT_TO_ENUM: Record<SortOption, string> = {
  ranking: "RANKING",
  rating: "RATING",
  name: "NAME",
  priceAsc: "PRICE_ASC",
  priceDesc: "PRICE_DESC",
  recent: "NEWEST",
};

const SORT_LABELS: Record<SortOption, { en: string; fr: string }> = {
  ranking: { en: "Ranking", fr: "Classement" },
  rating: { en: "Rating", fr: "Note" },
  name: { en: "Name", fr: "Nom" },
  priceAsc: { en: "Price ↑", fr: "Prix croissant" },
  priceDesc: { en: "Price ↓", fr: "Prix décroissant" },
  recent: { en: "Newest", fr: "Plus récent" },
};

const PAGE_SIZE = 12;

// ─────────────────────── Helpers ────────────────────────
function formatXaf(v: number) {
  return v.toLocaleString("fr-CM") + " XAF";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─────────────────────── Sub-views ────────────────────────
function ProductSubView({
  vendor,
  onSelect,
  onSkip,
  locale,
}: {
  vendor: VendorBrowserVendor;
  onSelect: (product: VendorBrowserVendor["products"][number]) => void;
  onSkip: () => void;
  locale: string;
}) {
  const isFr = locale.startsWith("fr");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {isFr
          ? "Choisissez un produit ou sélectionnez le fournisseur sans produit spécifique."
          : "Choose a product or select the vendor without a specific product."}
      </p>

      <div className="grid gap-3">
        {vendor.products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary hover:bg-primary/5 transition-all"
          >
            {product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.title}
                className="h-16 w-16 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                {isFr ? "Pas d'img" : "No img"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {product.title}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {product.description}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {formatXaf(product.priceXAF)}
                {product.unit ? ` / ${product.unit}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>

      <Button variant="outline" onClick={onSkip} className="w-full">
        {isFr
          ? "Sélectionner le fournisseur sans produit spécifique"
          : "Select vendor without specific product"}
      </Button>
    </div>
  );
}

// ─────────────────────── VendorCard ────────────────────────
function VendorCard({
  vendor,
  onSelect,
  locale,
}: {
  vendor: VendorBrowserVendor;
  onSelect: () => void;
  locale: string;
}) {
  const isFr = locale.startsWith("fr");
  const firstProduct = vendor.products[0];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
      {/* Logo + Name */}
      <div className="flex items-center gap-3">
        {vendor.logoUrl ? (
          <img
            src={vendor.logoUrl}
            alt={vendor.businessName}
            className="h-12 w-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
            {initials(vendor.businessName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {vendor.businessName}
          </p>
          {vendor.city && (
            <p className="text-xs text-muted-foreground">{vendor.city}</p>
          )}
        </div>
      </div>

      {/* Stars + reviews */}
      <div className="flex items-center gap-2">
        <StarRating rating={vendor.avgRating} size="sm" />
        <span className="text-xs text-muted-foreground">
          {vendor.avgRating.toFixed(1)} ({vendor.totalReviews})
        </span>
      </div>

      {/* First product */}
      {firstProduct ? (
        <p className="text-xs text-muted-foreground truncate">
          {vendor.products.length > 1
            ? `${vendor.products.length} ${isFr ? "produits disponibles" : "products available"}`
            : `${firstProduct.title} — ${formatXaf(firstProduct.priceXAF)}`}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {isFr ? "Aucun produit" : "No products"}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() =>
            window.open(`/${locale}/vendors/${vendor.id}`, "_blank")
          }
        >
          {isFr ? "Voir le profil" : "View profile"}
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={onSelect}>
          {isFr ? "Sélectionner" : "Select"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────── Main Modal ────────────────────────
type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: VendorSelection) => void;
  locale?: string;
};

export function VendorBrowserModal({
  open,
  onClose,
  onSelect,
  locale = "fr",
}: Props) {
  const isFr = locale.startsWith("fr");

  // Filters state
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>("ranking");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Product sub-view state
  const [productVendor, setProductVendor] =
    useState<VendorBrowserVendor | null>(null);

  const deferredSearch = useDeferredValue(search);

  const { data, loading } = useQuery<{ vendors: VendorBrowserVendor[] }>(
    GET_BROWSER_VENDORS,
    {
      variables: {
        search: deferredSearch || undefined,
        city: city !== "all" ? city : undefined,
        minRating,
        sortBy: SORT_TO_ENUM[sort],
      },
      skip: !open,
      fetchPolicy: "cache-and-network",
    },
  );

  const vendors = data?.vendors ?? [];

  // Derived city list from data
  const cities = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (v.city) set.add(v.city);
    });
    return Array.from(set).sort();
  }, [vendors]);

  // Pagination
  const paged = useMemo(
    () => vendors.slice(0, page * PAGE_SIZE),
    [vendors, page],
  );
  const hasMore = paged.length < vendors.length;

  const handleVendorSelect = useCallback(
    (vendor: VendorBrowserVendor) => {
      if (vendor.products.length > 0) {
        setProductVendor(vendor);
      } else {
        onSelect({ vendor, product: null });
      }
    },
    [onSelect],
  );

  const handleProductSelect = useCallback(
    (product: VendorBrowserVendor["products"][number]) => {
      if (!productVendor) return;
      onSelect({ vendor: productVendor, product });
      setProductVendor(null);
    },
    [onSelect, productVendor],
  );

  const handleSkipProduct = useCallback(() => {
    if (!productVendor) return;
    onSelect({ vendor: productVendor, product: null });
    setProductVendor(null);
  }, [onSelect, productVendor]);

  const handleClose = useCallback(() => {
    setProductVendor(null);
    setSearch("");
    setCity("all");
    setMinRating(undefined);
    setSort("ranking");
    setPage(1);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-card border-border w-[calc(100%-1rem)] max-w-4xl mx-auto rounded-t-2xl sm:rounded-xl fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-none px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              {productVendor
                ? isFr
                  ? "Choisir un produit"
                  : "Choose a product"
                : isFr
                  ? "Choisir un fournisseur"
                  : "Choose a vendor"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {productVendor
                ? isFr
                  ? "Sélectionnez un produit pour ce fournisseur"
                  : "Select a product for this vendor"
                : isFr
                  ? "Parcourez et sélectionnez un fournisseur"
                  : "Browse and select a vendor"}
            </DialogDescription>
            <button
              onClick={handleClose}
              className="rounded-full p-1 hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {productVendor && (
            <button
              onClick={() => setProductVendor(null)}
              className="text-xs text-primary hover:underline text-left"
            >
              ← {isFr ? "Retour à la liste" : "Back to list"}
            </button>
          )}
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {productVendor ? (
            <ProductSubView
              vendor={productVendor}
              onSelect={handleProductSelect}
              onSkip={handleSkipProduct}
              locale={locale}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    isFr
                      ? "Rechercher par nom ou description..."
                      : "Search by name or description..."
                  }
                  className="pl-9 h-11"
                />
              </div>

              {/* Sort bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground shrink-0">
                  {isFr ? "Trier :" : "Sort:"}
                </span>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSort(key);
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      sort === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {isFr ? SORT_LABELS[key].fr : SORT_LABELS[key].en}
                  </button>
                ))}
              </div>

              {/* Filters (collapsible on mobile) */}
              <div className="rounded-lg border border-border bg-muted/30">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium md:hidden"
                  onClick={() => setFiltersOpen((p) => !p)}
                >
                  {isFr ? "Filtres" : "Filters"}
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <div
                  className={`${filtersOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row gap-3 p-3`}
                >
                  {/* City */}
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">
                      {isFr ? "Ville" : "City"}
                    </label>
                    <Select
                      value={city}
                      onValueChange={(v) => {
                        setCity(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue
                          placeholder={
                            isFr ? "Toutes les villes" : "All cities"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">
                          {isFr ? "Toutes" : "All"}
                        </SelectItem>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rating */}
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">
                      {isFr ? "Note minimale" : "Min rating"}
                    </label>
                    <Select
                      value={
                        minRating !== undefined ? String(minRating) : "all"
                      }
                      onValueChange={(v) => {
                        setMinRating(v === "all" ? undefined : parseFloat(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">
                          {isFr ? "Toutes" : "All"}
                        </SelectItem>
                        <SelectItem value="3">
                          3+ {isFr ? "étoiles" : "stars"}
                        </SelectItem>
                        <SelectItem value="4">
                          4+ {isFr ? "étoiles" : "stars"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Vendor grid */}
              {loading && vendors.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : vendors.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {isFr ? "Aucun fournisseur trouvé." : "No vendors found."}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paged.map((vendor) => (
                      <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        onSelect={() => handleVendorSelect(vendor)}
                        locale={locale}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="mt-2 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {isFr ? "Voir plus" : "Load more"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
