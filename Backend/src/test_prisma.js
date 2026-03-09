const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Attempting to connect to Prisma...');
        await prisma.$connect();
        console.log('Successfully connected to Prisma!');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
    } catch (error) {
        console.error('Prisma Error Details:', error);
        if (error.stack) console.error('Stack Trace:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

test();
