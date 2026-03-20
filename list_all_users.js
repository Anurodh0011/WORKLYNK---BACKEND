import prisma from "./src/prisma/client.js";

async function listUsers() {
  const users = await prisma.user.findMany({ select: { email: true, name: true } });
  console.log("Registered Users:", users);
  
  const pending = await prisma.pendingUser.findMany({ select: { email: true, name: true } });
  console.log("Pending Users:", pending);

  process.exit(0);
}

listUsers().catch(console.error);
