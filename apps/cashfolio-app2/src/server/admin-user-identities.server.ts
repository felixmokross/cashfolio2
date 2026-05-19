import {
  getLogtoUser,
  getLogtoUsers,
  type LogtoManagementUser,
} from "../auth/logto-management.server";
import type { UserRole } from "../.prisma-client/enums";

export type LogtoIdentityStatus = "available" | "missing" | "unavailable";

export type AdminUserRecord = {
  id: string;
  externalId: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
  _count: {
    accountBookLinks: number;
  };
};

export type LogtoIdentityResult =
  | {
      status: "available";
      displayName: string;
      email: string | null;
      username: string | null;
      avatarUrl: string | null;
    }
  | {
      status: "missing" | "unavailable";
      displayName: string;
      email: null;
      username: null;
      avatarUrl: null;
    };

function getUnavailableIdentity(user: AdminUserRecord): LogtoIdentityResult {
  return {
    status: "unavailable",
    displayName: user.externalId,
    email: null,
    username: null,
    avatarUrl: null,
  };
}

function getLogtoIdentityResult(
  user: AdminUserRecord,
  logtoUser: LogtoManagementUser | null | undefined,
): LogtoIdentityResult {
  if (!logtoUser) {
    return {
      status: "missing",
      displayName: user.externalId,
      email: null,
      username: null,
      avatarUrl: null,
    };
  }

  return {
    status: "available",
    displayName:
      logtoUser.name ??
      logtoUser.primaryEmail ??
      logtoUser.username ??
      user.externalId,
    email: logtoUser.primaryEmail,
    username: logtoUser.username,
    avatarUrl: logtoUser.avatar,
  };
}

function logLogtoIdentityFailure(
  message: string,
  error: unknown,
  context: Record<string, unknown>,
) {
  console.warn(message, { ...context, error });
}

export async function loadLogtoIdentity(user: AdminUserRecord) {
  try {
    return getLogtoIdentityResult(user, await getLogtoUser(user.externalId));
  } catch (error) {
    logLogtoIdentityFailure("Failed to load Logto user identity.", error, {
      externalId: user.externalId,
    });
    return getUnavailableIdentity(user);
  }
}

export async function loadLogtoIdentities(
  users: AdminUserRecord[],
): Promise<Map<string, LogtoIdentityResult>> {
  if (users.length === 0) {
    return new Map();
  }

  try {
    const logtoUsersById = await getLogtoUsers(
      users.map((user) => user.externalId),
    );

    return new Map(
      users.map((user) => [
        user.externalId,
        getLogtoIdentityResult(user, logtoUsersById.get(user.externalId)),
      ]),
    );
  } catch (error) {
    logLogtoIdentityFailure(
      "Failed to load Logto user identities for Admin Users.",
      error,
      { userCount: users.length },
    );

    return new Map(
      users.map((user) => [user.externalId, getUnavailableIdentity(user)]),
    );
  }
}
