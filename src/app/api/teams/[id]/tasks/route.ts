import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import { logActivity } from '@/lib/activity';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/teams/:id/tasks - Get tasks for a team
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId } = await params;

    // Verify user is a member of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = { teamId };
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/tasks - Create a task for a team
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

    // Verify user is a member of the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: session.userId },
        },
      },
    });

    if (!team || team.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // If assignee specified, verify they're a team member
    if (assigneeId) {
      const assigneeMembership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: assigneeId,
          },
        },
      });

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: 'Assignee must be a member of the team' },
          { status: 400 }
        );
      }
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) {
        parsedDueDate = d;
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: parsedDueDate,
        teamId,
        assigneeId: assigneeId || null,
        creatorId: session.userId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // In-app Notification for assigned user (Requirement 2.3)
    if (assigneeId && assigneeId !== session.userId) {
      await createNotification(
        assigneeId,
        'Task Assigned',
        `You were assigned to task "${task.title}" in team "${team.name}" by ${session.name}`,
        'TASK_ASSIGNED',
        `/teams/${teamId}`
      );
    }

    // Activity log (Bonus 4.3)
    await logActivity(
      teamId,
      session.userId,
      'CREATE_TASK',
      `Created task "${task.title}"`
    );

    // Live broadcast to all team members (Requirement 2.2)
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.channel(`realtime-team-${teamId}`).send({
          type: 'broadcast',
          event: 'task-created',
          payload: task,
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
