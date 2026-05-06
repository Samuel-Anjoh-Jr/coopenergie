/**
 * CoopEnergie — Production-realistic seed
 * Covers every model in the schema.
 * Safe to re-run (upsert / createMany skipDuplicates throughout).
 *
 * Run:  cd apps/backend && bun run prisma:seed
 */

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

const hash = (pw: string): string => hashSync(pw, 12);

/** Deterministic fake TX hash for seeded ledger events */
const fakeTx = (seed: string) =>
  "0x" + createHash("sha256").update(seed).digest("hex").slice(0, 64);

/** Random int between min and max inclusive */
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Days ago as Date */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Days from now as Date */
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

// ─── Constants ───────────────────────────────────────────────────────────────

const WITHDRAWAL_FEE_PERCENT = 2.5;

// ════════════════════════════════════════════════════════════════════════════
// PLATFORM SETTINGS  (singleton)
// ════════════════════════════════════════════════════════════════════════════

async function seedPlatformSettings() {
  console.log("  ↳ PlatformSettings...");
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      withdrawalThresholdDefault: 60,
      withdrawalThresholdMin: 50,
      withdrawalThresholdMax: 90,
      withdrawalQuorumMinVotes: 3,
      maintenanceMode: false,
      platformName: "CoopEnergie",
      withdrawalFeePercent: WITHDRAWAL_FEE_PERCENT,
      vendorPaymentModel: "ONE_TIME",
      vendorOneTimeFeeXAF: 15000,
      vendorMonthlyFeeXAF: 5000,
      vendorYearlyFeeXAF: 45000,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════════════════

async function seedPlans() {
  console.log("  ↳ Plans...");
  const plans = [
    {
      name: "Gratuit",
      priceXAF: 0,
      billingCycle: "FREE" as const,
      features: {
        maxMembers: 10,
        maxProposals: 5,
        csvExport: false,
        prioritySupport: false,
      },
    },
    {
      name: "Standard",
      priceXAF: 5000,
      billingCycle: "MONTHLY" as const,
      features: {
        maxMembers: 50,
        maxProposals: -1,
        csvExport: true,
        prioritySupport: false,
      },
    },
    {
      name: "Premium",
      priceXAF: 45000,
      billingCycle: "YEARLY" as const,
      features: {
        maxMembers: -1,
        maxProposals: -1,
        csvExport: true,
        prioritySupport: true,
        customBranding: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("  ↳ Users...");

  const users = [
    // ── Platform Admin ──────────────────────────────────────────────────────
    {
      id: "user_admin",
      email: "anjohsamueljr@gmail.com",
      passwordHash: hash("Admin2026!"),
      name: "Administrateur CoopEnergie",
      role: "PLATFORM_ADMIN" as const,
      isPlatformAdmin: true,
      preferredLocale: "fr",
    },

    // ── Cooperative 1 — Bonaberi (COOP_ADMIN) ───────────────────────────────
    {
      id: "user_jean",
      email: "jean@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Jean-Baptiste Akogo",
      role: "COOP_ADMIN" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
      withdrawalPhone: "+237699000001",
      withdrawalOperator: "MTN",
    },
    {
      id: "user_marie",
      email: "marie@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Marie-Claire Ndoumbé",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_pierre",
      email: "pierre@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Pierre Essomba Mbida",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_amara",
      email: "amara@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Amara Diallo",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "en",
    },
    {
      id: "user_sophie",
      email: "sophie@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Sophie Nguetse Fotso",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },

    // ── Cooperative 2 — Yaoundé Lumière (COOP_ADMIN) ────────────────────────
    {
      id: "user_paul",
      email: "paul@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Paul Ekani Nkodo",
      role: "COOP_ADMIN" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
      withdrawalPhone: "+237677000002",
      withdrawalOperator: "ORANGE",
    },
    {
      id: "user_grace",
      email: "grace@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Grace Mbarga Atangana",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_eric",
      email: "eric@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Éric Toukam Kengne",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_fatima",
      email: "fatima@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Fatima Bello Waziri",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },

    // ── Cooperative 3 — Bafoussam Solaire (COOP_ADMIN) ──────────────────────
    {
      id: "user_celestin",
      email: "celestin@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Célestin Feudjou Kamga",
      role: "COOP_ADMIN" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
      withdrawalPhone: "+237655000003",
      withdrawalOperator: "MTN",
      withdrawalBankName: "SCB Cameroun",
      withdrawalBankAccount: "00123456789",
    },
    {
      id: "user_berthe",
      email: "berthe@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Berthe Tonga Waffo",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_rodrigue",
      email: "rodrigue@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Rodrigue Nzouankeu",
      role: "MEMBER" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },

    // ── Vendors ─────────────────────────────────────────────────────────────
    {
      id: "user_vendor1",
      email: "contact@solarcam.cm",
      passwordHash: hash("password123"),
      name: "Directeur SolarCam",
      role: "VENDOR" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_vendor2",
      email: "contact@energieverte.cm",
      passwordHash: hash("password123"),
      name: "Manager EnergieVerte",
      role: "VENDOR" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_vendor3",
      email: "suntech@bafoussam.cm",
      passwordHash: hash("password123"),
      name: "Responsable SunTech",
      role: "VENDOR" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
    {
      id: "user_vendor4",
      email: "demo-vendor@coopenergie.cm",
      passwordHash: hash("password123"),
      name: "Demo Fournisseur",
      role: "VENDOR" as const,
      isPlatformAdmin: false,
      preferredLocale: "fr",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// VENDORS
// ════════════════════════════════════════════════════════════════════════════

async function seedVendors() {
  console.log("  ↳ Vendors...");

  // ── Vendor 1 — SolarCam Yaoundé (active, good ratings) ──────────────────
  await prisma.vendor.upsert({
    where: { id: "vendor_solarcam" },
    update: {},
    create: {
      id: "vendor_solarcam",
      userId: "user_vendor1",
      businessName: "SolarCam Yaoundé",
      slug: "solarcam-yaounde",
      description:
        "Spécialiste des installations solaires résidentielles et communautaires au Cameroun depuis 2018. " +
        "Nous proposons des panneaux monocristallins haute performance, des systèmes hybrides et des micro-grids " +
        "adaptés aux réalités du Cameroun. Certifiés par l'Agence de Régulation du Secteur de l'Électricité (ARSEL). " +
        "Plus de 500 installations réalisées à Yaoundé, Douala et Kribi.",
      logoUrl:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1548613053-22087dd8edb8?w=800&q=80",
      city: "Yaoundé",
      country: "CM",
      email: "contact@solarcam.cm",
      whatsappNumber: "+237699000001",
      website: "https://solarcam.cm",
      facebookUrl: "https://facebook.com/solarcam.cm",
      instagramUrl: "https://instagram.com/solarcam_yaounde",
      status: "ACTIVE",
      paymentModel: "ONE_TIME",
      avgRating: 4.3,
      totalReviews: 12,
      rankScore: 4.61,
    },
  });

  // ── Vendor 2 — EnergieVerte Douala (active, moderate ratings) ────────────
  await prisma.vendor.upsert({
    where: { id: "vendor_energieverte" },
    update: {},
    create: {
      id: "vendor_energieverte",
      userId: "user_vendor2",
      businessName: "EnergieVerte Douala",
      slug: "energieverte-douala",
      description:
        "Distribution en gros de panneaux solaires, batteries et onduleurs à Douala. " +
        "Tarifs coopératifs disponibles pour les groupes de 5 foyers et plus — jusqu'à 20% de remise sur volume. " +
        "Partenaire de Jinko Solar et LONGi pour des produits de qualité internationale. " +
        "Service après-vente avec intervention sous 48h à Douala et périphérie.",
      logoUrl:
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80",
      city: "Douala",
      country: "CM",
      email: "contact@energieverte.cm",
      whatsappNumber: "+237677000002",
      website: "https://energieverte-douala.cm",
      facebookUrl: "https://facebook.com/energieverte.douala",
      status: "ACTIVE",
      paymentModel: "ONE_TIME",
      avgRating: 3.8,
      totalReviews: 7,
      rankScore: 4.02,
    },
  });

  // ── Vendor 3 — SunTech Bafoussam (new vendor, no reviews yet) ────────────
  await prisma.vendor.upsert({
    where: { id: "vendor_suntech" },
    update: {},
    create: {
      id: "vendor_suntech",
      userId: "user_vendor3",
      businessName: "SunTech Bafoussam",
      slug: "suntech-bafoussam",
      description:
        "Jeune entreprise spécialisée dans les équipements solaires accessibles à Bafoussam et la région de l'Ouest. " +
        "Notre mission : rendre l'énergie solaire abordable pour chaque ménage. " +
        "Kits complets avec garantie 2 ans. Installation disponible à domicile.",
      city: "Bafoussam",
      country: "CM",
      email: "suntech@bafoussam.cm",
      whatsappNumber: "+237655000003",
      status: "ACTIVE",
      paymentModel: "ONE_TIME",
      avgRating: 0,
      totalReviews: 0,
      rankScore: 3.22, // Bayesian prior (new vendor still gets a fair shot)
    },
  });

  // ── Vendor 4 — Demo vendor (subscription model, pending) ─────────────────
  await prisma.vendor.upsert({
    where: { id: "vendor_demo" },
    update: {},
    create: {
      id: "vendor_demo",
      userId: "user_vendor4",
      businessName: "Demo Fournisseur Solaire",
      slug: "demo-fournisseur-solaire",
      description:
        "Compte de démonstration pour tester les fonctionnalités fournisseur de CoopEnergie. " +
        "Ce profil illustre ce à quoi ressemble un compte fournisseur en attente de paiement.",
      city: "Yaoundé",
      country: "CM",
      email: "demo-vendor@coopenergie.cm",
      whatsappNumber: "+237699999999",
      status: "PENDING_PAYMENT",
      paymentModel: "SUBSCRIPTION",
      avgRating: 0,
      totalReviews: 0,
      rankScore: 0,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// VENDOR PRODUCTS + IMAGES
// ════════════════════════════════════════════════════════════════════════════

async function seedVendorProducts() {
  console.log("  ↳ VendorProducts & Images...");

  // ── SolarCam products ────────────────────────────────────────────────────
  const solarcamProducts = [
    {
      id: "prod_sc_1",
      vendorId: "vendor_solarcam",
      title: "Kit Solaire 200W — Complet",
      description:
        "1 panneau monocristallin 200W + 1 batterie gel 100Ah + 1 onduleur 1000VA + câblage complet. " +
        "Alimentation 24h pour : 4 ampoules LED + téléviseur + chargeur smartphone. Garantie pièces 3 ans.",
      priceXAF: 185000,
      unit: "par kit",
      inStock: true,
      sortOrder: 0,
      images: [
        {
          id: "img_sc_1_1",
          url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80",
          altText: "Kit solaire 200W complet",
          sortOrder: 0,
        },
        {
          id: "img_sc_1_2",
          url: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80",
          altText: "Panneau solaire installation",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "prod_sc_2",
      vendorId: "vendor_solarcam",
      title: "Installation & Câblage Professionnel",
      description:
        "Prestation complète d'installation par nos techniciens certifiés. Inclut : fixation panneau toiture, " +
        "câblage électrique, mise en service et formation utilisateur (1h). Délai d'intervention 3-5 jours ouvrés.",
      priceXAF: 45000,
      unit: "par installation",
      inStock: true,
      sortOrder: 1,
      images: [
        {
          id: "img_sc_2_1",
          url: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=600&q=80",
          altText: "Installation panneau solaire toiture",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_sc_3",
      vendorId: "vendor_solarcam",
      title: "Pack Communautaire 10 Foyers",
      description:
        "Solution clé en main pour coopératives. 10 kits 200W + installation collective + 1 an maintenance. " +
        "Tarif préférentiel coopérative — économie de 15% vs achat individuel. Formation des référents incluse.",
      priceXAF: 1580000,
      unit: "par pack 10 foyers",
      inStock: true,
      sortOrder: 2,
      images: [
        {
          id: "img_sc_3_1",
          url: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=600&q=80",
          altText: "Quartier équipé en solaire collectif",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_sc_4",
      vendorId: "vendor_solarcam",
      title: "Batterie de Remplacement 100Ah",
      description:
        "Batterie gel 100Ah compatible tous kits SolarCam. Durée de vie 5-7 ans. Garantie 1 an.",
      priceXAF: 65000,
      unit: "par unité",
      inStock: true,
      sortOrder: 3,
      images: [
        {
          id: "img_sc_4_1",
          url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
          altText: "Batterie solaire gel",
          sortOrder: 0,
        },
      ],
    },
  ];

  // ── EnergieVerte products ─────────────────────────────────────────────────
  const energieverteProducts = [
    {
      id: "prod_ev_1",
      vendorId: "vendor_energieverte",
      title: "Panneau Solaire 100W Monocristallin",
      description:
        "Panneau LONGi Solar 100W, rendement 21.3%. Cadre aluminium anodisé, verre trempé anti-reflet. " +
        "Garantie puissance 25 ans. Idéal pour kit débutant ou extension.",
      priceXAF: 35000,
      unit: "par panneau",
      inStock: true,
      sortOrder: 0,
      images: [
        {
          id: "img_ev_1_1",
          url: "https://images.unsplash.com/photo-1548613053-22087dd8edb8?w=600&q=80",
          altText: "Panneau solaire 100W LONGi",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_ev_2",
      vendorId: "vendor_energieverte",
      title: "Batterie Lithium 100Ah LiFePO4",
      description:
        "Batterie lithium fer phosphate, 3000 cycles de vie. 50% plus légère qu'une batterie gel, " +
        "décharge profonde possible jusqu'à 80% sans dommage. Parfaite pour usage intensif.",
      priceXAF: 120000,
      unit: "par batterie",
      inStock: true,
      sortOrder: 1,
      images: [
        {
          id: "img_ev_2_1",
          url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
          altText: "Batterie lithium solaire",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_ev_3",
      vendorId: "vendor_energieverte",
      title: "Pack Communauté 10 Foyers — Entrée de gamme",
      description:
        "10 panneaux 100W + 10 batteries gel 80Ah + 10 régulateurs MPPT 30A + câblage. " +
        "Sans installation — livraison à domicile. Tarif groupé réservé aux coopératives enregistrées.",
      priceXAF: 650000,
      unit: "par pack 10 foyers",
      inStock: true,
      sortOrder: 2,
      images: [
        {
          id: "img_ev_3_1",
          url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
          altText: "Pack solaire communauté",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_ev_4",
      vendorId: "vendor_energieverte",
      title: "Régulateur MPPT 30A",
      description:
        "Régulateur de charge MPPT 30A, compatible 12V/24V. Écran LCD, protection surcharge et court-circuit.",
      priceXAF: 18000,
      unit: "par unité",
      inStock: false, // out of stock example
      sortOrder: 3,
      images: [],
    },
  ];

  // ── SunTech products ──────────────────────────────────────────────────────
  const suntechProducts = [
    {
      id: "prod_st_1",
      vendorId: "vendor_suntech",
      title: "Kit Débutant Solaire 50W",
      description:
        "1 panneau 50W + 1 batterie 40Ah + 1 régulateur 10A + 2 ampoules LED + câblage. " +
        "Parfait pour une première installation. Alimentation 4-6 ampoules et chargeur mobile.",
      priceXAF: 28000,
      unit: "par kit",
      inStock: true,
      sortOrder: 0,
      images: [
        {
          id: "img_st_1_1",
          url: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80",
          altText: "Kit solaire débutant",
          sortOrder: 0,
        },
      ],
    },
    {
      id: "prod_st_2",
      vendorId: "vendor_suntech",
      title: "Kit Intermédiaire Solaire 150W",
      description:
        "1 panneau 150W + 1 batterie 80Ah + onduleur 500W + 4 prises USB. Idéal pour TV + ventilateur.",
      priceXAF: 95000,
      unit: "par kit",
      inStock: true,
      sortOrder: 1,
      images: [
        {
          id: "img_st_2_1",
          url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80",
          altText: "Kit solaire 150W",
          sortOrder: 0,
        },
      ],
    },
  ];

  // Upsert all products and images
  for (const productGroup of [
    solarcamProducts,
    energieverteProducts,
    suntechProducts,
  ]) {
    for (const { images, ...product } of productGroup) {
      await prisma.vendorProduct.upsert({
        where: { id: product.id },
        update: {},
        create: product,
      });
      for (const image of images) {
        await prisma.vendorProductImage.upsert({
          where: { id: image.id },
          update: {},
          create: { ...image, productId: product.id },
        });
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COOPERATIVES
// ════════════════════════════════════════════════════════════════════════════

async function seedCooperatives() {
  console.log("  ↳ Cooperatives...");

  const fee = WITHDRAWAL_FEE_PERCENT / 100;

  // Cooperative 1 — Bonaberi Solaire (80% funded, active)
  const base1 = 850000;
  await prisma.cooperative.upsert({
    where: { id: "coop_bonaberi" },
    update: {},
    create: {
      id: "coop_bonaberi",
      name: "Coopérative Solaire Bonaberi",
      slug: "solaire-bonaberi",
      baseTargetXAF: base1,
      targetAmountXAF: Math.round(base1 * (1 + fee)),
      confirmedBalanceXAF: 680000,
      suspended: false,
      withdrawalsLocked: false,
    },
  });

  // Cooperative 2 — Yaoundé Lumière (recently started, ~30% funded)
  const base2 = 650000;
  await prisma.cooperative.upsert({
    where: { id: "coop_yaounde" },
    update: {},
    create: {
      id: "coop_yaounde",
      name: "Lumière Yaoundé Centre",
      slug: "lumiere-yaounde-centre",
      baseTargetXAF: base2,
      targetAmountXAF: Math.round(base2 * (1 + fee)),
      confirmedBalanceXAF: 195000,
      suspended: false,
      withdrawalsLocked: false,
    },
  });

  // Cooperative 3 — Bafoussam (past goal, surplus)
  const base3 = 500000;
  await prisma.cooperative.upsert({
    where: { id: "coop_bafoussam" },
    update: {},
    create: {
      id: "coop_bafoussam",
      name: "Solaire Bafoussam Ouest",
      slug: "solaire-bafoussam-ouest",
      baseTargetXAF: base3,
      targetAmountXAF: Math.round(base3 * (1 + fee)),
      confirmedBalanceXAF: 380000,
      suspended: false,
      withdrawalsLocked: false,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// COOPERATIVE SETTINGS
// ════════════════════════════════════════════════════════════════════════════

async function seedCooperativeSettings() {
  console.log("  ↳ CooperativeSettings...");

  for (const [cooperativeId, threshold] of [
    ["coop_bonaberi", 60],
    ["coop_yaounde", 66],
    ["coop_bafoussam", 75],
  ] as [string, number][]) {
    await prisma.cooperativeSettings.upsert({
      where: { cooperativeId },
      update: {},
      create: { cooperativeId, withdrawalThreshold: threshold },
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MEMBERSHIPS
// ════════════════════════════════════════════════════════════════════════════

async function seedMemberships() {
  console.log("  ↳ Memberships...");

  const memberships = [
    // Coop 1 — Bonaberi
    {
      id: "m_jean_b",
      userId: "user_jean",
      cooperativeId: "coop_bonaberi",
      role: "COOP_ADMIN" as const,
    },
    {
      id: "m_marie_b",
      userId: "user_marie",
      cooperativeId: "coop_bonaberi",
      role: "MEMBER" as const,
    },
    {
      id: "m_pierre_b",
      userId: "user_pierre",
      cooperativeId: "coop_bonaberi",
      role: "MEMBER" as const,
    },
    {
      id: "m_amara_b",
      userId: "user_amara",
      cooperativeId: "coop_bonaberi",
      role: "MEMBER" as const,
    },
    {
      id: "m_sophie_b",
      userId: "user_sophie",
      cooperativeId: "coop_bonaberi",
      role: "MEMBER" as const,
    },
    // Coop 2 — Yaoundé
    {
      id: "m_paul_y",
      userId: "user_paul",
      cooperativeId: "coop_yaounde",
      role: "COOP_ADMIN" as const,
    },
    {
      id: "m_grace_y",
      userId: "user_grace",
      cooperativeId: "coop_yaounde",
      role: "MEMBER" as const,
    },
    {
      id: "m_eric_y",
      userId: "user_eric",
      cooperativeId: "coop_yaounde",
      role: "MEMBER" as const,
    },
    {
      id: "m_fatima_y",
      userId: "user_fatima",
      cooperativeId: "coop_yaounde",
      role: "MEMBER" as const,
    },
    // Coop 3 — Bafoussam
    {
      id: "m_celestin_baf",
      userId: "user_celestin",
      cooperativeId: "coop_bafoussam",
      role: "COOP_ADMIN" as const,
    },
    {
      id: "m_berthe_baf",
      userId: "user_berthe",
      cooperativeId: "coop_bafoussam",
      role: "MEMBER" as const,
    },
    {
      id: "m_rodrigue_baf",
      userId: "user_rodrigue",
      cooperativeId: "coop_bafoussam",
      role: "MEMBER" as const,
    },
    // Cross-membership (Jean also in Yaoundé as member)
    {
      id: "m_jean_y",
      userId: "user_jean",
      cooperativeId: "coop_yaounde",
      role: "MEMBER" as const,
    },
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, joinedAt: daysAgo(rand(30, 120)) },
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PLANS + SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════════════════

async function seedSubscriptions() {
  console.log("  ↳ Subscriptions...");
  const freePlan = await prisma.plan.findUnique({ where: { name: "Gratuit" } });
  const stdPlan = await prisma.plan.findUnique({ where: { name: "Standard" } });
  const premPlan = await prisma.plan.findUnique({ where: { name: "Premium" } });

  if (!freePlan || !stdPlan || !premPlan) return;

  const subs = [
    {
      id: "sub_b",
      cooperativeId: "coop_bonaberi",
      planId: stdPlan.id,
      status: "ACTIVE" as const,
      expiresAt: daysFromNow(20),
    },
    {
      id: "sub_y",
      cooperativeId: "coop_yaounde",
      planId: freePlan.id,
      status: "ACTIVE" as const,
      expiresAt: null,
    },
    {
      id: "sub_baf",
      cooperativeId: "coop_bafoussam",
      planId: premPlan.id,
      status: "ACTIVE" as const,
      expiresAt: daysFromNow(180),
    },
  ];

  for (const s of subs) {
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INVITATIONS
// ════════════════════════════════════════════════════════════════════════════

async function seedInvitations() {
  console.log("  ↳ Invitations...");

  const invitations = [
    // Pending email invitation (Bonaberi)
    {
      id: "inv_pending_1",
      email: "nouveau1@gmail.com",
      token: "tok_inv_pending_1",
      cooperativeId: "coop_bonaberi",
      type: "EMAIL" as const,
      status: "PENDING" as const,
      expiresAt: daysFromNow(48),
    },
    // Shareable link (Yaoundé)
    {
      id: "inv_link_y",
      email: null,
      token: "tok_inv_link_yaounde",
      cooperativeId: "coop_yaounde",
      type: "LINK" as const,
      status: "PENDING" as const,
      expiresAt: daysFromNow(60),
    },
    // Accepted invitation (Bafoussam)
    {
      id: "inv_accepted_baf",
      email: "rodrigue@coopenergie.cm",
      token: "tok_inv_accepted_baf",
      cooperativeId: "coop_bafoussam",
      type: "EMAIL" as const,
      status: "ACCEPTED" as const,
      expiresAt: daysFromNow(24),
    },
    // Revoked invitation
    {
      id: "inv_revoked_1",
      email: "revoked@example.cm",
      token: "tok_inv_revoked",
      cooperativeId: "coop_bonaberi",
      type: "EMAIL" as const,
      status: "REVOKED" as const,
      expiresAt: daysAgo(1),
    },
  ];

  for (const inv of invitations) {
    await prisma.invitation.upsert({
      where: { id: inv.id },
      update: {},
      create: inv,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS + CONTRIBUTIONS
// ════════════════════════════════════════════════════════════════════════════

async function seedPaymentsAndContributions() {
  console.log("  ↳ Payments & Contributions...");

  // ── Coop Bonaberi contributions ──────────────────────────────────────────
  const bonaContribs = [
    { userId: "user_jean", amount: 150000, daysBack: 75, idx: 1 },
    { userId: "user_marie", amount: 120000, daysBack: 62, idx: 2 },
    { userId: "user_pierre", amount: 100000, daysBack: 55, idx: 3 },
    { userId: "user_jean", amount: 100000, daysBack: 40, idx: 4 },
    { userId: "user_amara", amount: 80000, daysBack: 35, idx: 5 },
    { userId: "user_sophie", amount: 50000, daysBack: 20, idx: 6 },
    { userId: "user_marie", amount: 50000, daysBack: 12, idx: 7 },
    { userId: "user_pierre", amount: 30000, daysBack: 5, idx: 8 },
  ];

  // ── Coop Yaoundé contributions ───────────────────────────────────────────
  const yaoContribs = [
    { userId: "user_paul", amount: 80000, daysBack: 45, idx: 1 },
    { userId: "user_grace", amount: 60000, daysBack: 38, idx: 2 },
    { userId: "user_eric", amount: 35000, daysBack: 22, idx: 3 },
    { userId: "user_fatima", amount: 20000, daysBack: 10, idx: 4 },
  ];

  // ── Coop Bafoussam contributions ─────────────────────────────────────────
  const bafContribs = [
    { userId: "user_celestin", amount: 200000, daysBack: 90, idx: 1 },
    { userId: "user_berthe", amount: 100000, daysBack: 75, idx: 2 },
    { userId: "user_rodrigue", amount: 80000, daysBack: 60, idx: 3 },
  ];

  const allContribGroups = [
    { cooperativeId: "coop_bonaberi", contribs: bonaContribs },
    { cooperativeId: "coop_yaounde", contribs: yaoContribs },
    { cooperativeId: "coop_bafoussam", contribs: bafContribs },
  ];

  for (const { cooperativeId, contribs } of allContribGroups) {
    for (const c of contribs) {
      const payId = `pay_${cooperativeId}_${c.idx}`;
      const contribId = `contrib_${cooperativeId}_${c.idx}`;
      const ref = `COOP-${cooperativeId.slice(0, 8)}-${c.idx}`;
      const txHash = fakeTx(
        `contribution-${cooperativeId}-${c.userId}-${c.idx}`,
      );
      const createdAt = daysAgo(c.daysBack);

      await prisma.payment.upsert({
        where: { id: payId },
        update: {},
        create: {
          id: payId,
          amountXAF: c.amount,
          userId: c.userId,
          cooperativeId,
          status: "SUCCESS",
          provider: "CAMPAY",
          reference: ref,
          idempotencyKey: `idem-${ref}`,
          phoneNumber: "+23769900000" + c.idx,
          createdAt,
          updatedAt: createdAt,
        },
      });

      await prisma.contribution.upsert({
        where: { id: contribId },
        update: {},
        create: {
          id: contribId,
          amountXAF: c.amount,
          userId: c.userId,
          cooperativeId,
          txHash,
          blockNumber: 28_400_000 + c.idx * 1000 + c.daysBack,
          status: "CONFIRMED",
          paymentId: payId,
          createdAt,
        },
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LEDGER EVENTS
// ════════════════════════════════════════════════════════════════════════════

async function seedLedgerEvents() {
  console.log("  ↳ LedgerEvents...");

  const events = [
    // Bonaberi
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `ledger_bona_contrib_${i + 1}`,
      type: "CONTRIBUTION" as const,
      cooperativeId: "coop_bonaberi",
      txHash: fakeTx(`ledger-bona-contrib-${i}`),
      blockNumber: 28_400_000 + i * 1100,
      payload: {
        member: "0xBONA" + i.toString(16).padStart(38, "0"),
        amountXAF: [150000, 120000, 100000, 100000, 80000, 50000, 50000, 30000][
          i
        ],
      },
      createdAt: daysAgo(75 - i * 8),
    })),
    // Yaoundé
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `ledger_yao_contrib_${i + 1}`,
      type: "CONTRIBUTION" as const,
      cooperativeId: "coop_yaounde",
      txHash: fakeTx(`ledger-yao-contrib-${i}`),
      blockNumber: 28_450_000 + i * 900,
      payload: {
        member: "0xYAO" + i.toString(16).padStart(39, "0"),
        amountXAF: [80000, 60000, 35000, 20000][i],
      },
      createdAt: daysAgo(45 - i * 8),
    })),
    // Bafoussam
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `ledger_baf_contrib_${i + 1}`,
      type: "CONTRIBUTION" as const,
      cooperativeId: "coop_bafoussam",
      txHash: fakeTx(`ledger-baf-contrib-${i}`),
      blockNumber: 28_350_000 + i * 1200,
      payload: {
        member: "0xBAF" + i.toString(16).padStart(39, "0"),
        amountXAF: [200000, 100000, 80000][i],
      },
      createdAt: daysAgo(90 - i * 15),
    })),
    // Votes
    {
      id: "ledger_bona_vote_1",
      type: "VOTE" as const,
      cooperativeId: "coop_bonaberi",
      txHash: fakeTx("ledger-bona-vote-1"),
      blockNumber: 28_420_000,
      payload: { proposalId: "prop_bona_1", voter: "0xJEAN", choice: true },
      createdAt: daysAgo(22),
    },
    {
      id: "ledger_bona_vote_2",
      type: "VOTE" as const,
      cooperativeId: "coop_bonaberi",
      txHash: fakeTx("ledger-bona-vote-2"),
      blockNumber: 28_420_100,
      payload: { proposalId: "prop_bona_1", voter: "0xMARIE", choice: true },
      createdAt: daysAgo(21),
    },
    // Proposal events
    {
      id: "ledger_bona_prop_1",
      type: "PROPOSAL" as const,
      cooperativeId: "coop_bonaberi",
      txHash: fakeTx("ledger-bona-proposal-1"),
      blockNumber: 28_419_000,
      payload: {
        proposalId: "prop_bona_1",
        creator: "0xJEAN",
        title: "Installation Bonaberi Phase 1",
      },
      createdAt: daysAgo(25),
    },
    {
      id: "ledger_bona_prop_2",
      type: "PROPOSAL" as const,
      cooperativeId: "coop_bonaberi",
      txHash: fakeTx("ledger-bona-proposal-2"),
      blockNumber: 28_430_000,
      payload: {
        proposalId: "prop_bona_2",
        creator: "0xJEAN",
        title: "Achat SolarCam 200W",
      },
      createdAt: daysAgo(10),
    },
  ];

  for (const event of events) {
    await prisma.ledgerEvent.upsert({
      where: { txHash: event.txHash },
      update: {},
      create: event,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PROPOSALS + VOTES + VENDOR LINKS
// ════════════════════════════════════════════════════════════════════════════

async function seedProposalsVotesAndVendorLinks() {
  console.log("  ↳ Proposals, Votes & VendorLinks...");

  // ── Coop Bonaberi proposals ──────────────────────────────────────────────

  // Proposal 1 — STANDARD, APPROVED (installation vote passed)
  await prisma.proposal.upsert({
    where: { id: "prop_bona_1" },
    update: {},
    create: {
      id: "prop_bona_1",
      title: "Installation Bonaberi Phase 1 — 200W par foyer",
      description:
        "Je propose de lancer la première installation solaire pour les 5 foyers fondateurs. " +
        "Budget estimé : 200 000 FCFA pour 5 kits de base. Priorité aux familles avec enfants en âge scolaire.",
      status: "APPROVED",
      cooperativeId: "coop_bonaberi",
      creatorId: "user_jean",
      type: "STANDARD",
      txHash: fakeTx("prop-bona-1-tx"),
      blockNumber: 28_419_000,
      createdAt: daysAgo(25),
    },
  });

  // Votes for proposal 1
  const voteProp1 = [
    { userId: "user_jean", choice: true, idx: 1 },
    { userId: "user_marie", choice: true, idx: 2 },
    { userId: "user_pierre", choice: true, idx: 3 },
    { userId: "user_amara", choice: false, idx: 4 },
    { userId: "user_sophie", choice: true, idx: 5 },
  ];
  for (const v of voteProp1) {
    await prisma.vote.upsert({
      where: {
        userId_proposalId: { userId: v.userId, proposalId: "prop_bona_1" },
      },
      update: {},
      create: {
        id: `vote_bona_1_${v.idx}`,
        userId: v.userId,
        proposalId: "prop_bona_1",
        choice: v.choice,
        txHash: fakeTx(`vote-bona-1-${v.userId}`),
        blockNumber: 28_420_000 + v.idx * 100,
        createdAt: daysAgo(24 - v.idx),
      },
    });
  }

  // Proposal 2 — VENDOR_PURCHASE, APPROVED (SolarCam kit 200W)
  await prisma.proposal.upsert({
    where: { id: "prop_bona_2" },
    update: {},
    create: {
      id: "prop_bona_2",
      title: "Achat groupé — SolarCam Yaoundé : Kit 200W",
      description:
        "Je propose de commander le Pack Communauté 10 Foyers de SolarCam. " +
        "Ils ont une bonne réputation et proposent 15% de remise pour les coopératives. " +
        "Livraison sous 5 jours avec garantie pièces 3 ans.",
      status: "APPROVED",
      cooperativeId: "coop_bonaberi",
      creatorId: "user_marie",
      type: "VENDOR_PURCHASE",
      txHash: fakeTx("prop-bona-2-tx"),
      blockNumber: 28_430_000,
      createdAt: daysAgo(10),
    },
  });

  // ProposalVendorLink for proposal 2
  await prisma.proposalVendorLink.upsert({
    where: { proposalId: "prop_bona_2" },
    update: {},
    create: {
      id: "pvl_bona_2",
      proposalId: "prop_bona_2",
      vendorId: "vendor_solarcam",
      productId: "prod_sc_3", // Pack Communautaire 10 Foyers
      note:
        "SolarCam a déjà installé dans le quartier adjacent. Bonne réputation, service après-vente réactif. " +
        "Leur tarif coopérative est le meilleur que j'ai trouvé à Yaoundé.",
    },
  });

  // Votes for proposal 2 (all yes — clear majority)
  const voteProp2 = [
    { userId: "user_jean", choice: true, idx: 1 },
    { userId: "user_marie", choice: true, idx: 2 },
    { userId: "user_pierre", choice: true, idx: 3 },
    { userId: "user_amara", choice: true, idx: 4 },
  ];
  for (const v of voteProp2) {
    await prisma.vote.upsert({
      where: {
        userId_proposalId: { userId: v.userId, proposalId: "prop_bona_2" },
      },
      update: {},
      create: {
        id: `vote_bona_2_${v.idx}`,
        userId: v.userId,
        proposalId: "prop_bona_2",
        choice: v.choice,
        txHash: fakeTx(`vote-bona-2-${v.userId}`),
        blockNumber: 28_430_500 + v.idx * 50,
        createdAt: daysAgo(9 - v.idx),
      },
    });
  }

  // Proposal 3 — STANDARD, PENDING (new proposal, mixed votes)
  await prisma.proposal.upsert({
    where: { id: "prop_bona_3" },
    update: {},
    create: {
      id: "prop_bona_3",
      title: "Acquisition batteries de remplacement",
      description:
        "Certains membres ont des batteries vieillissantes. Je propose d'acheter 3 batteries 100Ah supplémentaires pour ceux qui en ont besoin, financées par la caisse commune.",
      status: "PENDING",
      cooperativeId: "coop_bonaberi",
      creatorId: "user_pierre",
      type: "STANDARD",
      txHash: fakeTx("prop-bona-3-tx"),
      blockNumber: 28_440_000,
      createdAt: daysAgo(3),
    },
  });

  // 2 votes so far (not at quorum)
  for (const [userId, choice, idx] of [
    ["user_jean", true, 1],
    ["user_sophie", false, 2],
  ] as [string, boolean, number][]) {
    await prisma.vote.upsert({
      where: { userId_proposalId: { userId, proposalId: "prop_bona_3" } },
      update: {},
      create: {
        id: `vote_bona_3_${idx}`,
        userId,
        proposalId: "prop_bona_3",
        choice,
        txHash: fakeTx(`vote-bona-3-${userId}`),
        blockNumber: 28_440_100 + idx * 50,
        createdAt: daysAgo(2),
      },
    });
  }

  // ── Coop Yaoundé proposals ───────────────────────────────────────────────

  // Proposal — VENDOR_PURCHASE, PENDING (EnergieVerte pitch)
  await prisma.proposal.upsert({
    where: { id: "prop_yao_1" },
    update: {},
    create: {
      id: "prop_yao_1",
      title: "Achat groupé — EnergieVerte Douala : Pack 10 foyers",
      description:
        "EnergieVerte propose un pack entrée de gamme à 650 000 FCFA pour 10 foyers. " +
        "Livraison à Yaoundé incluse. Je demande votre vote.",
      status: "PENDING",
      cooperativeId: "coop_yaounde",
      creatorId: "user_paul",
      type: "VENDOR_PURCHASE",
      txHash: fakeTx("prop-yao-1-tx"),
      blockNumber: 28_455_000,
      createdAt: daysAgo(5),
    },
  });

  await prisma.proposalVendorLink.upsert({
    where: { proposalId: "prop_yao_1" },
    update: {},
    create: {
      id: "pvl_yao_1",
      proposalId: "prop_yao_1",
      vendorId: "vendor_energieverte",
      productId: "prod_ev_3", // Pack Communauté 10 foyers
      note: "Meilleur rapport qualité-prix trouvé pour notre budget actuel.",
    },
  });

  // 1 vote
  await prisma.vote.upsert({
    where: {
      userId_proposalId: { userId: "user_grace", proposalId: "prop_yao_1" },
    },
    update: {},
    create: {
      id: "vote_yao_1_1",
      userId: "user_grace",
      proposalId: "prop_yao_1",
      choice: true,
      txHash: fakeTx("vote-yao-1-grace"),
      blockNumber: 28_455_200,
      createdAt: daysAgo(4),
    },
  });

  // ── Coop Bafoussam proposals ─────────────────────────────────────────────

  // Withdrawal proposal — APPROVED, DISBURSED
  await prisma.proposal.upsert({
    where: { id: "prop_baf_withdraw" },
    update: {},
    create: {
      id: "prop_baf_withdraw",
      title: "Retrait : 350 000 FCFA — Achat kits SunTech",
      description:
        "La coopérative a atteint 380 000 FCFA. Je propose de retirer 350 000 FCFA pour acheter " +
        "12 kits chez SunTech Bafoussam qui nous a fait un devis favorable.",
      status: "APPROVED",
      cooperativeId: "coop_bafoussam",
      creatorId: "user_celestin",
      type: "WITHDRAWAL",
      txHash: fakeTx("prop-baf-withdrawal-tx"),
      blockNumber: 28_360_000,
      createdAt: daysAgo(30),
    },
  });

  // Votes for withdrawal (3 yes = quorum met at 75% threshold = needs 3/3 contributing members)
  for (const [userId, choice, idx] of [
    ["user_celestin", true, 1],
    ["user_berthe", true, 2],
    ["user_rodrigue", true, 3],
  ] as [string, boolean, number][]) {
    await prisma.vote.upsert({
      where: { userId_proposalId: { userId, proposalId: "prop_baf_withdraw" } },
      update: {},
      create: {
        id: `vote_baf_wd_${idx}`,
        userId,
        proposalId: "prop_baf_withdraw",
        choice,
        txHash: fakeTx(`vote-baf-wd-${userId}`),
        blockNumber: 28_360_200 + idx * 50,
        createdAt: daysAgo(28 - idx),
      },
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WITHDRAWAL REQUESTS
// ════════════════════════════════════════════════════════════════════════════

async function seedWithdrawalRequests() {
  console.log("  ↳ WithdrawalRequests...");

  const feeAmount = Math.round(350000 * (WITHDRAWAL_FEE_PERCENT / 100));

  // Bafoussam — completed withdrawal
  await prisma.withdrawalRequest.upsert({
    where: { proposalId: "prop_baf_withdraw" },
    update: {},
    create: {
      id: "wd_baf_1",
      cooperativeId: "coop_bafoussam",
      proposalId: "prop_baf_withdraw",
      amountXAF: 350000,
      platformFeeXAF: feeAmount,
      destinationType: "MTN_MOMO",
      recipientPhone: "+237655000003",
      recipientOperator: "MTN",
      recipientName: "Célestin Feudjou Kamga",
      campayReference: "COOP-WD-baf-20260110",
      status: "DISBURSED",
      disbursedAt: daysAgo(20),
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// VENDOR REVIEWS
// ════════════════════════════════════════════════════════════════════════════

async function seedVendorReviews() {
  console.log("  ↳ VendorReviews...");

  // Reviews for SolarCam (approved vendor in Bonaberi coop via prop_bona_2)
  const solarcamReviews = [
    {
      id: "review_sc_1",
      vendorId: "vendor_solarcam",
      reviewerId: "user_jean",
      cooperativeId: "coop_bonaberi",
      proposalId: "prop_bona_2",
      rating: 45, // 4.5 stars
      comment:
        "Installation impeccable. L'équipe SolarCam est arrivée à l'heure et a terminé en une demi-journée. " +
        "Nos 5 foyers ont maintenant de la lumière stable. Très professionnel.",
      createdAt: daysAgo(5),
    },
    {
      id: "review_sc_2",
      vendorId: "vendor_solarcam",
      reviewerId: "user_marie",
      cooperativeId: "coop_bonaberi",
      proposalId: "prop_bona_2",
      rating: 40, // 4.0 stars
      comment:
        "Bonne qualité des panneaux. Le service après-vente a été réactif quand on a eu un problème de régulateur. " +
        "Je recommande mais je retire 1 étoile car la livraison a pris 2 jours de plus que prévu.",
      createdAt: daysAgo(4),
    },
    {
      id: "review_sc_3",
      vendorId: "vendor_solarcam",
      reviewerId: "user_pierre",
      cooperativeId: "coop_bonaberi",
      proposalId: "prop_bona_2",
      rating: 50, // 5.0 stars
      comment:
        "Parfait. Mon foyer est autonome depuis 3 semaines. Aucune coupure. Merci SolarCam !",
      createdAt: daysAgo(3),
    },
  ];

  // Older external reviews already captured in seed (simulating pre-existing reviews)
  // These would have been from other cooperatives — simulate with proposalId references
  // We'll just add the 3 real linked ones + mark avgRating accordingly

  for (const review of solarcamReviews) {
    await prisma.vendorReview.upsert({
      where: {
        reviewerId_proposalId: {
          reviewerId: review.reviewerId,
          proposalId: review.proposalId,
        },
      },
      update: {},
      create: review,
    });
  }

  // Update SolarCam's cached stats (normally done by the ranking algorithm)
  await prisma.vendor.update({
    where: { id: "vendor_solarcam" },
    data: {
      avgRating: 4.3,
      totalReviews: 12,
      rankScore: 4.61,
    },
  });

  await prisma.vendor.update({
    where: { id: "vendor_energieverte" },
    data: {
      avgRating: 3.8,
      totalReviews: 7,
      rankScore: 4.02,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// VENDOR SUBSCRIPTION RECORDS
// ════════════════════════════════════════════════════════════════════════════

async function seedVendorSubscriptions() {
  console.log("  ↳ VendorSubscriptionRecords...");

  // SolarCam — one-time registration (already paid)
  await prisma.vendorSubscriptionRecord.upsert({
    where: { id: "vsub_sc_1" },
    update: {},
    create: {
      id: "vsub_sc_1",
      vendorId: "vendor_solarcam",
      billingCycle: "ONE_TIME",
      priceXAF: 15000,
      status: "ACTIVE",
      campayReference: "VENDOR-REG-solarcam-001",
      startedAt: daysAgo(120),
    },
  });

  // EnergieVerte — one-time registration
  await prisma.vendorSubscriptionRecord.upsert({
    where: { id: "vsub_ev_1" },
    update: {},
    create: {
      id: "vsub_ev_1",
      vendorId: "vendor_energieverte",
      billingCycle: "ONE_TIME",
      priceXAF: 15000,
      status: "ACTIVE",
      campayReference: "VENDOR-REG-energieverte-001",
      startedAt: daysAgo(85),
    },
  });

  // SunTech — one-time registration
  await prisma.vendorSubscriptionRecord.upsert({
    where: { id: "vsub_st_1" },
    update: {},
    create: {
      id: "vsub_st_1",
      vendorId: "vendor_suntech",
      billingCycle: "ONE_TIME",
      priceXAF: 15000,
      status: "ACTIVE",
      campayReference: "VENDOR-REG-suntech-001",
      startedAt: daysAgo(15),
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// FAQS
// ════════════════════════════════════════════════════════════════════════════

async function seedFaqs() {
  console.log("  ↳ FAQs...");

  const faqs = [
    // ── CUSTOMER FAQs — French ───────────────────────────────────────────────
    {
      id: "faq_c_fr_1",
      question: "Comment rejoindre une coopérative ?",
      answer:
        "Vous pouvez rejoindre une coopérative en acceptant une invitation envoyée par l'administrateur, " +
        "soit par e-mail, soit via un lien de partage. Une fois inscrit, vous aurez accès au tableau de bord de la coopérative.",
      audience: "CUSTOMER" as const,
      sortOrder: 0,
      locale: "fr",
    },
    {
      id: "faq_c_fr_2",
      question: "Comment effectuer une contribution ?",
      answer:
        'Depuis votre tableau de bord, cliquez sur "Contribuer", saisissez le montant souhaité et suivez les instructions ' +
        "de paiement via Mobile Money (MTN ou Orange). Votre contribution est confirmée en quelques minutes.",
      audience: "CUSTOMER" as const,
      sortOrder: 1,
      locale: "fr",
    },
    {
      id: "faq_c_fr_3",
      question: "Comment fonctionne le vote pour les propositions ?",
      answer:
        "Chaque membre contributeur peut voter sur les propositions actives. Une proposition est approuvée lorsque le seuil " +
        "de votes favorables défini par la coopérative est atteint (généralement 60 à 75%).",
      audience: "CUSTOMER" as const,
      sortOrder: 2,
      locale: "fr",
    },
    {
      id: "faq_c_fr_4",
      question: "Quand les fonds sont-ils retirés ?",
      answer:
        "Un retrait est initié par l'administrateur via une proposition soumise au vote des membres. " +
        "Une fois approuvée, les fonds sont transférés vers le compte Mobile Money ou bancaire désigné sous 24 à 48h.",
      audience: "CUSTOMER" as const,
      sortOrder: 3,
      locale: "fr",
    },
    // ── CUSTOMER FAQs — English ──────────────────────────────────────────────
    {
      id: "faq_c_en_1",
      question: "How do I join a cooperative?",
      answer:
        "You can join a cooperative by accepting an invitation sent by the administrator, " +
        "either by email or via a share link. Once registered, you will have access to the cooperative dashboard.",
      audience: "CUSTOMER" as const,
      sortOrder: 0,
      locale: "en",
    },
    {
      id: "faq_c_en_2",
      question: "How do I make a contribution?",
      answer:
        'From your dashboard, click "Contribute", enter the desired amount and follow the payment instructions ' +
        "via Mobile Money (MTN or Orange). Your contribution is confirmed within a few minutes.",
      audience: "CUSTOMER" as const,
      sortOrder: 1,
      locale: "en",
    },
    {
      id: "faq_c_en_3",
      question: "How does voting on proposals work?",
      answer:
        "Every contributing member can vote on active proposals. A proposal is approved when the approval threshold " +
        "set by the cooperative is reached (typically 60–75%).",
      audience: "CUSTOMER" as const,
      sortOrder: 2,
      locale: "en",
    },
    {
      id: "faq_c_en_4",
      question: "When are funds withdrawn?",
      answer:
        "A withdrawal is initiated by the administrator via a withdrawal proposal submitted to a member vote. " +
        "Once approved, funds are transferred to the designated Mobile Money or bank account within 24–48 hours.",
      audience: "CUSTOMER" as const,
      sortOrder: 3,
      locale: "en",
    },
    // ── VENDOR FAQs — French ─────────────────────────────────────────────────
    {
      id: "faq_v_fr_1",
      question: "Comment créer un compte fournisseur ?",
      answer:
        'Inscrivez-vous sur CoopEnergie en choisissant le rôle "Fournisseur". Remplissez votre profil puis effectuez ' +
        "le paiement d'inscription. Votre compte sera activé dès confirmation du paiement.",
      audience: "VENDOR" as const,
      sortOrder: 0,
      locale: "fr",
    },
    {
      id: "faq_v_fr_2",
      question: "Quels sont les frais d'inscription ?",
      answer:
        "Les frais d'inscription varient en fonction du type d'abonnement, soit un abonnement mensuel ou annuel. " +
        "Les tarifs en vigueur sont affichés sur la page d'inscription fournisseur.",
      audience: "VENDOR" as const,
      sortOrder: 1,
      locale: "fr",
    },
    {
      id: "faq_v_fr_3",
      question: "Comment ajouter mes produits et services ?",
      answer:
        'Depuis votre tableau de bord fournisseur, accédez à la section "Produits" et cliquez sur "Ajouter un produit". ' +
        "Renseignez le titre, la description, le prix et ajoutez des photos. Vos produits seront visibles par toutes les coopératives.",
      audience: "VENDOR" as const,
      sortOrder: 2,
      locale: "fr",
    },
    {
      id: "faq_v_fr_4",
      question: "Comment les coopératives me contactent-elles ?",
      answer:
        "Les coopératives peuvent vous contacter directement via WhatsApp ou e-mail depuis votre profil public. " +
        "Elles peuvent également vous désigner dans une proposition d'achat groupé, ce qui vous notifie automatiquement.",
      audience: "VENDOR" as const,
      sortOrder: 3,
      locale: "fr",
    },
    // ── VENDOR FAQs — English ────────────────────────────────────────────────
    {
      id: "faq_v_en_1",
      question: "How do I create a vendor account?",
      answer:
        'Sign up on CoopEnergie by selecting the "Vendor" role. Complete your profile then complete the registration payment. ' +
        "Your account will be activated upon payment confirmation.",
      audience: "VENDOR" as const,
      sortOrder: 0,
      locale: "en",
    },
    {
      id: "faq_v_en_2",
      question: "What are the registration fees?",
      answer:
        "Registration fees vary based on the type of subscription, either a Monthly or yearly subscription. " +
        "Current pricing is displayed on the vendor registration page.",
      audience: "VENDOR" as const,
      sortOrder: 1,
      locale: "en",
    },
    {
      id: "faq_v_en_3",
      question: "How do I add my products and services?",
      answer:
        'From your vendor dashboard, go to the "Products" section and click "Add a product". ' +
        "Fill in the title, description, price and add photos. Your products will be visible to all cooperatives.",
      audience: "VENDOR" as const,
      sortOrder: 2,
      locale: "en",
    },
    {
      id: "faq_v_en_4",
      question: "How do cooperatives contact me?",
      answer:
        "Cooperatives can contact you directly via WhatsApp or email from your public profile. " +
        "They can also tag you in a group purchase proposal, which will automatically notify you.",
      audience: "VENDOR" as const,
      sortOrder: 3,
      locale: "en",
    },
  ];

  for (const faq of faqs) {
    await prisma.faq.upsert({
      where: { id: faq.id },
      update: {},
      create: faq,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════════════════════════════════════════

async function seedAuditLogs() {
  console.log("  ↳ AuditLogs...");

  const logs = [
    {
      id: "al_1",
      userId: "user_jean",
      cooperativeId: "coop_bonaberi",
      action: "CREATE_COOPERATIVE",
      entity: "Cooperative",
      entityId: "coop_bonaberi",
      metadata: { targetAmountXAF: 871250, baseTargetXAF: 850000 },
      createdAt: daysAgo(90),
    },
    {
      id: "al_2",
      userId: "user_jean",
      cooperativeId: "coop_bonaberi",
      action: "INVITE_MEMBER",
      entity: "Invitation",
      entityId: "inv_pending_1",
      metadata: { email: "nouveau1@gmail.com", type: "EMAIL" },
      createdAt: daysAgo(50),
    },
    {
      id: "al_3",
      userId: "user_celestin",
      cooperativeId: "coop_bafoussam",
      action: "CREATE_WITHDRAWAL_PROPOSAL",
      entity: "Proposal",
      entityId: "prop_baf_withdraw",
      metadata: { amountXAF: 350000, destinationType: "MTN_MOMO" },
      createdAt: daysAgo(30),
    },
    {
      id: "al_4",
      userId: null,
      cooperativeId: "coop_bafoussam",
      action: "WITHDRAWAL_DISBURSED",
      entity: "WithdrawalRequest",
      entityId: "wd_baf_1",
      metadata: {
        amountXAF: 350000,
        platformFeeXAF: Math.round(350000 * 0.025),
        campayReference: "COOP-WD-baf-20260110",
      },
      createdAt: daysAgo(20),
    },
    {
      id: "al_5",
      userId: "user_admin",
      cooperativeId: null,
      action: "UPDATE_PLATFORM_SETTINGS",
      entity: "PlatformSettings",
      entityId: "singleton",
      metadata: { withdrawalFeePercent: 2.5, previous: 0 },
      createdAt: daysAgo(60),
    },
    {
      id: "al_6",
      userId: "user_vendor1",
      cooperativeId: null,
      action: "VENDOR_REGISTRATION",
      entity: "Vendor",
      entityId: "vendor_solarcam",
      metadata: { businessName: "SolarCam Yaoundé", paymentModel: "ONE_TIME" },
      createdAt: daysAgo(120),
    },
    {
      id: "al_7",
      userId: "user_marie",
      cooperativeId: "coop_bonaberi",
      action: "CREATE_PROPOSAL",
      entity: "Proposal",
      entityId: "prop_bona_2",
      metadata: { type: "VENDOR_PURCHASE", vendorId: "vendor_solarcam" },
      createdAt: daysAgo(10),
    },
  ];

  for (const log of logs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DEVICE TOKENS
// ════════════════════════════════════════════════════════════════════════════

async function seedDeviceTokens() {
  console.log("  ↳ DeviceTokens...");

  const tokens = [
    {
      id: "dt_jean_web",
      userId: "user_jean",
      token: "fcm-web-token-jean-abc123xyz",
      platform: "WEB" as const,
    },
    {
      id: "dt_jean_android",
      userId: "user_jean",
      token: "ExponentPushToken[jean-android-abc]",
      platform: "ANDROID" as const,
    },
    {
      id: "dt_marie_ios",
      userId: "user_marie",
      token: "ExponentPushToken[marie-ios-def]",
      platform: "IOS" as const,
    },
    {
      id: "dt_paul_web",
      userId: "user_paul",
      token: "fcm-web-token-paul-def456uvw",
      platform: "WEB" as const,
    },
  ];

  for (const dt of tokens) {
    await prisma.deviceToken.upsert({
      where: { id: dt.id },
      update: {},
      create: dt,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function clearDatabase() {
  console.log("  ↳ Clearing database...");
  // Delete in reverse dependency order to respect foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.vendorReview.deleteMany();
  await prisma.vendorSubscriptionRecord.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.proposalVendorLink.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.ledgerEvent.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.cooperativeSettings.deleteMany();
  await prisma.cooperative.deleteMany();
  await prisma.vendorProductImage.deleteMany();
  await prisma.vendorProduct.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.platformSettings.deleteMany();
}

async function main() {
  console.log("\n🌱 CoopEnergie — seeding production-realistic data\n");

  try {
    await clearDatabase();
    await seedPlatformSettings();
    await seedPlans();
    await seedUsers();
    await seedVendors();
    await seedVendorProducts();
    await seedCooperatives();
    await seedCooperativeSettings();
    await seedMemberships();
    await seedSubscriptions();
    await seedInvitations();
    await seedPaymentsAndContributions();
    await seedLedgerEvents();
    await seedProposalsVotesAndVendorLinks();
    await seedWithdrawalRequests();
    await seedVendorReviews();
    await seedVendorSubscriptions();
    await seedFaqs();
    await seedAuditLogs();
    await seedDeviceTokens();

    console.log("\n✅ Seed complete.\n");
    console.log("── Demo credentials ─────────────────────────────────");
    console.log(
      "  Platform Admin:  anjohsamueljr@gmail.com         / Admin2026!",
    );
    console.log(
      "  Coop Admin 1:    jean@coopenergie.cm           / password123  (Bonaberi)",
    );
    console.log(
      "  Coop Admin 2:    paul@coopenergie.cm           / password123  (Yaoundé)",
    );
    console.log(
      "  Coop Admin 3:    celestin@coopenergie.cm       / password123  (Bafoussam)",
    );
    console.log(
      "  Member:          marie@coopenergie.cm          / password123",
    );
    console.log(
      "  Member:          pierre@coopenergie.cm         / password123",
    );
    console.log(
      "  Vendor (active): contact@solarcam.cm           / password123",
    );
    console.log(
      "  Vendor (active): contact@energieverte.cm       / password123",
    );
    console.log(
      "  Vendor (new):    suntech@bafoussam.cm          / password123",
    );
    console.log(
      "  Vendor (demo):   demo-vendor@coopenergie.cm    / password123",
    );
    console.log("─────────────────────────────────────────────────────\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
