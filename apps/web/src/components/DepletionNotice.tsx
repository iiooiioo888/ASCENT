import { DEPLETION_EMPTY_BODY, DEPLETION_EMPTY_TITLE } from "../productCopy";

type Props = {
  visible: boolean;
};

export function DepletionNotice({ visible }: Props) {
  if (!visible) return null;

  return (
    <section className="banner depletion" role="status" aria-live="polite">
      <strong className="depletion-title">{DEPLETION_EMPTY_TITLE}</strong>
      <p className="depletion-body">{DEPLETION_EMPTY_BODY}</p>
    </section>
  );
}
