import { Icon } from './Icon';

export function Loading({ message = 'Učitavanje podataka…' }: { message?: string }) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-box error-state" role="alert">
      <Icon name="alert" />
      <h2>Podaci nisu učitani</h2>
      <p>{message}</p>
      <button className="button secondary" onClick={onRetry}>
        <Icon name="refresh" />
        Pokušaj ponovno
      </button>
    </div>
  );
}
