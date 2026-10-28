import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

const BLOCKED_SUBSCRIPTIONS = new Set(["SUSPENSA", "CANCELADA", "VENCIDA"]);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            active: true,
            tenantId: true,
            branchId: true,
            isPlatformAdmin: true,
            roleId: true,
            tenant: {
              select: {
                status: true,
                subscription: { select: { status: true } },
              },
            },
          },
        });

        if (!user || !user.active) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        // Empresa suspensa/cancelada ou assinatura bloqueada não autentica.
        if (!user.isPlatformAdmin && user.tenant) {
          if (user.tenant.status !== "ATIVO") return null;
          const status = user.tenant.subscription?.status;
          if (status && BLOCKED_SUBSCRIPTIONS.has(status)) return null;
        }
        if (!user.isPlatformAdmin && !user.tenantId) return null;

        void prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          branchId: user.branchId,
          roleId: user.roleId,
          isPlatformAdmin: user.isPlatformAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId ?? null;
        token.branchId = user.branchId ?? null;
        token.roleId = user.roleId ?? null;
        token.isPlatformAdmin = user.isPlatformAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.tenantId = (token.tenantId as string | null) ?? null;
        session.user.branchId = (token.branchId as string | null) ?? null;
        session.user.roleId = (token.roleId as string | null) ?? null;
        session.user.isPlatformAdmin = token.isPlatformAdmin === true;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        void auditLog({
          userId: user.id,
          tenantId: (user as { tenantId?: string | null }).tenantId ?? null,
          action: "LOGIN",
          module: "auth",
          entity: "User",
          entityId: user.id,
          description: `Login de ${user.email ?? user.id}`,
        }).catch(() => {});
      }
    },
    async signOut(params) {
      const userId = "token" in params ? params.token?.sub : undefined;
      if (userId) {
        void auditLog({
          userId,
          action: "LOGOUT",
          module: "auth",
          entity: "User",
          entityId: userId,
          description: "Logout realizado",
        }).catch(() => {});
      }
    },
  },
});
