import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data (optional - remove if you want to keep existing data)
  await prisma.review.deleteMany();
  await prisma.cardState.deleteMany();
  await prisma.card.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const hashedPassword = await bcrypt.hash("password123", 12);

  const testUser = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created test user:", testUser.email);

  // Create organization for the user
  const testOrg = await prisma.organization.create({
    data: {
      name: "Test Organization",
      owner_user_id: testUser.id,
    },
  });

  // Add user to organization
  await prisma.organizationMember.create({
    data: {
      organization_id: testOrg.id,
      user_id: testUser.id,
      role: "owner",
    },
  });

  console.log("✅ Created organization:", testOrg.name);

  // Create sample decks
  const spanishDeck = await prisma.deck.create({
    data: {
      name: "Spanish Vocabulary",
      description: "Learn basic Spanish words and phrases",
      user_id: testUser.id,
      organization_id: testOrg.id,
      is_public: false,
    },
  });

  const mathDeck = await prisma.deck.create({
    data: {
      name: "Math Formulas",
      description: "Essential mathematical formulas for exams",
      user_id: testUser.id,
      organization_id: testOrg.id,
      is_public: false,
    },
  });

  const historyDeck = await prisma.deck.create({
    data: {
      name: "World History",
      description: "Important dates and events in world history",
      user_id: testUser.id,
      organization_id: testOrg.id,
      is_public: true, // This one is public
    },
  });

  console.log("✅ Created sample decks");

  // Create sample cards for Spanish deck
  const spanishCards = [
    {
      card_type: "BASIC" as const,
      front: "<p>Hello</p>",
      back: "<p><strong>Hola</strong></p>",
      tags: ["greetings", "basic"],
    },
    {
      card_type: "BASIC" as const,
      front: "<p>Thank you</p>",
      back: "<p><strong>Gracias</strong></p>",
      tags: ["politeness", "basic"],
    },
    {
      card_type: "BASIC" as const,
      front: "<p>Water</p>",
      back: "<p><strong>Agua</strong></p>",
      tags: ["nouns", "food-drink"],
    },
    {
      card_type: "CLOZE" as const,
      front: "<p>Cloze deletion example</p>",
      back: "<p>The capital of Spain</p>",
      cloze_text: "<p>The capital of {{c1::Spain}} is {{c2::Madrid}}.</p>",
      tags: ["geography", "capitals"],
    },
    {
      card_type: "BASIC" as const,
      front: "<p>Good morning</p>",
      back: "<p><strong>Buenos días</strong></p>",
      tags: ["greetings", "time"],
    },
  ];

  for (const cardData of spanishCards) {
    const card = await prisma.card.create({
      data: {
        ...cardData,
        deck_id: spanishDeck.id,
      },
    });

    // Create initial card state for the user
    await prisma.cardState.create({
      data: {
        card_id: card.id,
        user_id: testUser.id,
        state: "NEW",
        due_date: new Date(),
        interval: 0,
        repetitions: 0,
        easiness_factor: 2.5,
        lapses: 0,
      },
    });
  }

  // Create sample cards for Math deck
  const mathCards = [
    {
      card_type: "BASIC" as const,
      front: "<p>What is the quadratic formula?</p>",
      back: "<p><strong>x = (-b ± √(b² - 4ac)) / 2a</strong></p>",
      tags: ["algebra", "formulas"],
    },
    {
      card_type: "BASIC" as const,
      front: "<p>Area of a circle</p>",
      back: "<p><strong>A = πr²</strong></p>",
      tags: ["geometry", "area"],
    },
    {
      card_type: "CLOZE" as const,
      front: "<p>Pythagorean theorem</p>",
      back: "<p>For right triangles</p>",
      cloze_text:
        "<p>In a right triangle: {{c1::a²}} + {{c2::b²}} = {{c3::c²}}</p>",
      tags: ["geometry", "triangles"],
    },
  ];

  for (const cardData of mathCards) {
    const card = await prisma.card.create({
      data: {
        ...cardData,
        deck_id: mathDeck.id,
      },
    });

    await prisma.cardState.create({
      data: {
        card_id: card.id,
        user_id: testUser.id,
        state: "NEW",
        due_date: new Date(),
        interval: 0,
        repetitions: 0,
        easiness_factor: 2.5,
        lapses: 0,
      },
    });
  }

  // Create sample cards for History deck
  const historyCards = [
    {
      card_type: "BASIC" as const,
      front: "<p>When did World War II end?</p>",
      back: "<p><strong>1945</strong></p>",
      tags: ["wwii", "20th-century"],
    },
    {
      card_type: "BASIC" as const,
      front: "<p>Who was the first person to walk on the moon?</p>",
      back: "<p><strong>Neil Armstrong</strong></p>",
      tags: ["space", "1960s"],
    },
    {
      card_type: "CLOZE" as const,
      front: "<p>American Independence</p>",
      back: "<p>Declaration of Independence</p>",
      cloze_text:
        "<p>The United States declared independence in {{c1::1776}} from {{c2::Great Britain}}.</p>",
      tags: ["america", "independence"],
    },
  ];

  for (const cardData of historyCards) {
    const card = await prisma.card.create({
      data: {
        ...cardData,
        deck_id: historyDeck.id,
      },
    });

    await prisma.cardState.create({
      data: {
        card_id: card.id,
        user_id: testUser.id,
        state: "NEW",
        due_date: new Date(),
        interval: 0,
        repetitions: 0,
        easiness_factor: 2.5,
        lapses: 0,
      },
    });
  }

  console.log("✅ Created sample cards with initial states");

  // Create some sample review history to show statistics
  const sampleReviews = [
    { rating: "GOOD" as const, days_ago: 1 },
    { rating: "GOOD" as const, days_ago: 1 },
    { rating: "EASY" as const, days_ago: 2 },
    { rating: "HARD" as const, days_ago: 2 },
    { rating: "AGAIN" as const, days_ago: 3 },
    { rating: "GOOD" as const, days_ago: 3 },
    { rating: "GOOD" as const, days_ago: 4 },
    { rating: "EASY" as const, days_ago: 4 },
  ];

  // Get some cards to create reviews for
  const allCards = await prisma.card.findMany({
    take: 8, // Take first 8 cards
  });

  for (let i = 0; i < sampleReviews.length && i < allCards.length; i++) {
    const reviewData = sampleReviews[i];
    const card = allCards[i];

    if (reviewData && card) {
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() - reviewData.days_ago);

      await prisma.review.create({
        data: {
          card_id: card.id,
          user_id: testUser.id,
          rating: reviewData.rating,
          response_time: Math.floor(Math.random() * 5000) + 1000, // Random response time 1-6 seconds
          reviewed_at: reviewDate,
          previous_interval: 0,
          new_interval:
            reviewData.rating === "AGAIN"
              ? 0
              : reviewData.rating === "HARD"
                ? 1
                : 4,
          easiness_factor: 2.5,
        },
      });
    }
  }

  console.log("✅ Created sample review history");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📧 Test account created:");
  console.log("   Email: test@example.com");
  console.log("   Password: password123");
  console.log("\n🔗 You can now login at: http://localhost:3000/login");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
