import prisma from "./src/prisma/client.js";

async function checkUser() {
  const email = "anurodhprasain0011@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  console.log("User in DB:", user ? "YES" : "NO");

  const pending = await prisma.pendingUser.findUnique({ where: { email } });
  console.log("Pending User in DB:", pending ? "YES" : "NO");

  const resets = await prisma.passwordReset.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  console.log("Latest Reset Request:", resets[0]);

  process.exit(0);
}

checkUser().catch(console.error);
