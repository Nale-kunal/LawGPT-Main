/**
 * Unified account status check for Juriq.
 * Validates whether a user account is active, deleted, suspended, or blocked.
 * Used across HTTP request authentication and Socket.IO handshakes.
 *
 * @param {object} user - User document or cached user profile
 * @returns {object} status - { active: boolean, code?: string, message?: string, status?: number }
 */
export function checkAccountStatus(user) {
  if (!user) {
    return {
      active: false,
      code: 'USER_NOT_FOUND',
      message: 'User profile not found.',
      status: 401
    };
  }

  // 1. Check if deleted
  const isDeleted = user.status === 'deleted' || user.deleted === true;
  if (isDeleted) {
    return {
      active: false,
      code: 'ACCOUNT_DELETED',
      message: 'Account has been deleted.',
      status: 403
    };
  }

  // 2. Check if suspended or blocked
  const isSuspended =
    user.status === 'suspended' ||
    user.accountStatus?.isSuspended === true ||
    user.securityFlags?.blocked === true ||
    (user.securityFlags?.temporarySuspensionUntil &&
      new Date(user.securityFlags.temporarySuspensionUntil) > new Date());

  if (isSuspended) {
    return {
      active: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Account has been suspended. Contact support.',
      status: 403
    };
  }

  return { active: true };
}

export default { checkAccountStatus };
