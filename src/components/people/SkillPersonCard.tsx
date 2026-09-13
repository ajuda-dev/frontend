import { Link } from "react-router";
import { Card } from "../ui/Card";
import type { UserWithSkills } from "../../types/api";

interface SkillPersonCardProps {
  person: UserWithSkills;
}

export function SkillPersonCard({ person }: SkillPersonCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <Link
        to={`/pessoas/${person.id}`}
        className="text-ink hover:text-brand text-base font-semibold transition-colors"
      >
        {person.name}
      </Link>

      {person.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {person.skills.map((skill) => (
            <li
              key={skill.id}
              className="bg-surface-2 border-line text-ink-muted rounded-full border px-2 py-0.5 text-xs"
            >
              {skill.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted text-xs">Ainda não cadastrou habilidades.</p>
      )}

      <Link to={`/pessoas/${person.id}`} className="text-brand text-sm hover:underline">
        Ver perfil
      </Link>
    </Card>
  );
}
