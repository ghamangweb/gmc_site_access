import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { db } from "@/lib/db/client";
import { staffUsers } from "@/lib/db/schema";
import type { SystemRole, WorkflowRole } from "@/lib/domain/types";

declare module "@auth/core/types" {
  interface Session {
    user: {
      staffUserId: string;
      systemRole: SystemRole;
      workflowRoles: WorkflowRole[];
      pinConfirmed: boolean;
      hasPinSet: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    staffUserId?: string;
    systemRole?: SystemRole;
    workflowRoles?: WorkflowRole[];
    pinConfirmed?: boolean;
    hasPinSet?: boolean;
  }
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  providers: [MicrosoftEntraID],
  session: {
    strategy: "jwt",
    // 1-hour idle timeout: session extends on activity (updateAge) but
    // hard-expires 1 hour (maxAge) after the last refresh if the user goes quiet.
    maxAge: 60 * 60,
    updateAge: 5 * 60,
  },
  pages: {
    signOut: "/sign-out",
  },
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, account, profile, trigger, session }) {
      if (account && profile) {
        const entraObjectId =
          (profile.oid as string | undefined) ??
          profile.sub ??
          account.providerAccountId;

        let [staffUser] = await db
          .select()
          .from(staffUsers)
          .where(eq(staffUsers.entraObjectId, entraObjectId));

        const entraEmail = profile.email ?? "";
        const entraDisplayName = profile.name ?? profile.email ?? "";

        if (!staffUser) {
          [staffUser] = await db
            .insert(staffUsers)
            .values({
              entraObjectId,
              email: entraEmail,
              displayName: entraDisplayName,
              systemRole: "User",
              workflowRoles: [],
            })
            .returning();
        } else if (
          (entraDisplayName && entraDisplayName !== staffUser.displayName) ||
          (entraEmail && entraEmail !== staffUser.email)
        ) {
          // Entra owns the name and email, so a rename there has to reach
          // everything that reads them back — the Department Head's name on a
          // pre-registration form, notification copy, the user list. Empty
          // claims are ignored rather than written over good stored values,
          // and a failed refresh never blocks a sign-in: the stale row still
          // authenticates.
          try {
            const [refreshed] = await db
              .update(staffUsers)
              .set({
                displayName: entraDisplayName || staffUser.displayName,
                email: entraEmail || staffUser.email,
              })
              .where(eq(staffUsers.id, staffUser.id))
              .returning();

            staffUser = refreshed ?? staffUser;
          } catch (error) {
            console.error("[auth/entra]", error);
          }
        }

        token.staffUserId = staffUser.id;
        token.systemRole = staffUser.systemRole as SystemRole;
        token.workflowRoles = staffUser.workflowRoles as WorkflowRole[];
        token.hasPinSet = !!staffUser.pinHash;
        token.pinConfirmed = false;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.pinConfirmed !== undefined) {
          token.pinConfirmed = session.user.pinConfirmed;
        }
        if (session.user.hasPinSet !== undefined) {
          token.hasPinSet = session.user.hasPinSet;
        }
        if (session.user.systemRole !== undefined) {
          token.systemRole = session.user.systemRole;
        }
        if (session.user.workflowRoles !== undefined) {
          token.workflowRoles = session.user.workflowRoles;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.staffUserId = token.staffUserId ?? "";
      session.user.systemRole = token.systemRole ?? "User";
      session.user.workflowRoles = token.workflowRoles ?? [];
      session.user.pinConfirmed = token.pinConfirmed ?? false;
      session.user.hasPinSet = token.hasPinSet ?? false;
      return session;
    },
  },
});
