import { UserRole } from "../.prisma-client/enums";
import { prisma } from "../prisma.server";
import { deleteUserAccountData } from "./account-deletion.server";
import type { LinkedAccountBook } from "./account-deletion-plan";
import { loadLogtoIdentity } from "./admin-user-identities.server";

export type DeleteAdminUserInput = {
  userId: string;
  confirmation: string;
};

function isDeleteConfirmationMatch(args: {
  confirmation: string;
  externalId: string;
  email: string | null;
}): boolean {
  const confirmation = args.confirmation.trim();
  const requiredConfirmation = args.email ?? args.externalId;
  return confirmation === requiredConfirmation;
}

async function ensureDeletingAdminDoesNotRemoveFinalAdmin(args: {
  targetUserId: string;
  targetRoles: UserRole[];
}): Promise<void> {
  if (!args.targetRoles.includes(UserRole.ADMIN)) {
    return;
  }

  const remainingAdminCount = await prisma.user.count({
    where: {
      id: { not: args.targetUserId },
      roles: { has: UserRole.ADMIN },
    },
  });

  if (remainingAdminCount === 0) {
    throw new Error("At least one Admin user is required.");
  }
}

export async function deleteAdminUserById(args: {
  currentAdminId: string;
  data: DeleteAdminUserInput;
}): Promise<void> {
  const targetUser = await prisma.user.findUnique({
    where: { id: args.data.userId },
    select: {
      id: true,
      externalId: true,
      roles: true,
      createdAt: true,
      updatedAt: true,
      accountBookLinks: {
        select: {
          accountBook: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  userLinks: true,
                },
              },
            },
          },
        },
        orderBy: {
          accountBook: {
            name: "asc",
          },
        },
      },
      _count: {
        select: {
          accountBookLinks: true,
        },
      },
    },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.id === args.currentAdminId) {
    throw new Error("You cannot delete yourself.");
  }

  await ensureDeletingAdminDoesNotRemoveFinalAdmin({
    targetUserId: targetUser.id,
    targetRoles: targetUser.roles,
  });

  const identity = await loadLogtoIdentity(targetUser);
  if (identity.status === "unavailable") {
    throw new Error(
      "Cannot delete user because the Logto identity is unavailable.",
    );
  }

  if (
    !isDeleteConfirmationMatch({
      confirmation: args.data.confirmation,
      externalId: targetUser.externalId,
      email: identity.email,
    })
  ) {
    throw new Error("Confirmation does not match the user.");
  }

  await deleteUserAccountData({
    externalId: targetUser.externalId,
    accountBookLinks: targetUser.accountBookLinks as LinkedAccountBook[],
    deleteLogtoFirst: true,
  });
}
