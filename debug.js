import prisma from "./src/prisma/client.js";

async function main() {
  const users = await prisma.user.findMany();
  const pending = await prisma.pendingUser.findMany();
  console.log("USERS:", users);
  console.log("PENDING:", pending);
}

main().catch(console.error).finally(() => process.exit());
