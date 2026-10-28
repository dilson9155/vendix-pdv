import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      branchId: string | null;
      roleId: string | null;
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    tenantId?: string | null;
    branchId?: string | null;
    roleId?: string | null;
    isPlatformAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string | null;
    branchId?: string | null;
    roleId?: string | null;
    isPlatformAdmin?: boolean;
  }
}
