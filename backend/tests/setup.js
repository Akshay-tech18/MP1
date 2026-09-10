const prisma = require("../src/config/db");

// Disconnect Prisma after all tests are done
afterAll(async () => {
  await prisma.$disconnect();
});
