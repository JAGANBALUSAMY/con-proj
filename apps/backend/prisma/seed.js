// apps/backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Initial Admin User
    const adminCode = 'ADMIN001';
    const adminPassword = 'AdminPassword123!'; // IMPORTANT: CHANGE THIS AFTER LOGIN
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
        where: { employeeCode: adminCode },
        update: {},
        create: {
            employeeCode: adminCode,
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
        },
    });

    console.log(`✅ Admin user created/verified: ${admin.employeeCode}`);
    console.log('🚀 Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
