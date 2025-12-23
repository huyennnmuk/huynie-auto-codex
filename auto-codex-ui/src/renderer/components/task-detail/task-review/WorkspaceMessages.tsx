import { AlertCircle, GitMerge, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../ui/button';
import { persistTaskStatus } from '../../../stores/task-store';
import type { Task } from '../../../../shared/types';

interface LoadingMessageProps {
  message?: string;
}

/**
 * Displays a loading indicator while workspace info is being fetched
 */
export function LoadingMessage({ message = '正在加载工作区信息...' }: LoadingMessageProps) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

interface NoWorkspaceMessageProps {
  task?: Task;
  onClose?: () => void;
}

/**
 * Displays message when no workspace is found for the task
 */
export function NoWorkspaceMessage({ task, onClose }: NoWorkspaceMessageProps) {
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const handleMarkDone = async () => {
    if (!task) return;

    setIsMarkingDone(true);
    try {
      await persistTaskStatus(task.id, 'done');
      // Auto-close modal after marking as done
      onClose?.();
    } catch (err) {
      console.error('Error marking task as done:', err);
    } finally {
      setIsMarkingDone(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <h3 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        未找到工作区
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        未找到该任务的隔离工作区。更改可能已直接应用在你的项目中。
      </p>

      {/* Allow marking as done */}
      {task && task.status === 'human_review' && (
        <Button
          onClick={handleMarkDone}
          disabled={isMarkingDone}
          size="sm"
          variant="default"
          className="w-full"
        >
          {isMarkingDone ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              正在更新...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              标记为完成
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface StagedInProjectMessageProps {
  task: Task;
  projectPath?: string;
  hasWorktree?: boolean;
  onClose?: () => void;
}

/**
 * Displays message when changes have already been staged in the main project
 */
export function StagedInProjectMessage({ task, hasWorktree = false, onClose }: StagedInProjectMessageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteWorktreeAndMarkDone = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Call the discard/delete worktree command
      const result = await window.electronAPI.discardWorktree(task.id);

      if (!result.success) {
        setError(result.error || '删除工作区失败');
        return;
      }

      // Mark task as done
      await persistTaskStatus(task.id, 'done');

      // Auto-close modal after marking as done
      onClose?.();
    } catch (err) {
      console.error('Error deleting worktree:', err);
      setError(err instanceof Error ? err.message : '删除工作区失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4">
      <h3 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
        <GitMerge className="h-4 w-4 text-success" />
        更改已暂存到项目
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        该任务的更改已暂存到你的主项目{task.stagedAt ? `（${new Date(task.stagedAt).toLocaleDateString()}）` : ''}。
      </p>
      <div className="bg-background/50 rounded-lg p-3 mb-3">
        <p className="text-xs text-muted-foreground mb-2">下一步：</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>用 <code className="bg-background px-1 rounded">git status</code> 和 <code className="bg-background px-1 rounded">git diff --staged</code> 检查暂存更改</li>
          <li>确认无误后提交：<code className="bg-background px-1 rounded">git commit -m "your message"</code></li>
          <li>满意后推送到远端</li>
        </ol>
      </div>

      {/* Action buttons */}
      {hasWorktree && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              onClick={handleDeleteWorktreeAndMarkDone}
              disabled={isDeleting}
              size="sm"
              variant="default"
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在清理...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  删除工作区并标记完成
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            将删除隔离工作区，并把任务标记为完成。
          </p>
        </div>
      )}
    </div>
  );
}
