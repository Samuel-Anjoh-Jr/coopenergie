import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const jean = await prisma.user.upsert({
    where: { email: "jean@coopenergie.cm" },
    update: {
      name: "Jean-Baptiste Akogo",
      passwordHash,
    },
    create: {
      email: "jean@coopenergie.cm",
      name: "Jean-Baptiste Akogo",
      passwordHash,
    },
  });

  const marie = await prisma.user.upsert({
    where: { email: "marie@coopenergie.cm" },
    update: {
      name: "Marie-Claire Ndoumbe",
      passwordHash,
    },
    create: {
      email: "marie@coopenergie.cm",
      name: "Marie-Claire Ndoumbe",
      passwordHash,
    },
  });

  const pierre = await prisma.user.upsert({
    where: { email: "pierre@coopenergie.cm" },
    update: {
      name: "Pierre Essomba",
      passwordHash,
    },
    create: {
      email: "pierre@coopenergie.cm",
      name: "Pierre Essomba",
      passwordHash,
    },
  });

  const cooperative = await prisma.cooperative.upsert({
    where: { slug: "cooperative-solaire-bonaberi" },
    update: {
      name: "Coopérative Solaire Bonaberi",
      targetAmountXAF: 850000,
      confirmedBalanceXAF: 85000,
    },
    create: {
      name: "Coopérative Solaire Bonaberi",
      slug: "cooperative-solaire-bonaberi",
      targetAmountXAF: 850000,
      confirmedBalanceXAF: 85000,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_cooperativeId: {
        userId: jean.id,
        cooperativeId: cooperative.id,
      },
    },
    update: {
      role: "COOP_ADMIN",
    },
    create: {
      userId: jean.id,
      cooperativeId: cooperative.id,
      role: "COOP_ADMIN",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_cooperativeId: {
        userId: marie.id,
        cooperativeId: cooperative.id,
      },
    },
    update: {
      role: "MEMBER",
    },
    create: {
      userId: marie.id,
      cooperativeId: cooperative.id,
      role: "MEMBER",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_cooperativeId: {
        userId: pierre.id,
        cooperativeId: cooperative.id,
      },
    },
    update: {
      role: "MEMBER",
    },
    create: {
      userId: pierre.id,
      cooperativeId: cooperative.id,
      role: "MEMBER",
    },
  });

  await prisma.contribution.upsert({
    where: { id: "seed-contribution-jean-bonaberi" },
    update: {
      amountXAF: 50000,
      userId: jean.id,
      cooperativeId: cooperative.id,
      status: "CONFIRMED",
    },
    create: {
      id: "seed-contribution-jean-bonaberi",
      amountXAF: 50000,
      userId: jean.id,
      cooperativeId: cooperative.id,
      status: "CONFIRMED",
    },
  });

  await prisma.contribution.upsert({
    where: { id: "seed-contribution-marie-bonaberi" },
    update: {
      amountXAF: 35000,
      userId: marie.id,
      cooperativeId: cooperative.id,
      status: "CONFIRMED",
    },
    create: {
      id: "seed-contribution-marie-bonaberi",
      amountXAF: 35000,
      userId: marie.id,
      cooperativeId: cooperative.id,
      status: "CONFIRMED",
    },
  });

  await prisma.proposal.upsert({
    where: { id: "seed-proposal-bonaberi-phase-1" },
    update: {
      title: "Installation panneau Bonaberi Phase 1",
      description:
        "Lancement de la premiere phase d'installation des panneaux solaires pour la cooperative de Bonaberi.",
      status: "PENDING",
      cooperativeId: cooperative.id,
      creatorId: jean.id,
    },
    create: {
      id: "seed-proposal-bonaberi-phase-1",
      title: "Installation panneau Bonaberi Phase 1",
      description:
        "Lancement de la premiere phase d'installation des panneaux solaires pour la cooperative de Bonaberi.",
      status: "PENDING",
      cooperativeId: cooperative.id,
      creatorId: jean.id,
    },
  });

  const freePlan = await prisma.plan.upsert({
    where: { name: "FREE" },
    update: {
      priceXAF: 0,
      billingCycle: "FREE",
      features: {
        membersLimit: 50,
        proposals: true,
        contributions: true,
      },
    },
    create: {
      name: "FREE",
      priceXAF: 0,
      billingCycle: "FREE",
      features: {
        membersLimit: 50,
        proposals: true,
        contributions: true,
      },
    },
  });

  await prisma.subscription.upsert({
    where: { id: "seed-subscription-bonaberi-free" },
    update: {
      cooperativeId: cooperative.id,
      planId: freePlan.id,
      status: "ACTIVE",
    },
    create: {
      id: "seed-subscription-bonaberi-free",
      cooperativeId: cooperative.id,
      planId: freePlan.id,
      status: "ACTIVE",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
