import { questions } from "@/lib/flight-school-1/content";
export function NoiseKnowledgeCheck({
  answers,
  submitted,
  successful,
  complete,
  onAnswers,
  onSubmit,
  onContinue,
  onExperiment,
}: {
  answers: string[];
  submitted: boolean;
  successful: boolean;
  complete: boolean;
  onAnswers: (a: string[]) => void;
  onSubmit: () => void;
  onContinue: () => void;
  onExperiment: () => void;
}) {
  return (
    <section className="nw-quiz">
      <p className="nw-kicker">CHECK YOUR UNDERSTANDING</p>
      <h2>Three questions. Unlimited retries.</h2>
      <p>
        Run at least one experiment and answer all three correctly. Your canvas
        stays exactly where you left it.
      </p>
      {questions.map((q, i) => (
        <fieldset key={q.prompt} disabled={complete}>
          <legend>
            {i + 1}. {q.prompt}
          </legend>
          {q.choices.map((choice, j) => {
            const letter = String.fromCharCode(65 + j);
            return (
              <label key={letter}>
                <input
                  type="radio"
                  name={`noise-question-${i}`}
                  value={letter}
                  checked={answers[i] === letter}
                  onChange={() =>
                    onAnswers(answers.map((v, k) => (k === i ? letter : v)))
                  }
                />
                <span>
                  {letter}. {choice}
                </span>
              </label>
            );
          })}
          {submitted && (
            <p
              className={
                answers[i] === q.correct
                  ? "nw-feedback-correct"
                  : "nw-feedback-wrong"
              }
            >
              {answers[i] === q.correct
                ? "✓ Correct."
                : `Try again — the answer is ${q.correct}.`}{" "}
              {q.feedback}
            </p>
          )}
        </fieldset>
      ))}
      {!successful && (
        <p className="nw-notice">
          Run one sandbox experiment before completing the lesson.
        </p>
      )}
      <button
        className="nw-accent"
        onClick={onSubmit}
        disabled={answers.some((a) => !a)}
      >
        Check answers
      </button>
      {complete && (
        <div role="status" className="nw-complete">
          <h2>Flight School 1 complete</h2>
          <p>
            You can explain the three error models. This completes module 1; the
            remaining flight school modules still follow.
          </p>
          <button className="nw-accent" onClick={onContinue}>
            Continue to Flight School 2 →
          </button>
        </div>
      )}
      <button onClick={onExperiment}>Experiment more</button>
    </section>
  );
}
