import { Button } from "./Button";
import { Spinner } from "./Spinner";

interface LoadMoreButtonProps {
  hasNext: boolean;
  loading: boolean;
  onLoadMore: () => void;
  emptyLabel?: string;
}

export function LoadMoreButton({
  hasNext,
  loading,
  onLoadMore,
  emptyLabel = "Você viu tudo por aqui",
}: LoadMoreButtonProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (!hasNext) {
    return <p className="text-ink-muted py-4 text-center text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={onLoadMore}>
        Carregar mais
      </Button>
    </div>
  );
}
