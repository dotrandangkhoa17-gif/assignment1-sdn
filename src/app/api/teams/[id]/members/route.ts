import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAddMember } from '@/lib/permissions';
import { createNotification } from '@/lib/notification';
import { logActivity } from '@/lib/activity';

// POST /api/teams/:id/members - Add member to team (Owner or Admin)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId } = await params;

    // Check team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: session.userId },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const currentMember = team.members[0];
    const userRole =
      team.ownerId === session.userId
        ? 'OWNER'
        : currentMember?.role || 'MEMBER';

    // Verify permission: Only OWNER or ADMIN can add members
    if (!canAddMember(userRole)) {
      return NextResponse.json(
        { error: 'Only team owners and admins can add members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const targetRole = role === 'ADMIN' && userRole === 'OWNER' ? 'ADMIN' : 'MEMBER';

    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'No user found with that email address' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: userToAdd.id,
        role: targetRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // In-App Notification (Functional Requirement 2.3)
    await createNotification(
      userToAdd.id,
      'Added to Team',
      `You were added to the team "${team.name}" by ${session.name}`,
      'TEAM_INVITE',
      `/teams/${teamId}`
    );

    // Audit Log (Bonus 4.3)
    await logActivity(
      teamId,
      session.userId,
      'ADD_MEMBER',
      `Added ${userToAdd.name} (${userToAdd.email}) as ${targetRole}`
    );

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}
