import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function sanitizeTokenImage(token: Record<string, unknown>) {
  const imageValue = token.picture ?? token.image;
  if (typeof imageValue !== "string") return;
  const normalized = imageValue.trim();
  const tooLarge = normalized.length > 2048;
  const isInline = normalized.startsWith("data:") || normalized.startsWith("blob:");
  if (tooLarge || isInline) {
    delete token.picture;
    delete token.image;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  useSecureCookies: process.env.NODE_ENV === "production",
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code, metadata) {
      console.error("[NextAuth]", code, metadata)
    },
    warn(code) {
      console.warn("[NextAuth]", code)
    },
    debug(code, metadata) {
      console.debug("[NextAuth]", code, metadata)
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: {
        timeout: 15000,
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      sanitizeTokenImage(token as Record<string, unknown>);
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as typeof session.user & { id: string }).id = token.id as string;
      }
      if (typeof session.user?.image === "string") {
        const image = session.user.image.trim();
        if (image.length > 2048 || image.startsWith("data:") || image.startsWith("blob:")) {
          session.user.image = null;
        }
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);

