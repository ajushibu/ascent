import type { Task } from '../types';
import { useStore } from '../store';
import { fmtNum, goalsOf, taskDone, taskProgress } from '../logic';
import { I } from './icons';
import { colorVar, sectionColor } from './ui';

export function TaskRow({ task, onEdit }: { task: Task; onEdit?: (t: Task) => void }) {
  const { state, logProgress, undoProgress } = useStore();
  const goal = goalsOf(state).find(g => g.id === task.goalId);
  const prog = taskProgress(state, task);
  const done = taskDone(state, task);
  const step = goal?.step ?? 1;
  const unitStep = task.target <= 1 ? 1 : step;

  return (
    <div className="task" style={colorVar(sectionColor(task.section))}>
      <button
        type="button"
        className={`check ${done ? 'done' : prog > 0 ? 'part' : ''}`}
        aria-label={done ? 'Undo' : 'Mark progress'}
        onClick={() => (done && task.target <= 1 ? undoProgress(task) : logProgress(task, Math.min(unitStep, Math.max(unitStep, task.target - prog))))}
      >
        <I.Check size={20} />
      </button>
      <button type="button" style={{ flex: 1, textAlign: 'left', minWidth: 0 }} onClick={() => onEdit?.(task)} aria-label={`Edit ${task.title}`}>
        <div className={`t ${done ? 'done' : ''}`}>{task.title}</div>
        <div className="s">
          {fmtNum(prog)} / {fmtNum(task.target)} {task.unit}
          {task.scope === 'week' && task.goalId ? ' · auto from daily work' : ''}
        </div>
      </button>
      {task.target > 1 && !done && (
        <button type="button" className="mini-btn" aria-label={`Add ${fmtNum(unitStep)}`} onClick={() => logProgress(task, unitStep)}><I.Plus size={20} /></button>
      )}
      {prog > 0 && task.target > 1 && (
        <button type="button" className="mini-btn plain" aria-label="Undo last" onClick={() => undoProgress(task)}><I.Undo size={20} /></button>
      )}
    </div>
  );
}
