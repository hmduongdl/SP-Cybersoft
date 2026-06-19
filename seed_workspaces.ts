import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    include: { workspaces: true }
  })
  
  for (const user of users) {
    const hasPersonal = user.workspaces.some(w => w.type === 'PERSONAL')
    const hasWebsite = user.workspaces.some(w => w.type === 'WEBSITE')
    const hasTech = user.workspaces.some(w => w.type === 'TECH')
    
    if (!hasPersonal) {
      await prisma.workspace.create({
        data: { name: "Personal", type: "PERSONAL", is_default: true, is_public: false, icon: "🔒", owner_id: user.id }
      })
    }
    if (!hasWebsite) {
      await prisma.workspace.create({
        data: { name: "Website", type: "WEBSITE", is_default: true, is_public: true, icon: "🌐", owner_id: user.id }
      })
    }
    if (!hasTech) {
      await prisma.workspace.create({
        data: { name: "Tech", type: "TECH", is_default: true, is_public: true, icon: "💻", owner_id: user.id }
      })
    }
  }
  console.log("Seeded default workspaces for existing users.")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
