import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Mock Login (สำหรับทดสอบ)",
      credentials: {
        email: { label: "Email (@go.buu.ac.th)", type: "email", placeholder: "test@go.buu.ac.th" },
        role: { label: "Role (พิมพ์ ADMIN หรือ USER)", type: "text", placeholder: "USER" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        if (!credentials.email.endsWith("@go.buu.ac.th")) {
          throw new Error("สงวนสิทธิ์การใช้งานสำหรับบุคลากรและนิสิตมหาวิทยาลัยบูรพา ต้องใช้อีเมล @go.buu.ac.th เท่านั้น");
        }
        
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split("@")[0],
              role: credentials.role === "ADMIN" ? "ADMIN" : "USER"
            }
          });
        } else if (credentials.role === "ADMIN" || credentials.role === "USER") {
          // Update role if changed during testing
          if (user.role !== credentials.role) {
            user = await prisma.user.update({
              where: { email: credentials.email },
              data: { role: credentials.role }
            });
          }
        }
        return user;
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
}
