export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface MembershipInfo {
  role: string;
  userId: string;
}

/**
 * Checks if a member can update team settings (name/description) or delete the team.
 * Only OWNER can manage the team itself.
 */
export function canManageTeam(role: string): boolean {
  return role === 'OWNER';
}

/**
 * Checks if a member can add new members.
 * OWNER and ADMIN can add members.
 */
export function canAddMember(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Checks if a member can remove another member.
 * - OWNER can remove anyone (except cannot leave directly as owner).
 * - ADMIN can remove regular MEMBERs.
 * - Any user can remove themselves (leave the team), unless they are the OWNER.
 */
export function canRemoveMember(
  callerRole: string,
  callerUserId: string,
  targetRole: string,
  targetUserId: string
): boolean {
  if (callerUserId === targetUserId) {
    // Cannot leave if you're the owner
    return callerRole !== 'OWNER';
  }
  if (callerRole === 'OWNER') {
    return true;
  }
  if (callerRole === 'ADMIN') {
    // Admin can only remove normal members
    return targetRole === 'MEMBER';
  }
  return false;
}

/**
 * Checks if a member can modify another member's role.
 * - OWNER can modify any non-owner member's role to ADMIN or MEMBER.
 * - ADMIN can promote/demote MEMBERs to ADMIN/MEMBER (cannot modify OWNER or other ADMINs).
 */
export function canUpdateMemberRole(
  callerRole: string,
  targetRole: string
): boolean {
  if (callerRole === 'OWNER') {
    return targetRole !== 'OWNER';
  }
  if (callerRole === 'ADMIN') {
    return targetRole === 'MEMBER';
  }
  return false;
}

/**
 * Checks if a user can create a task in the team.
 * All team members (OWNER, ADMIN, MEMBER) can create tasks.
 */
export function canCreateTask(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

/**
 * Checks if a user can update a given task.
 * - OWNER: can update any task.
 * - ADMIN: can update any task.
 * - MEMBER: can update their own tasks (creator or assignee).
 */
export function canUpdateTask(
  role: string,
  taskCreatorId: string,
  taskAssigneeId: string | null,
  currentUserId: string
): boolean {
  if (role === 'OWNER' || role === 'ADMIN') {
    return true;
  }
  return taskCreatorId === currentUserId || taskAssigneeId === currentUserId;
}

/**
 * Checks if a user can delete a given task.
 * - OWNER: can delete any task.
 * - ADMIN: can delete any task.
 * - MEMBER: can delete only tasks they created.
 */
export function canDeleteTask(
  role: string,
  taskCreatorId: string,
  currentUserId: string
): boolean {
  if (role === 'OWNER' || role === 'ADMIN') {
    return true;
  }
  return taskCreatorId === currentUserId;
}
