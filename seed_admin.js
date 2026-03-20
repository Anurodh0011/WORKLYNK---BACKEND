import prisma from "./src/prisma/client.js";
import { hashPassword } from "./src/helpers/password.helper.js";

async function seedAdmin() {
  const email = "anurodhprasain0011@gmail.com";
  const password = "Admin@123";
  const hashedPassword = await hashPassword(password);

  console.log("Seeding Admin User...");
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Anurodh Admin",
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Admin User Seeded Successfully:", {
     id: user.id,
     email: user.email,
     role: user.role
  });

  process.exit(0);
}

seedAdmin().catch(console.error);
