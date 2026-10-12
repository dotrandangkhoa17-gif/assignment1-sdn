import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// PUT /api/tasks/[id] - Update a task
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

    // Find the task and check membership
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: { select: { userId: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify user is a member of the task's team
    const isMember = existingTask.team.members.some(
      (m) => m.userId === session.userId
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
          dueDate: dueDate && !isNaN(new Date(dueDate).getTime()) ? new Date(dueDate) : null,
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

// DELETE /api/tasks/[id] - Delete a task (creator, assignee, or team owner only)
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
        team: { select: { ownerId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator, assignee, or team owner can delete
    const canDelete =
      task.creatorId === session.userId ||
      task.assigneeId === session.userId ||
      task.team.ownerId === session.userId;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only the task creator, assignee, or team owner can delete this task' },
        { status: 403 }
      );
    }

    await prisma.task.delete({ where: { id } });

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
