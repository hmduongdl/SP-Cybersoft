import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, trust_score: true, wallet_balance: true, name: true } })
  console.log(users)
}
main()
