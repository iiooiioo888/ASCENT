import {
  BRAND_DISPLAY_NAME,
  CONNECTION_LOAD_FAILED_TITLE,
  CONNECTION_LOAD_SEED_HINT,
  CONNECTION_RETRY_BUTTON_LABEL,
  isUnseededWorldClockError,
} from "../productCopy";

type Props = {
  error: string;
  retrying: boolean;
  onRetry: () => void;
};

export function LoadingScreen({ error, retrying, onRetry }: Props) {
  const showRetry = Boolean(error);

  return (
    <div className="loading">
      <div>
        <h1>{BRAND_DISPLAY_NAME}</h1>
        {error ? (
          <>
            <p className="loading-error-title">{CONNECTION_LOAD_FAILED_TITLE}</p>
            <p className="loading-error-detail">{error}</p>
            {isUnseededWorldClockError(error) ? (
              <p className="loading-error-hint">{CONNECTION_LOAD_SEED_HINT}</p>
            ) : null}
            <button type="button" className="loading-retry" disabled={retrying} onClick={onRetry}>
              {retrying ? "連線中…" : CONNECTION_RETRY_BUTTON_LABEL}
            </button>
          </>
        ) : (
          <p>農莊正在甦醒…</p>
        )}
      </div>
    </div>
  );
}
