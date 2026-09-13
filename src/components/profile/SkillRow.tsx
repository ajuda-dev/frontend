import { useId } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import type { SkillLevel, SkillUser } from "../../types/api";
import { SKILL_LEVELS } from "../../types/api";
import { SKILL_LEVEL_COLOR, SKILL_LEVEL_LABEL } from "../../utils/labels";

interface SkillRowProps {
  entry: SkillUser;
  busy: boolean;
  onChangeLevel: (entry: SkillUser, level: SkillLevel) => void;
  onRemove: (entry: SkillUser) => void;
}

export function SkillRow({ entry, busy, onChangeLevel, onRemove }: SkillRowProps) {
  const levelId = useId();

  return (
    <li className="bg-surface border-line flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-ink text-sm">{entry.skill?.name ?? "Habilidade"}</span>
        <Badge tone={SKILL_LEVEL_COLOR[entry.level]}>{SKILL_LEVEL_LABEL[entry.level]}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={levelId} className="text-ink-muted text-xs">
          Mudar nível
        </label>
        <span className="inline-block w-44">
          <Select
            id={levelId}
            value={entry.level}
            disabled={busy}
            onChange={(event) => onChangeLevel(entry, event.target.value as SkillLevel)}
          >
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {SKILL_LEVEL_LABEL[level]}
              </option>
            ))}
          </Select>
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          loading={busy}
          onClick={() => onRemove(entry)}
        >
          Remover
        </Button>
      </div>
    </li>
  );
}
