import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { canUpdateTask, canDeleteTask } from '@/lib/permissions';
import { createNotification } from '@/lib/notification';
import { logActivity } from '@/lib/activity';
import { getSupabaseClient } from '@/lib/supabase';

// PUT /api/tasks/[id] - Update a task (role-based permissions enforced)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Find the task and check membership & role
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: { where: { userId: session.userId } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentMember = existingTask.team.members[0];
    if (!currentMember && existingTask.team.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userRole =
      existingTask.team.ownerId === session.userId
        ? 'OWNER'
        : currentMember?.role || 'MEMBER';

    // Verify role permissions (Owner/Admin: any task; Member: own tasks)
    if (
      !canUpdateTask(
        userRole,
        existingTask.creatorId,
        existingTask.assigneeId,
        session.userId
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Members can only update their own tasks. Owners and Admins can update all tasks.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    if (title !== undefined && (!title || !title.trim())) {
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
            teamId: existingTask.teamId,
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

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && {
          dueDate:
            dueDate && !isNaN(new Date(dueDate).getTime())
              ? new Date(dueDate)
              : null,
        }),
        ...(assigneeId !== undefined && {
          assigneeId: assigneeId || null,
        }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify new assignee if changed (Requirement 2.3)
    if (
      assigneeId &&
      assigneeId !== existingTask.assigneeId &&
      assigneeId !== session.userId
    ) {
      await createNotification(
        assigneeId,
        'Task Assigned',
        `You were assigned to task "${task.title}" by ${session.name}`,
        'TASK_ASSIGNED',
        `/teams/${existingTask.teamId}`
      );
    }

    // Activity log
    const changeDescription =
      status && status !== existingTask.status
        ? `Changed status of "${task.title}" to ${status}`
        : `Updated task "${task.title}"`;

    await logActivity(
      existingTask.teamId,
      session.userId,
      'UPDATE_TASK',
      changeDescription
    );

    // Live broadcast to all team members (Requirement 2.2)
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.channel(`realtime-team-${existingTask.teamId}`).send({
          type: 'broadcast',
          event: 'task-updated',
          payload: task,
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json(task);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task (role-based permissions enforced)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: { where: { userId: session.userId } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentMember = task.team.members[0];
    if (!currentMember && task.team.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userRole =
      task.team.ownerId === session.userId
        ? 'OWNER'
        : currentMember?.role || 'MEMBER';

    // Verify permission: Owner and Admin can delete any task; Member only their created task
    if (!canDeleteTask(userRole, task.creatorId, session.userId)) {
      return NextResponse.json(
        {
          error:
            'Members can only delete tasks they created. Owners and Admins can delete any task.',
        },
        { status: 403 }
      );
    }

    await prisma.task.delete({ where: { id } });

    // Activity log
    await logActivity(
      task.teamId,
      session.userId,
      'DELETE_TASK',
      `Deleted task "${task.title}"`
    );

    // Live broadcast to all team members (Requirement 2.2)
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.channel(`realtime-team-${task.teamId}`).send({
          type: 'broadcast',
          event: 'task-deleted',
          payload: { taskId: id },
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
